import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { UserContext, UserRole } from '../types';

/**
 * Authentication Service for Cognito integration
 * Handles token validation and role-based access control
 */
export class AuthService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor(userPoolId?: string) {
    this.client = new CognitoIdentityProviderClient({});
    this.userPoolId = userPoolId || process.env.USER_POOL_ID || '';
  }

  /**
   * Validate access token and get user context
   */
  async validateToken(accessToken: string): Promise<UserContext> {
    try {
      const result = await this.client.send(
        new GetUserCommand({
          AccessToken: accessToken,
        })
      );

      const userId = result.Username || '';
      const email = result.UserAttributes?.find((attr) => attr.Name === 'email')?.Value || '';

      // Get user's groups (roles)
      const role = await this.getUserRole(userId);

      return {
        userId,
        email,
        role,
      };
    } catch (error) {
      console.error('Token validation error:', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get user role from Cognito groups
   */
  async getUserRole(userId: string): Promise<UserRole> {
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
      throw new Error('Failed to get user role');
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
