/**
 * Follow-up Service
 * Handles follow-up assignments and member capacity management
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4
 */

import { AirtableClient, AIRTABLE_TABLES } from './airtable-client';
import {
  FollowUpAssignment,
  FollowUpMember,
  CapacityInfo,
  AssignmentStatus,
  MemberRole,
  AirtableRecord,
} from '../types';

/**
 * Default configuration values
 */
const DEFAULT_FOLLOW_UP_DUE_DAYS = 3;
const DEFAULT_MEMBER_CAPACITY = 20;

/**
 * Error codes for Follow-up operations
 */
export enum FollowUpErrorCode {
  ASSIGNMENT_NOT_FOUND = 'ASSIGNMENT_NOT_FOUND',
  FOLLOW_UP_MEMBER_NOT_FOUND = 'FOLLOW_UP_MEMBER_NOT_FOUND',
  NO_AVAILABLE_FOLLOW_UP_MEMBER = 'NO_AVAILABLE_FOLLOW_UP_MEMBER',
  INVALID_INPUT = 'INVALID_INPUT',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
}

/**
 * Custom error class for Follow-up operations
 */
export class FollowUpError extends Error {
  constructor(
    public readonly code: FollowUpErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FollowUpError';
  }
}

/**
 * FollowUpService - Handles all follow-up assignment operations
 */
export class FollowUpService {
  constructor(
    private readonly airtableClient: AirtableClient,
    private readonly config: {
      defaultFollowUpDueDays?: number;
      memberCapacityLimit?: number;
    } = {}
  ) {}

  /**
   * Get the configured follow-up due days
   */
  private get followUpDueDays(): number {
    return this.config.defaultFollowUpDueDays ?? DEFAULT_FOLLOW_UP_DUE_DAYS;
  }

  /**
   * Get the configured member capacity limit
   */
  private get memberCapacityLimit(): number {
    return this.config.memberCapacityLimit ?? DEFAULT_MEMBER_CAPACITY;
  }


  /**
   * Create a follow-up assignment for a member
   * Requirements: 4.1, 4.2, 4.3
   * 
   * @param memberId - The member to assign follow-up for
   * @param followUpMemberId - The follow-up member to assign to
   * @param dueInDays - Number of days until due (default: 3)
   * @returns The created follow-up assignment
   */
  async createAssignment(
    memberId: string,
    followUpMemberId: string,
    dueInDays?: number
  ): Promise<FollowUpAssignment> {
    if (!memberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Member ID is required'
      );
    }

    if (!followUpMemberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Follow-up member ID is required'
      );
    }

    const assignedDate = new Date();
    const dueDays = dueInDays ?? this.followUpDueDays;
    const dueDate = new Date(assignedDate);
    dueDate.setDate(dueDate.getDate() + dueDays);

    const fields: Record<string, unknown> = {
      'Member': [memberId],
      'Assigned To': [followUpMemberId],
      'Assigned Date': this.formatDate(assignedDate),
      'Due Date': this.formatDate(dueDate),
      'Status': 'Assigned' as AssignmentStatus,
    };

    const record = await this.airtableClient.createRecord(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      fields
    );

    return this.mapRecordToAssignment(record);
  }

  /**
   * Get the capacity information for a follow-up member
   * Requirements: 5.2
   * 
   * @param followUpMemberId - The follow-up member to check capacity for
   * @returns Capacity information including current assignments and available slots
   */
  async getFollowUpMemberCapacity(followUpMemberId: string): Promise<CapacityInfo> {
    if (!followUpMemberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Follow-up member ID is required'
      );
    }

    // Get follow-up member record to get their name and configured capacity
    const followUpMemberRecord = await this.airtableClient.getRecord(
      AIRTABLE_TABLES.MEMBERS,
      followUpMemberId
    );

    const memberName = (followUpMemberRecord.fields['Full Name'] as string) || 'Unknown';
    const configuredCapacity = (followUpMemberRecord.fields['Capacity'] as number) || this.memberCapacityLimit;

    // Count active assignments (not Completed or Reassigned)
    const activeAssignments = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      `AND(
        FIND('${followUpMemberId}', ARRAYJOIN({Assigned To})),
        OR({Status} = 'Assigned', {Status} = 'In Progress')
      )`
    );

    const currentAssignments = activeAssignments.length;
    const availableSlots = Math.max(0, configuredCapacity - currentAssignments);

    return {
      memberId: followUpMemberId,
      memberName,
      capacity: configuredCapacity,
      currentAssignments,
      availableSlots,
      hasCapacity: currentAssignments < configuredCapacity,
    };
  }

  /**
   * Find an available follow-up member with capacity
   * Requirements: 5.2
   * 
   * @param role - The role to filter members by (default: 'Follow-up')
   * @returns An available follow-up member or null if none found
   */
  async findAvailableFollowUpMember(role?: MemberRole): Promise<FollowUpMember | null> {
    const filterRole = role || 'Follow-up';
    
    // Find active members with the specified role
    const followUpMembers = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.MEMBERS,
      `AND({Active} = TRUE(), {Role} = '${filterRole}')`
    );

    // Check each follow-up member's capacity
    for (const followUpMemberRecord of followUpMembers) {
      const followUpMember = this.mapRecordToFollowUpMember(followUpMemberRecord);
      const capacityInfo = await this.getFollowUpMemberCapacity(followUpMember.id);
      
      if (capacityInfo.hasCapacity) {
        return followUpMember;
      }
    }

    return null;
  }


  /**
   * Reassign a member to a new follow-up member
   * Requirements: 5.3
   * 
   * @param memberId - The member to reassign
   * @param newFollowUpMemberId - The new follow-up member to assign to
   * @param _reason - The reason for reassignment (for logging/audit purposes)
   * @returns The new follow-up assignment
   */
  async reassignMember(
    memberId: string,
    newFollowUpMemberId: string,
    _reason: string
  ): Promise<FollowUpAssignment> {
    if (!memberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Member ID is required'
      );
    }

    if (!newFollowUpMemberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'New follow-up member ID is required'
      );
    }

    // Find current active assignment for the member
    const currentAssignments = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      `AND(
        FIND('${memberId}', ARRAYJOIN({Member})),
        OR({Status} = 'Assigned', {Status} = 'In Progress')
      )`
    );

    // Mark current assignment as "Reassigned"
    if (currentAssignments.length > 0) {
      const currentAssignment = currentAssignments[0];
      if (currentAssignment) {
        await this.airtableClient.updateRecord(
          AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
          currentAssignment.id,
          { 'Status': 'Reassigned' as AssignmentStatus }
        );
      }
    }

    // Create new assignment
    const newAssignment = await this.createAssignment(memberId, newFollowUpMemberId);

    return newAssignment;
  }

  /**
   * Get all assignments for a follow-up member
   * 
   * @param followUpMemberId - The follow-up member to get assignments for
   * @returns List of follow-up assignments
   */
  async getAssignmentsByFollowUpMember(followUpMemberId: string): Promise<FollowUpAssignment[]> {
    if (!followUpMemberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Follow-up member ID is required'
      );
    }

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      `FIND('${followUpMemberId}', ARRAYJOIN({Assigned To}))`
    );

    return records.map(record => this.mapRecordToAssignment(record));
  }

  /**
   * Get assignments due on a specific date
   * 
   * @param date - The date to check for due assignments
   * @returns List of due follow-up assignments
   */
  async getDueAssignments(date: Date): Promise<FollowUpAssignment[]> {
    const dateStr = this.formatDate(date);
    
    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      `AND({Due Date} = '${dateStr}', {Status} != 'Completed')`
    );

    return records.map(record => this.mapRecordToAssignment(record));
  }

  /**
   * Get members without a follow-up owner assigned
   * 
   * @returns List of unassigned member IDs
   */
  async getUnassignedMembers(): Promise<string[]> {
    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.MEMBERS,
      `AND(
        {Follow-up Owner} = BLANK(),
        OR({Status} = 'Evangelism Contact', {Status} = 'First Timer')
      )`
    );

    return records.map(record => record.id);
  }

  /**
   * Check if reassignment is needed based on follow-up member capacity
   * Requirements: 5.1, 5.2
   * 
   * @param currentFollowUpMemberId - The current follow-up member's ID
   * @returns Object indicating if reassignment is needed and available follow-up member
   */
  async checkReassignmentNeeded(currentFollowUpMemberId: string): Promise<{
    needsReassignment: boolean;
    availableFollowUpMember: FollowUpMember | null;
    reason?: string;
  }> {
    const capacityInfo = await this.getFollowUpMemberCapacity(currentFollowUpMemberId);

    if (capacityInfo.hasCapacity) {
      return {
        needsReassignment: false,
        availableFollowUpMember: null,
      };
    }

    // Current follow-up member is at capacity, find an available one
    const availableFollowUpMember = await this.findAvailableFollowUpMember('Follow-up');

    if (!availableFollowUpMember) {
      return {
        needsReassignment: true,
        availableFollowUpMember: null,
        reason: `Follow-up member ${capacityInfo.memberName} has reached capacity (${capacityInfo.currentAssignments}/${capacityInfo.capacity}) but no other members are available`,
      };
    }

    return {
      needsReassignment: true,
      availableFollowUpMember,
      reason: `Follow-up member ${capacityInfo.memberName} has reached capacity (${capacityInfo.currentAssignments}/${capacityInfo.capacity})`,
    };
  }


  /**
   * Map Airtable record to FollowUpAssignment interface
   */
  private mapRecordToAssignment(record: AirtableRecord): FollowUpAssignment {
    const fields = record.fields;

    return {
      id: record.id,
      memberId: this.extractLinkedRecordId(fields['Member']) || '',
      assignedTo: this.extractLinkedRecordId(fields['Assigned To']) || '',
      assignedDate: this.parseDate(fields['Assigned Date'] as string) || new Date(),
      dueDate: this.parseDate(fields['Due Date'] as string) || new Date(),
      status: (fields['Status'] as AssignmentStatus) || 'Assigned',
    };
  }

  /**
   * Map Airtable record to FollowUpMember interface
   */
  private mapRecordToFollowUpMember(record: AirtableRecord): FollowUpMember {
    const fields = record.fields;

    return {
      id: record.id,
      name: (fields['Full Name'] as string) || '',
      role: (fields['Role'] as MemberRole) || 'Follow-up',
      phone: (fields['Old Phone'] as string) || '',
      email: (fields['Email'] as string) || undefined,
      active: (fields['Active'] as boolean) || false,
      capacity: (fields['Capacity'] as number) || this.memberCapacityLimit,
    };
  }

  /**
   * Extract first ID from linked record field
   */
  private extractLinkedRecordId(field: unknown): string | undefined {
    if (Array.isArray(field) && field.length > 0) {
      return field[0] as string;
    }
    return undefined;
  }

  /**
   * Format date for Airtable (ISO format YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0] || '';
  }

  /**
   * Parse date string from Airtable
   */
  private parseDate(dateStr: string | undefined | null): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Handle follow-up assignment with capacity check and automatic reassignment
   * Requirements: 4.1, 5.1, 5.2, 5.3, 5.4
   * 
   * This method:
   * 1. Checks if the target follow-up member has capacity
   * 2. If at capacity (>= 20 assignments), finds an available follow-up member
   * 3. Creates assignment to available follow-up member or logs warning if none available
   * 4. Marks old assignment as "Reassigned" if reassigning
   * 
   * @param memberId - The member to assign follow-up for
   * @param preferredFollowUpMemberId - The preferred follow-up member (e.g., soul winner)
   * @returns Result of the assignment operation
   */
  async assignWithCapacityCheck(
    memberId: string,
    preferredFollowUpMemberId: string
  ): Promise<{
    assignment: FollowUpAssignment | null;
    assignedFollowUpMemberId: string | null;
    wasReassigned: boolean;
    warning?: string;
  }> {
    if (!memberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Member ID is required'
      );
    }

    if (!preferredFollowUpMemberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Preferred follow-up member ID is required'
      );
    }

    // Check if preferred follow-up member has capacity
    const reassignmentCheck = await this.checkReassignmentNeeded(preferredFollowUpMemberId);

    if (!reassignmentCheck.needsReassignment) {
      // Preferred follow-up member has capacity - assign directly
      const assignment = await this.createAssignment(memberId, preferredFollowUpMemberId);
      return {
        assignment,
        assignedFollowUpMemberId: preferredFollowUpMemberId,
        wasReassigned: false,
      };
    }

    // Preferred follow-up member is at capacity
    if (reassignmentCheck.availableFollowUpMember) {
      // Found an available follow-up member - reassign
      const assignment = await this.createAssignment(
        memberId,
        reassignmentCheck.availableFollowUpMember.id
      );

      // eslint-disable-next-line no-console
      console.log(
        `Reassigned member ${memberId} from follow-up member ${preferredFollowUpMemberId} ` +
        `to ${reassignmentCheck.availableFollowUpMember.id} due to capacity: ${reassignmentCheck.reason}`
      );

      return {
        assignment,
        assignedFollowUpMemberId: reassignmentCheck.availableFollowUpMember.id,
        wasReassigned: true,
        warning: reassignmentCheck.reason,
      };
    }

    // No available follow-up member - log warning and assign anyway (Requirement 5.4)
    const warningMessage = reassignmentCheck.reason || 
      'No available follow-up member found for reassignment';
    
    // eslint-disable-next-line no-console
    console.warn(
      `WARNING: ${warningMessage}. Assigning to preferred follow-up member ${preferredFollowUpMemberId} anyway.`
    );

    // Still create the assignment to the preferred follow-up member
    const assignment = await this.createAssignment(memberId, preferredFollowUpMemberId);

    return {
      assignment,
      assignedFollowUpMemberId: preferredFollowUpMemberId,
      wasReassigned: false,
      warning: warningMessage,
    };
  }

  /**
   * Process reassignment for an existing member when their current owner is at capacity
   * Requirements: 5.1, 5.2, 5.3, 5.4
   * 
   * @param memberId - The member to potentially reassign
   * @param currentOwnerId - The current follow-up owner's ID
   * @returns Result of the reassignment check/operation
   */
  async processCapacityReassignment(
    memberId: string,
    currentOwnerId: string
  ): Promise<{
    reassigned: boolean;
    newAssignment?: FollowUpAssignment;
    newOwnerId?: string;
    warning?: string;
  }> {
    if (!memberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Member ID is required'
      );
    }

    if (!currentOwnerId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Current owner ID is required'
      );
    }

    // Check if current owner has capacity
    const capacityInfo = await this.getFollowUpMemberCapacity(currentOwnerId);

    // Requirement 5.1: Check if current owner has >= 20 assignments
    if (capacityInfo.hasCapacity) {
      // Current owner still has capacity - no reassignment needed
      return {
        reassigned: false,
      };
    }

    // Requirement 5.2: Find available follow-up member
    const availableFollowUpMember = await this.findAvailableFollowUpMember('Follow-up');

    if (!availableFollowUpMember) {
      // Requirement 5.4: Log warning if no follow-up member available
      const warning = `Follow-up member ${capacityInfo.memberName} has reached capacity ` +
        `(${capacityInfo.currentAssignments}/${capacityInfo.capacity}) ` +
        `but no other members are available for reassignment`;
      
      // eslint-disable-next-line no-console
      console.warn(`WARNING: ${warning}`);

      return {
        reassigned: false,
        warning,
      };
    }

    // Requirement 5.3: Create new assignment and mark old as "Reassigned"
    const reason = `Capacity overflow: ${capacityInfo.memberName} has ` +
      `${capacityInfo.currentAssignments}/${capacityInfo.capacity} assignments`;
    
    const newAssignment = await this.reassignMember(
      memberId,
      availableFollowUpMember.id,
      reason
    );

    // eslint-disable-next-line no-console
    console.log(
      `Reassigned member ${memberId} from ${currentOwnerId} to ${availableFollowUpMember.id}: ${reason}`
    );

    return {
      reassigned: true,
      newAssignment,
      newOwnerId: availableFollowUpMember.id,
    };
  }
}
