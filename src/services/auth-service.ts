import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { UserContext, UserRole } from '../types';
import { ConfigService } from './config-service';

/**
 * Authentication error codes
 */
export enum AuthErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  MISSING_TOKEN = 'MISSING_TOKEN',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ROLE_FETCH_FAILED = 'ROLE_FETCH_FAILED',
  USER_MAPPING_NOT_FOUND = 'USER_MAPPING_NOT_FOUND',
}

/**
 * Authentication error class
 */
export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Authentication Service for Cognito integration
 * Handles token validation and role-based access control
 * 
 * Requirements: 20.1, 20.2, 20.3
 */
export class AuthService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly configService: ConfigService;
  private readonly churchId: string;

  constructor(
    userPoolId?: string,
    configService?: ConfigService,
    churchId?: string
  ) {
    this.client = new CognitoIdentityProviderClient({});
    this.userPoolId = userPoolId || process.env.USER_POOL_ID || '';
    this.configService = configService || new ConfigService();
    this.churchId = churchId || process.env.CHURCH_ID || 'default';
  }

  /**
   * Validate access token and get user context
   * Verifies JWT with Cognito and enriches with user mapping data
   * 
   * Requirements: 20.1, 20.2, 20.3
   */
  async validateToken(accessToken: string): Promise<UserContext> {
    if (!accessToken) {
      throw new AuthError(
        AuthErrorCode.MISSING_TOKEN,
        'Access token is required'
      );
    }

    try {
      // Validate token with Cognito - this verifies the JWT signature and expiration
      const result = await this.client.send(
        new GetUserCommand({
          AccessToken: accessToken,
        })
      );

      const userId = result.Username || '';
      const email = result.UserAttributes?.find((attr) => attr.Name === 'email')?.Value || '';

      if (!userId) {
        throw new AuthError(
          AuthErrorCode.USER_NOT_FOUND,
          'User not found in token'
        );
      }

      // Get user's groups (roles) from Cognito
      const role = await this.getUserRole(userId);

      // Get user mapping from DynamoDB to get volunteerId and departmentIds
      const userMapping = await this.configService.getUserMapping(userId, this.churchId);

      return {
        userId,
        email,
        role,
        volunteerId: userMapping?.volunteerId,
        departmentIds: userMapping?.departmentIds || [],
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      // Handle specific Cognito errors
      const errorName = (error as { name?: string })?.name;
      
      if (errorName === 'NotAuthorizedException') {
        throw new AuthError(
          AuthErrorCode.INVALID_TOKEN,
          'Invalid or expired token'
        );
      }
      
      if (errorName === 'ExpiredTokenException') {
        throw new AuthError(
          AuthErrorCode.EXPIRED_TOKEN,
          'Token has expired'
        );
      }

      console.error('Token validation error:', error);
      throw new AuthError(
        AuthErrorCode.INVALID_TOKEN,
        'Failed to validate token',
        { originalError: String(error) }
      );
    }
  }

  /**
   * Get user role from Cognito groups
   * Priority order: pastor > admin > follow_up > department_lead
   * 
   * Requirements: 20.2, 20.3
   */
  async getUserRole(userId: string): Promise<UserRole> {
    if (!userId) {
      throw new AuthError(
        AuthErrorCode.USER_NOT_FOUND,
        'User ID is required'
      );
    }

    try {
      const result = await this.client.send(
        new AdminListGroupsForUserCommand({
          UserPoolId: this.userPoolId,
          Username: userId,
        })
      );

      const groups = result.Groups || [];
      const groupNames = groups.map((g) => g.GroupName || '');

      // Priority order: pastor > admin > follow_up > department_lead
      if (groupNames.includes('pastor')) {
        return 'pastor';
      }
      if (groupNames.includes('admin')) {
        return 'admin';
      }
      if (groupNames.includes('follow_up')) {
        return 'follow_up';
      }
      if (groupNames.includes('department_lead')) {
        return 'department_lead';
      }

      // Default to most restrictive role
      return 'department_lead';
    } catch (error) {
      console.error('Get user role error:', error);
      throw new AuthError(
        AuthErrorCode.ROLE_FETCH_FAILED,
        'Failed to get user role',
        { userId, originalError: String(error) }
      );
    }
  }

  /**
   * Check if user has permission for a resource/action
   */
  checkPermission(user: UserContext, resource: string, action: string): boolean {
    const permissions = PERMISSIONS[user.role];

    // Check for wildcard permission
    if (permissions.includes('*')) {
      return true;
    }

    // Check for specific permission
    const permissionKey = `${resource}:${action}`;
    const wildcardKey = `${resource}:*`;

    // Check exact match
    if (permissions.includes(permissionKey)) {
      return true;
    }

    // Check wildcard action
    if (permissions.includes(wildcardKey)) {
      return true;
    }

    // Check scoped permissions (e.g., members:read:assigned)
    const scopedPermissions = permissions.filter((p) => p.startsWith(`${resource}:${action}:`));
    if (scopedPermissions.length > 0) {
      // Has scoped permission - actual scope check happens at data layer
      return true;
    }

    return false;
  }

  /**
   * Get data scope for a user based on their role
   * 
   * Requirements: 20.4, 20.5, 20.6, 20.7
   */
  getDataScope(user: UserContext): DataScope {
    switch (user.role) {
      case 'pastor':
      case 'admin':
        return { type: 'all' };
      case 'follow_up':
        return {
          type: 'assigned',
          volunteerId: user.volunteerId,
        };
      case 'department_lead':
        return {
          type: 'department',
          departmentIds: user.departmentIds || [],
        };
      default:
        return { type: 'none' };
    }
  }

  /**
   * Filter members based on user's data scope
   * 
   * Requirements: 20.4, 20.5, 20.6
   * 
   * @param members - Array of members to filter
   * @param user - User context with role and scope information
   * @param memberDepartments - Optional map of memberId to departmentIds for department filtering
   * @returns Filtered array of members based on user's role
   */
  filterMembersByScope<T extends { id: string; followUpOwner?: string }>(
    members: T[],
    user: UserContext,
    memberDepartments?: Map<string, string[]>
  ): T[] {
    const scope = this.getDataScope(user);

    switch (scope.type) {
      case 'all':
        // Pastor and Admin see all members
        return members;

      case 'assigned':
        // Follow-up team only sees members assigned to them
        if (!scope.volunteerId) {
          return [];
        }
        return members.filter(member => member.followUpOwner === scope.volunteerId);

      case 'department':
        // Department lead only sees members in their departments
        if (!memberDepartments || scope.departmentIds.length === 0) {
          return [];
        }
        return members.filter(member => {
          const deptIds = memberDepartments.get(member.id) || [];
          return deptIds.some(deptId => scope.departmentIds.includes(deptId));
        });

      case 'none':
      default:
        return [];
    }
  }

  /**
   * Filter attendance records based on user's data scope
   * 
   * Requirements: 20.6
   * 
   * @param records - Array of attendance records to filter
   * @param user - User context with role and scope information
   * @param memberDepartments - Map of memberId to departmentIds for department filtering
   * @returns Filtered array of attendance records based on user's role
   */
  filterAttendanceByScope<T extends { memberId: string }>(
    records: T[],
    user: UserContext,
    memberDepartments: Map<string, string[]>
  ): T[] {
    const scope = this.getDataScope(user);

    switch (scope.type) {
      case 'all':
        // Pastor and Admin see all attendance
        return records;

      case 'assigned':
        // Follow-up team doesn't have attendance access by default
        // Return empty unless they have specific permission
        return [];

      case 'department':
        // Department lead only sees attendance for members in their departments
        if (scope.departmentIds.length === 0) {
          return [];
        }
        return records.filter(record => {
          const deptIds = memberDepartments.get(record.memberId) || [];
          return deptIds.some(deptId => scope.departmentIds.includes(deptId));
        });

      case 'none':
      default:
        return [];
    }
  }

  /**
   * Check if user can access a specific member
   * 
   * Requirements: 20.4, 20.5, 20.6
   * 
   * @param memberId - ID of the member to check access for
   * @param memberFollowUpOwner - Follow-up owner ID of the member
   * @param memberDepartmentIds - Department IDs the member belongs to
   * @param user - User context with role and scope information
   * @returns true if user can access the member, false otherwise
   */
  canAccessMember(
    _memberId: string,
    memberFollowUpOwner: string | undefined,
    memberDepartmentIds: string[],
    user: UserContext
  ): boolean {
    const scope = this.getDataScope(user);

    switch (scope.type) {
      case 'all':
        return true;

      case 'assigned':
        return scope.volunteerId !== undefined && memberFollowUpOwner === scope.volunteerId;

      case 'department':
        return memberDepartmentIds.some(deptId => scope.departmentIds.includes(deptId));

      case 'none':
      default:
        return false;
    }
  }

  /**
   * Build Airtable filter formula for role-based access
   * 
   * Requirements: 20.4, 20.5, 20.6, 20.7
   * 
   * @param user - User context with role and scope information
   * @param baseFormula - Optional base filter formula to combine with
   * @returns Airtable filter formula string
   */
  buildMemberFilterFormula(user: UserContext, baseFormula?: string): string {
    const scope = this.getDataScope(user);
    let scopeFormula: string;

    switch (scope.type) {
      case 'all':
        // No additional filtering needed
        scopeFormula = 'TRUE()';
        break;

      case 'assigned':
        // Filter by follow-up owner
        if (!scope.volunteerId) {
          scopeFormula = 'FALSE()';
        } else {
          scopeFormula = `FIND('${scope.volunteerId}', ARRAYJOIN({Follow-up Owner}))`;
        }
        break;

      case 'department':
        // Filter by department membership
        if (scope.departmentIds.length === 0) {
          scopeFormula = 'FALSE()';
        } else {
          // Build OR condition for all departments
          const deptConditions = scope.departmentIds.map(
            deptId => `FIND('${deptId}', ARRAYJOIN({Member Departments}))`
          );
          scopeFormula = deptConditions.length === 1
            ? deptConditions[0]!
            : `OR(${deptConditions.join(', ')})`;
        }
        break;

      case 'none':
      default:
        scopeFormula = 'FALSE()';
    }

    // Combine with base formula if provided
    if (baseFormula && baseFormula !== 'TRUE()') {
      return `AND(${baseFormula}, ${scopeFormula})`;
    }

    return scopeFormula;
  }

  /**
   * Log access attempt for audit purposes
   * 
   * Requirements: 20.7
   */
  logAccessAttempt(
    user: UserContext,
    resource: string,
    action: string,
    allowed: boolean,
    details?: Record<string, unknown>
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: user.userId,
      email: user.email,
      role: user.role,
      resource,
      action,
      allowed,
      volunteerId: user.volunteerId,
      departmentIds: user.departmentIds,
      ...details,
    };

    if (allowed) {
      console.log('Access granted:', JSON.stringify(logEntry));
    } else {
      console.warn('Access denied:', JSON.stringify(logEntry));
    }
  }
}

/**
 * Permission matrix for role-based access control
 */
export const PERMISSIONS: Record<UserRole, string[]> = {
  pastor: ['*'], // Full access
  admin: ['*'], // Full access
  follow_up: [
    'members:read:assigned',
    'follow_up:read:assigned',
    'follow_up:update:assigned',
    'journey:read:assigned',
  ],
  department_lead: [
    'members:read:department',
    'attendance:read:department',
    'roster:read:department',
  ],
};

/**
 * Data scope types for filtering queries
 */
export type DataScope =
  | { type: 'all' }
  | { type: 'assigned'; volunteerId?: string }
  | { type: 'department'; departmentIds: string[] }
  | { type: 'none' };

/**
 * Extract access token from Authorization header
 */
export function extractAccessToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}
