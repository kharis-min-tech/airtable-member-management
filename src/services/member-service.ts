/**
 * Member Service
 * Handles member record creation, deduplication, and merging
 * 
 * Requirements: 1.1, 2.3, 2.4, 3.4, 11.1, 11.2, 11.3, 11.4
 */

import { AirtableClient, AIRTABLE_TABLES } from './airtable-client';
import {
  Member,
  CreateMemberInput,
  UpdateMemberInput,
  MemberStatus,
  MemberSource,
  FollowUpStatus,
  AirtableRecord,
} from '../types';

/**
 * Error codes for Member operations
 */
export enum MemberErrorCode {
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  DUPLICATE_MEMBER = 'DUPLICATE_MEMBER',
  INVALID_INPUT = 'INVALID_INPUT',
  MERGE_CONFLICT = 'MERGE_CONFLICT',
}

/**
 * Custom error class for Member operations
 */
export class MemberError extends Error {
  constructor(
    public readonly code: MemberErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MemberError';
  }
}

/**
 * MemberService - Handles all member-related operations
 */
export class MemberService {
  constructor(private readonly airtableClient: AirtableClient) {}

  /**
   * Find a member by phone or email
   * Implements deduplication check using unique key
   * Requirements: 2.1, 3.1, 11.1
   */
  async findMemberByPhoneOrEmail(
    phone?: string,
    email?: string
  ): Promise<Member | null> {
    const record = await this.airtableClient.findByUniqueKey(
      AIRTABLE_TABLES.MEMBERS,
      phone,
      email
    );

    if (!record) {
      return null;
    }

    return this.mapRecordToMember(record);
  }

  /**
   * Create a new member record
   * Requirements: 1.1, 2.4
   */
  async createMember(input: CreateMemberInput): Promise<Member> {
    // Validate required fields
    if (!input.firstName || !input.lastName) {
      throw new MemberError(
        MemberErrorCode.INVALID_INPUT,
        'First name and last name are required'
      );
    }

    if (!input.phone && !input.email) {
      throw new MemberError(
        MemberErrorCode.INVALID_INPUT,
        'At least one of phone or email is required'
      );
    }

    // Check for existing member to prevent duplicates
    const existingMember = await this.findMemberByPhoneOrEmail(
      input.phone,
      input.email
    );

    if (existingMember) {
      throw new MemberError(
        MemberErrorCode.DUPLICATE_MEMBER,
        'A member with this phone or email already exists',
        { existingMemberId: existingMember.id }
      );
    }

    // Prepare fields for Airtable
    const fields: Record<string, unknown> = {
      'First Name': input.firstName,
      'Last Name': input.lastName,
      'Status': input.status,
      'Source': input.source,
      'Date First Captured': this.formatDate(input.dateFirstCaptured),
      'Follow-up Status': 'Not Started' as FollowUpStatus,
    };

    // Add optional fields if provided
    if (input.phone) {
      fields['Phone'] = this.airtableClient.normalizePhone(input.phone);
    }
    if (input.email) {
      fields['Email'] = input.email.toLowerCase().trim();
    }
    if (input.address) {
      fields['Address'] = input.address;
    }
    if (input.ghanaPostCode) {
      fields['GhanaPost Code'] = input.ghanaPostCode;
    }

    const record = await this.airtableClient.createRecord(
      AIRTABLE_TABLES.MEMBERS,
      fields
    );

    return this.mapRecordToMember(record);
  }


  /**
   * Update an existing member record with partial updates
   * Only updates fields that are provided (non-undefined)
   * Requirements: 2.3
   */
  async updateMember(
    memberId: string,
    input: UpdateMemberInput
  ): Promise<Member> {
    // Build update fields - only include non-undefined values
    const fields: Record<string, unknown> = {};

    if (input.firstName !== undefined) {
      fields['First Name'] = input.firstName;
    }
    if (input.lastName !== undefined) {
      fields['Last Name'] = input.lastName;
    }
    if (input.phone !== undefined) {
      fields['Phone'] = this.airtableClient.normalizePhone(input.phone);
    }
    if (input.email !== undefined) {
      fields['Email'] = input.email.toLowerCase().trim();
    }
    if (input.address !== undefined) {
      fields['Address'] = input.address;
    }
    if (input.ghanaPostCode !== undefined) {
      fields['GhanaPost Code'] = input.ghanaPostCode;
    }
    if (input.status !== undefined) {
      fields['Status'] = input.status;
    }
    if (input.followUpOwner !== undefined) {
      // Follow-up Owner is a linked record field
      fields['Follow-up Owner'] = input.followUpOwner ? [input.followUpOwner] : [];
    }
    if (input.followUpStatus !== undefined) {
      fields['Follow-up Status'] = input.followUpStatus;
    }
    if (input.firstServiceAttended !== undefined) {
      // First Service Attended is a linked record field
      fields['First Service Attended'] = input.firstServiceAttended
        ? [input.firstServiceAttended]
        : [];
    }

    // Only update if there are fields to update
    if (Object.keys(fields).length === 0) {
      // No updates, just return the current member
      const record = await this.airtableClient.getRecord(
        AIRTABLE_TABLES.MEMBERS,
        memberId
      );
      return this.mapRecordToMember(record);
    }

    const record = await this.airtableClient.updateRecord(
      AIRTABLE_TABLES.MEMBERS,
      memberId,
      fields
    );

    return this.mapRecordToMember(record);
  }

  /**
   * Merge two member records
   * Preserves oldest Date First Captured
   * Consolidates linked records (Attendance, Home Visits, Follow-up)
   * Fills empty fields without overwriting non-empty values
   * Requirements: 2.3, 11.2, 11.3, 11.4
   */
  async mergeMembers(
    targetId: string,
    sourceId: string
  ): Promise<Member> {
    // Get both records
    const [targetRecord, sourceRecord] = await Promise.all([
      this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBERS, targetId),
      this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBERS, sourceId),
    ]);

    const targetFields = targetRecord.fields;
    const sourceFields = sourceRecord.fields;

    // Prepare merged fields
    const mergedFields: Record<string, unknown> = {};

    // Preserve oldest Date First Captured (Requirement 11.3)
    const targetDate = this.parseDate(targetFields['Date First Captured'] as string);
    const sourceDate = this.parseDate(sourceFields['Date First Captured'] as string);
    
    if (targetDate && sourceDate) {
      if (sourceDate < targetDate) {
        mergedFields['Date First Captured'] = this.formatDate(sourceDate);
      }
    } else if (sourceDate && !targetDate) {
      mergedFields['Date First Captured'] = this.formatDate(sourceDate);
    }

    // Fill empty fields from source without overwriting (Requirement 2.3)
    const fieldsToMerge = [
      'First Name',
      'Last Name',
      'Phone',
      'Email',
      'Address',
      'GhanaPost Code',
      'Gender',
      'DOB',
    ];

    for (const field of fieldsToMerge) {
      if (!targetFields[field] && sourceFields[field]) {
        mergedFields[field] = sourceFields[field];
      }
    }

    // Consolidate linked records (Requirement 11.4)
    // Attendance records
    const targetAttendance = (targetFields['Attendance'] as string[]) || [];
    const sourceAttendance = (sourceFields['Attendance'] as string[]) || [];
    const mergedAttendance = [...new Set([...targetAttendance, ...sourceAttendance])];
    if (mergedAttendance.length > targetAttendance.length) {
      mergedFields['Attendance'] = mergedAttendance;
    }

    // Home Visits records
    const targetVisits = (targetFields['Home Visits'] as string[]) || [];
    const sourceVisits = (sourceFields['Home Visits'] as string[]) || [];
    const mergedVisits = [...new Set([...targetVisits, ...sourceVisits])];
    if (mergedVisits.length > targetVisits.length) {
      mergedFields['Home Visits'] = mergedVisits;
    }

    // Update target record with merged fields
    let updatedMember: Member;
    if (Object.keys(mergedFields).length > 0) {
      const updatedRecord = await this.airtableClient.updateRecord(
        AIRTABLE_TABLES.MEMBERS,
        targetId,
        mergedFields
      );
      updatedMember = this.mapRecordToMember(updatedRecord);
    } else {
      updatedMember = this.mapRecordToMember(targetRecord);
    }

    // Update linked records in other tables to point to target member
    await this.updateLinkedRecords(sourceId, targetId);

    return updatedMember;
  }


  /**
   * Merge fields from source into target member
   * Only fills empty fields, does not overwrite existing values
   * Used for First Timer merge with Evangelism Contact
   * Requirements: 2.3, 2.6
   */
  async mergeFieldsIntoMember(
    targetId: string,
    sourceFields: Partial<UpdateMemberInput>
  ): Promise<Member> {
    // Get current member record
    const targetRecord = await this.airtableClient.getRecord(
      AIRTABLE_TABLES.MEMBERS,
      targetId
    );
    const currentFields = targetRecord.fields;

    // Build update with only empty fields
    const updateFields: Record<string, unknown> = {};

    // Only update if target field is empty and source has value
    if (!currentFields['Address'] && sourceFields.address) {
      updateFields['Address'] = sourceFields.address;
    }
    if (!currentFields['GhanaPost Code'] && sourceFields.ghanaPostCode) {
      updateFields['GhanaPost Code'] = sourceFields.ghanaPostCode;
    }
    if (!currentFields['Email'] && sourceFields.email) {
      updateFields['Email'] = sourceFields.email.toLowerCase().trim();
    }
    if (!currentFields['Phone'] && sourceFields.phone) {
      updateFields['Phone'] = this.airtableClient.normalizePhone(sourceFields.phone);
    }

    // Update First Service Attended if empty (Requirement 2.6)
    if (!currentFields['First Service Attended'] && sourceFields.firstServiceAttended) {
      updateFields['First Service Attended'] = [sourceFields.firstServiceAttended];
    }

    // Update status if provided
    if (sourceFields.status) {
      updateFields['Status'] = sourceFields.status;
    }

    if (Object.keys(updateFields).length === 0) {
      return this.mapRecordToMember(targetRecord);
    }

    const updatedRecord = await this.airtableClient.updateRecord(
      AIRTABLE_TABLES.MEMBERS,
      targetId,
      updateFields
    );

    return this.mapRecordToMember(updatedRecord);
  }

  /**
   * Update linked records in other tables to point to a new member ID
   * Used during merge to consolidate all references
   * Requirements: 11.4
   */
  private async updateLinkedRecords(
    oldMemberId: string,
    newMemberId: string
  ): Promise<void> {
    // Update Attendance records
    const attendanceRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.ATTENDANCE,
      `FIND('${oldMemberId}', ARRAYJOIN({Member}))`
    );

    if (attendanceRecords.length > 0) {
      await this.airtableClient.batchUpdate(
        AIRTABLE_TABLES.ATTENDANCE,
        attendanceRecords.map((record) => ({
          id: record.id,
          fields: { Member: [newMemberId] },
        }))
      );
    }

    // Update Home Visits records
    const homeVisitRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.HOME_VISITS,
      `FIND('${oldMemberId}', ARRAYJOIN({Member}))`
    );

    if (homeVisitRecords.length > 0) {
      await this.airtableClient.batchUpdate(
        AIRTABLE_TABLES.HOME_VISITS,
        homeVisitRecords.map((record) => ({
          id: record.id,
          fields: { Member: [newMemberId] },
        }))
      );
    }

    // Update Follow-up Assignments records
    const followUpRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      `FIND('${oldMemberId}', ARRAYJOIN({Member}))`
    );

    if (followUpRecords.length > 0) {
      await this.airtableClient.batchUpdate(
        AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
        followUpRecords.map((record) => ({
          id: record.id,
          fields: { Member: [newMemberId] },
        }))
      );
    }

    // Update Follow-up Interactions records
    const interactionRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_INTERACTIONS,
      `FIND('${oldMemberId}', ARRAYJOIN({Member}))`
    );

    if (interactionRecords.length > 0) {
      await this.airtableClient.batchUpdate(
        AIRTABLE_TABLES.FOLLOW_UP_INTERACTIONS,
        interactionRecords.map((record) => ({
          id: record.id,
          fields: { Member: [newMemberId] },
        }))
      );
    }

    // Update Evangelism records
    const evangelismRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.EVANGELISM,
      `FIND('${oldMemberId}', ARRAYJOIN({Linked Member}))`
    );

    if (evangelismRecords.length > 0) {
      await this.airtableClient.batchUpdate(
        AIRTABLE_TABLES.EVANGELISM,
        evangelismRecords.map((record) => ({
          id: record.id,
          fields: { 'Linked Member': [newMemberId] },
        }))
      );
    }
  }

  /**
   * Map Airtable record to Member interface
   */
  private mapRecordToMember(record: AirtableRecord): Member {
    const fields = record.fields;

    return {
      id: record.id,
      firstName: (fields['First Name'] as string) || '',
      lastName: (fields['Last Name'] as string) || '',
      fullName: (fields['Full Name'] as string) || 
        `${(fields['First Name'] as string) || ''} ${(fields['Last Name'] as string) || ''}`.trim(),
      phone: (fields['Phone'] as string) || '',
      email: (fields['Email'] as string) || undefined,
      status: (fields['Status'] as MemberStatus) || 'Evangelism Contact',
      source: (fields['Source'] as MemberSource) || 'Other',
      dateFirstCaptured: this.parseDate(fields['Date First Captured'] as string) || new Date(),
      followUpOwner: this.extractLinkedRecordId(fields['Follow-up Owner']),
      followUpStatus: (fields['Follow-up Status'] as FollowUpStatus) || 'Not Started',
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
   * Format date for Airtable (ISO format)
   */
  private formatDate(date: Date): string {
    const isoString = date.toISOString().split('T')[0];
    return isoString || '';
  }

  /**
   * Parse date string from Airtable
   */
  private parseDate(dateStr: string | undefined | null): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }
}
