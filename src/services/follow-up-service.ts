/**
 * Follow-up Service
 * Handles follow-up assignments and volunteer capacity management
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4
 */

import { AirtableClient, AIRTABLE_TABLES } from './airtable-client';
import {
  FollowUpAssignment,
  Volunteer,
  CapacityInfo,
  AssignmentStatus,
  VolunteerRole,
  AirtableRecord,
} from '../types';

/**
 * Default configuration values
 */
const DEFAULT_FOLLOW_UP_DUE_DAYS = 3;
const DEFAULT_VOLUNTEER_CAPACITY = 20;

/**
 * Error codes for Follow-up operations
 */
export enum FollowUpErrorCode {
  ASSIGNMENT_NOT_FOUND = 'ASSIGNMENT_NOT_FOUND',
  VOLUNTEER_NOT_FOUND = 'VOLUNTEER_NOT_FOUND',
  NO_AVAILABLE_VOLUNTEER = 'NO_AVAILABLE_VOLUNTEER',
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
      volunteerCapacityLimit?: number;
    } = {}
  ) {}

  /**
   * Get the configured follow-up due days
   */
  private get followUpDueDays(): number {
    return this.config.defaultFollowUpDueDays ?? DEFAULT_FOLLOW_UP_DUE_DAYS;
  }

  /**
   * Get the configured volunteer capacity limit
   */
  private get volunteerCapacityLimit(): number {
    return this.config.volunteerCapacityLimit ?? DEFAULT_VOLUNTEER_CAPACITY;
  }


  /**
   * Create a follow-up assignment for a member
   * Requirements: 4.1, 4.2, 4.3
   * 
   * @param memberId - The member to assign follow-up for
   * @param volunteerId - The volunteer to assign to
   * @param dueInDays - Number of days until due (default: 3)
   * @returns The created follow-up assignment
   */
  async createAssignment(
    memberId: string,
    volunteerId: string,
    dueInDays?: number
  ): Promise<FollowUpAssignment> {
    if (!memberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Member ID is required'
      );
    }

    if (!volunteerId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Volunteer ID is required'
      );
    }

    const assignedDate = new Date();
    const dueDays = dueInDays ?? this.followUpDueDays;
    const dueDate = new Date(assignedDate);
    dueDate.setDate(dueDate.getDate() + dueDays);

    const fields: Record<string, unknown> = {
      'Member': [memberId],
      'Assigned To': [volunteerId],
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
   * Get the capacity information for a volunteer
   * Requirements: 5.2
   * 
   * @param volunteerId - The volunteer to check capacity for
   * @returns Capacity information including current assignments and available slots
   */
  async getVolunteerCapacity(volunteerId: string): Promise<CapacityInfo> {
    if (!volunteerId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Volunteer ID is required'
      );
    }

    // Get volunteer record to get their name and configured capacity
    const volunteerRecord = await this.airtableClient.getRecord(
      AIRTABLE_TABLES.VOLUNTEERS,
      volunteerId
    );

    const volunteerName = (volunteerRecord.fields['Name'] as string) || 'Unknown';
    const configuredCapacity = (volunteerRecord.fields['Capacity'] as number) || this.volunteerCapacityLimit;

    // Count active assignments (not Completed or Reassigned)
    const activeAssignments = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      `AND(
        FIND('${volunteerId}', ARRAYJOIN({Assigned To})),
        OR({Status} = 'Assigned', {Status} = 'In Progress')
      )`
    );

    const currentAssignments = activeAssignments.length;
    const availableSlots = Math.max(0, configuredCapacity - currentAssignments);

    return {
      volunteerId,
      volunteerName,
      capacity: configuredCapacity,
      currentAssignments,
      availableSlots,
      hasCapacity: currentAssignments < configuredCapacity,
    };
  }

  /**
   * Find an available volunteer with capacity
   * Requirements: 5.2
   * 
   * @param role - The role to filter volunteers by (default: 'Follow-up')
   * @returns An available volunteer or null if none found
   */
  async findAvailableVolunteer(role?: VolunteerRole): Promise<Volunteer | null> {
    const filterRole = role || 'Follow-up';
    
    // Find active volunteers with the specified role
    const volunteers = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.VOLUNTEERS,
      `AND({Active} = TRUE(), {Role} = '${filterRole}')`
    );

    // Check each volunteer's capacity
    for (const volunteerRecord of volunteers) {
      const volunteer = this.mapRecordToVolunteer(volunteerRecord);
      const capacityInfo = await this.getVolunteerCapacity(volunteer.id);
      
      if (capacityInfo.hasCapacity) {
        return volunteer;
      }
    }

    return null;
  }


  /**
   * Reassign a member to a new volunteer
   * Requirements: 5.3
   * 
   * @param memberId - The member to reassign
   * @param newVolunteerId - The new volunteer to assign to
   * @param _reason - The reason for reassignment (for logging/audit purposes)
   * @returns The new follow-up assignment
   */
  async reassignMember(
    memberId: string,
    newVolunteerId: string,
    _reason: string
  ): Promise<FollowUpAssignment> {
    if (!memberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Member ID is required'
      );
    }

    if (!newVolunteerId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'New volunteer ID is required'
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
    const newAssignment = await this.createAssignment(memberId, newVolunteerId);

    return newAssignment;
  }

  /**
   * Get all assignments for a volunteer
   * 
   * @param volunteerId - The volunteer to get assignments for
   * @returns List of follow-up assignments
   */
  async getAssignmentsByVolunteer(volunteerId: string): Promise<FollowUpAssignment[]> {
    if (!volunteerId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Volunteer ID is required'
      );
    }

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      `FIND('${volunteerId}', ARRAYJOIN({Assigned To}))`
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
   * Check if reassignment is needed based on volunteer capacity
   * Requirements: 5.1, 5.2
   * 
   * @param currentVolunteerId - The current volunteer's ID
   * @returns Object indicating if reassignment is needed and available volunteer
   */
  async checkReassignmentNeeded(currentVolunteerId: string): Promise<{
    needsReassignment: boolean;
    availableVolunteer: Volunteer | null;
    reason?: string;
  }> {
    const capacityInfo = await this.getVolunteerCapacity(currentVolunteerId);

    if (capacityInfo.hasCapacity) {
      return {
        needsReassignment: false,
        availableVolunteer: null,
      };
    }

    // Current volunteer is at capacity, find an available one
    const availableVolunteer = await this.findAvailableVolunteer('Follow-up');

    if (!availableVolunteer) {
      return {
        needsReassignment: true,
        availableVolunteer: null,
        reason: `Volunteer ${capacityInfo.volunteerName} has reached capacity (${capacityInfo.currentAssignments}/${capacityInfo.capacity}) but no other volunteers are available`,
      };
    }

    return {
      needsReassignment: true,
      availableVolunteer,
      reason: `Volunteer ${capacityInfo.volunteerName} has reached capacity (${capacityInfo.currentAssignments}/${capacityInfo.capacity})`,
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
   * Map Airtable record to Volunteer interface
   */
  private mapRecordToVolunteer(record: AirtableRecord): Volunteer {
    const fields = record.fields;

    return {
      id: record.id,
      name: (fields['Name'] as string) || '',
      role: (fields['Role'] as VolunteerRole) || 'Follow-up',
      phone: (fields['Phone'] as string) || '',
      email: (fields['Email'] as string) || undefined,
      active: (fields['Active'] as boolean) || false,
      capacity: (fields['Capacity'] as number) || this.volunteerCapacityLimit,
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
   * 1. Checks if the target volunteer has capacity
   * 2. If at capacity (>= 20 assignments), finds an available volunteer
   * 3. Creates assignment to available volunteer or logs warning if none available
   * 4. Marks old assignment as "Reassigned" if reassigning
   * 
   * @param memberId - The member to assign follow-up for
   * @param preferredVolunteerId - The preferred volunteer (e.g., soul winner)
   * @returns Result of the assignment operation
   */
  async assignWithCapacityCheck(
    memberId: string,
    preferredVolunteerId: string
  ): Promise<{
    assignment: FollowUpAssignment | null;
    assignedVolunteerId: string | null;
    wasReassigned: boolean;
    warning?: string;
  }> {
    if (!memberId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Member ID is required'
      );
    }

    if (!preferredVolunteerId) {
      throw new FollowUpError(
        FollowUpErrorCode.INVALID_INPUT,
        'Preferred volunteer ID is required'
      );
    }

    // Check if preferred volunteer has capacity
    const reassignmentCheck = await this.checkReassignmentNeeded(preferredVolunteerId);

    if (!reassignmentCheck.needsReassignment) {
      // Preferred volunteer has capacity - assign directly
      const assignment = await this.createAssignment(memberId, preferredVolunteerId);
      return {
        assignment,
        assignedVolunteerId: preferredVolunteerId,
        wasReassigned: false,
      };
    }

    // Preferred volunteer is at capacity
    if (reassignmentCheck.availableVolunteer) {
      // Found an available volunteer - reassign
      const assignment = await this.createAssignment(
        memberId,
        reassignmentCheck.availableVolunteer.id
      );

      // eslint-disable-next-line no-console
      console.log(
        `Reassigned member ${memberId} from volunteer ${preferredVolunteerId} ` +
        `to ${reassignmentCheck.availableVolunteer.id} due to capacity: ${reassignmentCheck.reason}`
      );

      return {
        assignment,
        assignedVolunteerId: reassignmentCheck.availableVolunteer.id,
        wasReassigned: true,
        warning: reassignmentCheck.reason,
      };
    }

    // No available volunteer - log warning and assign anyway (Requirement 5.4)
    const warningMessage = reassignmentCheck.reason || 
      'No available volunteer found for reassignment';
    
    // eslint-disable-next-line no-console
    console.warn(
      `WARNING: ${warningMessage}. Assigning to preferred volunteer ${preferredVolunteerId} anyway.`
    );

    // Still create the assignment to the preferred volunteer
    const assignment = await this.createAssignment(memberId, preferredVolunteerId);

    return {
      assignment,
      assignedVolunteerId: preferredVolunteerId,
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
    const capacityInfo = await this.getVolunteerCapacity(currentOwnerId);

    // Requirement 5.1: Check if current owner has >= 20 assignments
    if (capacityInfo.hasCapacity) {
      // Current owner still has capacity - no reassignment needed
      return {
        reassigned: false,
      };
    }

    // Requirement 5.2: Find available volunteer
    const availableVolunteer = await this.findAvailableVolunteer('Follow-up');

    if (!availableVolunteer) {
      // Requirement 5.4: Log warning if no volunteer available
      const warning = `Volunteer ${capacityInfo.volunteerName} has reached capacity ` +
        `(${capacityInfo.currentAssignments}/${capacityInfo.capacity}) ` +
        `but no other volunteers are available for reassignment`;
      
      // eslint-disable-next-line no-console
      console.warn(`WARNING: ${warning}`);

      return {
        reassigned: false,
        warning,
      };
    }

    // Requirement 5.3: Create new assignment and mark old as "Reassigned"
    const reason = `Capacity overflow: ${capacityInfo.volunteerName} has ` +
      `${capacityInfo.currentAssignments}/${capacityInfo.capacity} assignments`;
    
    const newAssignment = await this.reassignMember(
      memberId,
      availableVolunteer.id,
      reason
    );

    // eslint-disable-next-line no-console
    console.log(
      `Reassigned member ${memberId} from ${currentOwnerId} to ${availableVolunteer.id}: ${reason}`
    );

    return {
      reassigned: true,
      newAssignment,
      newOwnerId: availableVolunteer.id,
    };
  }
}
