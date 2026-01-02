/**
 * Attendance Service
 * Manages attendance record creation and queries with idempotency
 * 
 * Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
 */

import { AirtableClient, AIRTABLE_TABLES } from './airtable-client';
import { AttendanceRecord, SourceForm, AirtableRecord } from '../types';

/**
 * Error codes for Attendance operations
 */
export enum AttendanceErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  ATTENDANCE_NOT_FOUND = 'ATTENDANCE_NOT_FOUND',
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
}

/**
 * Custom error class for Attendance operations
 */
export class AttendanceError extends Error {
  constructor(
    public readonly code: AttendanceErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AttendanceError';
  }
}

/**
 * Result of marking attendance
 */
export interface MarkPresentResult {
  attendance: AttendanceRecord;
  created: boolean;
  updated: boolean;
}

/**
 * AttendanceService - Handles all attendance-related operations
 */
export class AttendanceService {
  constructor(private readonly airtableClient: AirtableClient) {}

  /**
   * Mark a member as present for a service
   * Implements idempotency: updates if exists, creates if not
   * Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3
   * 
   * @param memberId - The member's Airtable record ID
   * @param serviceId - The service's Airtable record ID
   * @param sourceForm - The source of the attendance marking
   * @returns The attendance record and whether it was created or updated
   */
  async markPresent(
    memberId: string,
    serviceId: string,
    sourceForm: SourceForm
  ): Promise<MarkPresentResult> {
    // Validate inputs
    if (!memberId || !memberId.trim()) {
      throw new AttendanceError(
        AttendanceErrorCode.INVALID_INPUT,
        'Member ID is required'
      );
    }

    if (!serviceId || !serviceId.trim()) {
      throw new AttendanceError(
        AttendanceErrorCode.INVALID_INPUT,
        'Service ID is required'
      );
    }

    if (!sourceForm) {
      throw new AttendanceError(
        AttendanceErrorCode.INVALID_INPUT,
        'Source form is required'
      );
    }

    // Check for existing attendance record (idempotency check)
    const existingAttendance = await this.findAttendance(memberId, serviceId);

    if (existingAttendance) {
      // Update existing record - set Present? to true
      // Requirements: 6.3, 7.3
      const updatedRecord = await this.airtableClient.updateRecord(
        AIRTABLE_TABLES.ATTENDANCE,
        existingAttendance.id,
        {
          'Present?': true,
          'Source Form': sourceForm,
        }
      );

      return {
        attendance: this.mapRecordToAttendance(updatedRecord),
        created: false,
        updated: true,
      };
    }

    // Create new attendance record
    // Requirements: 6.1, 6.2, 7.1, 7.2
    const fields: Record<string, unknown> = {
      'Member': [memberId],
      'Service': [serviceId],
      'Present?': true,
      'Source Form': sourceForm,
    };

    const record = await this.airtableClient.createRecord(
      AIRTABLE_TABLES.ATTENDANCE,
      fields
    );

    return {
      attendance: this.mapRecordToAttendance(record),
      created: true,
      updated: false,
    };
  }

  /**
   * Find an existing attendance record for a member and service combination
   * Requirements: 6.3, 7.3 (idempotency check)
   * 
   * @param memberId - The member's Airtable record ID
   * @param serviceId - The service's Airtable record ID
   * @returns The attendance record if found, null otherwise
   */
  async findAttendance(
    memberId: string,
    serviceId: string
  ): Promise<AttendanceRecord | null> {
    if (!memberId || !serviceId) {
      return null;
    }

    // Build filter formula to find attendance by member and service
    // Using FIND to check if the record ID exists in the linked field array
    const filterFormula = `AND(FIND('${memberId}', ARRAYJOIN({Member})), FIND('${serviceId}', ARRAYJOIN({Service})))`;

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.ATTENDANCE,
      filterFormula,
      { maxRecords: 1 }
    );

    if (records.length === 0) {
      return null;
    }

    return this.mapRecordToAttendance(records[0]!);
  }

  /**
   * Get all attendance records for a specific service
   * 
   * @param serviceId - The service's Airtable record ID
   * @returns Array of attendance records for the service
   */
  async getServiceAttendance(serviceId: string): Promise<AttendanceRecord[]> {
    if (!serviceId || !serviceId.trim()) {
      throw new AttendanceError(
        AttendanceErrorCode.INVALID_INPUT,
        'Service ID is required'
      );
    }

    const filterFormula = `FIND('${serviceId}', ARRAYJOIN({Service}))`;

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.ATTENDANCE,
      filterFormula
    );

    return records.map((record) => this.mapRecordToAttendance(record));
  }

  /**
   * Get attendance history for a specific member
   * 
   * @param memberId - The member's Airtable record ID
   * @returns Array of attendance records for the member
   */
  async getMemberAttendanceHistory(memberId: string): Promise<AttendanceRecord[]> {
    if (!memberId || !memberId.trim()) {
      throw new AttendanceError(
        AttendanceErrorCode.INVALID_INPUT,
        'Member ID is required'
      );
    }

    const filterFormula = `FIND('${memberId}', ARRAYJOIN({Member}))`;

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.ATTENDANCE,
      filterFormula,
      {
        sort: [{ field: 'Service', direction: 'desc' }],
      }
    );

    return records.map((record) => this.mapRecordToAttendance(record));
  }

  /**
   * Map Airtable record to AttendanceRecord interface
   */
  private mapRecordToAttendance(record: AirtableRecord): AttendanceRecord {
    const fields = record.fields;

    return {
      id: record.id,
      memberId: this.extractLinkedRecordId(fields['Member']) || '',
      serviceId: this.extractLinkedRecordId(fields['Service']) || '',
      present: (fields['Present?'] as boolean) || false,
      groupTag: (fields['Group Tag'] as string) || undefined,
      sourceForm: (fields['Source Form'] as SourceForm) || 'Manual',
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
}
