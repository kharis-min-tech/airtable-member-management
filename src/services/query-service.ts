/**
 * Query Service
 * Provides dashboard KPIs, attendance data, member journeys, and admin views
 * 
 * Requirements: 15.1-15.7, 16.1-16.6, 17.1-17.6, 18.1-18.7, 19.1-19.7
 */

import { AirtableClient, AIRTABLE_TABLES } from './airtable-client';
import { ParallelAirtableExecutor } from './parallel-airtable-executor';
import {
  Member,
  MemberStatus,
  MemberSource,
  FollowUpStatus,
  FollowUpAssignment,
  AssignmentStatus,
  ServiceKPIs,
  ServiceComparison,
  MemberJourney,
  TimelineEvent,
  JourneySummary,
  AirtableRecord,
} from '../types';

/**
 * Evangelism statistics for a period
 */
export interface EvangelismStats {
  period: 'week' | 'month';
  startDate: Date;
  endDate: Date;
  contactCount: number;
}

/**
 * Follow-up summary grouped by follow-up member
 */
export interface FollowUpSummary {
  byFollowUpMember: {
    followUpMemberId: string;
    followUpMemberName: string;
    assignedCount: number;
    members: { memberId: string; memberName: string; status: AssignmentStatus }[];
  }[];
  totalAssigned: number;
}

/**
 * Attendance breakdown by group
 */
export interface AttendanceBreakdown {
  serviceId: string;
  serviceName: string;
  totalAttendance: number;
  firstTimers: number;
  returners: number;
  evangelismContacts: number;
  departments: { departmentId: string; departmentName: string; count: number }[];
}

/**
 * Attendance category for drill-down
 */
export type AttendanceCategory = 'firstTimers' | 'returners' | 'members' | 'children' | 'evangelismContacts' | 'visitors' | 'department';

/**
 * Member details for drill-down view
 */
export interface DrillDownMember {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  status: string;
}

/**
 * Department attendance with percentage
 */
export interface DepartmentAttendance {
  serviceId: string;
  departmentId: string;
  departmentName: string;
  presentCount: number;
  activeMemberCount: number;
  attendancePercentage: number;
  belowThreshold: boolean;
}

/**
 * Follow-up interaction record
 */
export interface FollowUpInteraction {
  id: string;
  memberId: string;
  memberName: string;
  followUpMemberId: string;
  followUpMemberName: string;
  date: Date;
  comment: string;
}

/**
 * Evangelism record for admin views
 */
export interface EvangelismRecord {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  date: Date;
  dataCompleteness: number;
  capturedBy?: string;
}


/**
 * QueryService - Provides all query operations for the frontend
 */
export class QueryService {
  private readonly attendanceThreshold: number;
  private readonly parallelExecutor: ParallelAirtableExecutor;

  constructor(
    private readonly airtableClient: AirtableClient,
    config?: { attendanceThreshold?: number }
  ) {
    this.attendanceThreshold = config?.attendanceThreshold ?? 85;
    this.parallelExecutor = new ParallelAirtableExecutor(airtableClient, 5);
  }

  // ============================================
  // Dashboard KPI Queries (Requirements 15.1-15.7)
  // ============================================

  /**
   * Get KPIs for a specific service
   * Requirements: 15.1, 15.4, 15.7
   */
  async getServiceKPIs(serviceId: string): Promise<ServiceKPIs> {
    if (!serviceId) {
      throw new Error('Service ID is required');
    }

    // Get the service record to access linked attendance records
    const serviceRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceId);
    const attendanceIds = (serviceRecord.fields['Attendance'] as string[]) || [];

    // Fetch attendance records in parallel that are marked present
    const attendanceQueries = attendanceIds.map(attendanceId => 
      () => this.airtableClient.getRecord(AIRTABLE_TABLES.ATTENDANCE, attendanceId)
    );

    const attendanceResults = await this.parallelExecutor.executeParallelWithPartialFailure(attendanceQueries);
    const attendanceRecords = attendanceResults.filter(record => record.fields['Present?'] === true);

    // Get member details for each attendance record
    const memberIds = attendanceRecords
      .map(r => this.extractLinkedRecordId(r.fields['Member']))
      .filter((id): id is string => !!id);

    // Get unique member IDs
    const uniqueMemberIds = [...new Set(memberIds)];

    // eslint-disable-next-line no-console
    console.log(`Found ${uniqueMemberIds.length} unique member IDs from ${attendanceRecords.length} attendance records`);

    // Fetch member records to categorize
    const memberRecords = await this.getMembersByIds(uniqueMemberIds);

    // eslint-disable-next-line no-console
    console.log(`Successfully fetched ${memberRecords.length} member records out of ${uniqueMemberIds.length} IDs`);

    // If we're missing member records, log the missing IDs
    if (memberRecords.length < uniqueMemberIds.length) {
      const fetchedIds = new Set(memberRecords.map(r => r.id));
      const missingIds = uniqueMemberIds.filter(id => !fetchedIds.has(id));
      // eslint-disable-next-line no-console
      console.warn(`Missing ${missingIds.length} member records for IDs:`, missingIds);
    }

    // Categorize by status
    let firstTimersCount = 0;
    let returnersCount = 0;
    let membersCount = 0;
    let childrenCount = 0;
    let evangelismContactsCount = 0;
    let visitorsCount = 0;
    // Map to track department IDs to their counts
    const departmentCounts: Map<string, number> = new Map();

    for (const member of memberRecords) {
      const status = member.fields['Status'] as MemberStatus;
      const ageBracket = member.fields['Age Bracket'] as string | undefined;
      
      // Count children separately based on Age Bracket field
      if (ageBracket?.toLowerCase() === 'child') {
        childrenCount++;
      } else if (status === 'First Timer') {
        firstTimersCount++;
      } else if (status === 'Returner') {
        returnersCount++;
      } else if (status === 'Member') {
        membersCount++;
      } else if (status === 'Evangelism Contact') {
        evangelismContactsCount++;
      } else if (status === 'Visitor') {
        visitorsCount++;
      } else {
        // Count members with no status or unrecognized status as returners
        // This includes pastors and staff who may not have a standard status
        returnersCount++;
      }

      // Count department memberships - Member Departments field contains junction table record IDs
      // We need to look up each junction record to get the actual Department ID
      const memberDeptJunctionIds = member.fields['Member Departments'] as string[] | undefined;
      if (memberDeptJunctionIds) {
        // Fetch junction records in parallel
        const junctionQueries = memberDeptJunctionIds.map(junctionId =>
          () => this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBER_DEPARTMENTS, junctionId)
        );
        
        const junctionRecords = await this.parallelExecutor.executeParallelWithPartialFailure(junctionQueries);
        
        for (const junctionRecord of junctionRecords) {
          const deptId = this.extractLinkedRecordId(junctionRecord.fields['Department']);
          if (deptId) {
            departmentCounts.set(deptId, (departmentCounts.get(deptId) || 0) + 1);
          }
        }
      }
    }

    // Get department names in parallel
    const departmentBreakdown: { department: string; count: number }[] = [];
    const deptIds = Array.from(departmentCounts.keys());
    
    if (deptIds.length > 0) {
      const deptQueries = deptIds.map(deptId =>
        () => this.airtableClient.getRecord(AIRTABLE_TABLES.DEPARTMENTS, deptId)
          .then(deptRecord => ({
            deptId,
            deptName: (deptRecord.fields['Department Name'] as string) || deptId
          }))
          .catch(() => ({ deptId, deptName: deptId }))
      );
      
      const deptResults = await this.parallelExecutor.executeParallelWithPartialFailure(deptQueries);
      
      for (const { deptId, deptName } of deptResults) {
        const count = departmentCounts.get(deptId) || 0;
        departmentBreakdown.push({ department: deptName, count });
      }
    }

    return {
      totalAttendance: uniqueMemberIds.length,
      firstTimersCount,
      returnersCount,
      membersCount,
      childrenCount,
      evangelismContactsCount,
      visitorsCount,
      departmentBreakdown,
    };
  }

  /**
   * Get evangelism statistics for a period (week or month)
   * Requirements: 15.1, 15.2, 15.3
   * Week: Sunday to Saturday
   * Month: 1st to last day
   */
  async getEvangelismStats(period: 'week' | 'month'): Promise<EvangelismStats> {
    const { startDate, endDate } = this.calculatePeriodDates(period);

    const filterFormula = `AND(
      {Date} >= '${this.formatDate(startDate)}',
      {Date} <= '${this.formatDate(endDate)}'
    )`;

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.EVANGELISM,
      filterFormula
    );

    return {
      period,
      startDate,
      endDate,
      contactCount: records.length,
    };
  }

  /**
   * Get follow-up summary grouped by follow-up member
   * Requirements: 15.5, 15.6
   */
  async getFollowUpSummary(): Promise<FollowUpSummary> {
    // Get all active follow-up assignments
    const assignments = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      `OR({Status} = 'Assigned', {Status} = 'In Progress')`
    );

    // Group by follow-up member
    const byFollowUpMemberMap: Map<string, {
      followUpMemberId: string;
      followUpMemberName: string;
      members: { memberId: string; memberName: string; status: AssignmentStatus }[];
    }> = new Map();

    for (const assignment of assignments) {
      const followUpMemberId = this.extractLinkedRecordId(assignment.fields['Assigned To']);
      const memberId = this.extractLinkedRecordId(assignment.fields['Member']);
      const status = (assignment.fields['Status'] as AssignmentStatus) || 'Assigned';

      if (!followUpMemberId || !memberId) continue;

      if (!byFollowUpMemberMap.has(followUpMemberId)) {
        // Get follow-up member name
        let followUpMemberName = 'Unknown';
        try {
          const followUpMemberRecord = await this.airtableClient.getRecord(
            AIRTABLE_TABLES.MEMBERS,
            followUpMemberId
          );
          const fullName = followUpMemberRecord.fields['Full Name'] as string;
          const firstName = followUpMemberRecord.fields['First Name'] as string;
          const lastName = followUpMemberRecord.fields['Last Name'] as string;
          
          // Try Full Name first, then construct from First + Last, finally use ID
          if (fullName && fullName.trim()) {
            followUpMemberName = fullName.trim();
          } else if (firstName || lastName) {
            followUpMemberName = `${firstName || ''} ${lastName || ''}`.trim();
          } else {
            followUpMemberName = followUpMemberId;
          }
        } catch (error) {
          console.error(`Failed to fetch follow-up member name for ${followUpMemberId}:`, error);
          followUpMemberName = followUpMemberId;
        }

        byFollowUpMemberMap.set(followUpMemberId, {
          followUpMemberId,
          followUpMemberName,
          members: [],
        });
      }

      // Get member name
      let memberName = memberId;
      try {
        const memberRecord = await this.airtableClient.getRecord(
          AIRTABLE_TABLES.MEMBERS,
          memberId
        );
        memberName = (memberRecord.fields['Full Name'] as string) || 
          `${memberRecord.fields['First Name'] || ''} ${memberRecord.fields['Last Name'] || ''}`.trim() ||
          memberId;
      } catch {
        // Use ID if name lookup fails
      }

      byFollowUpMemberMap.get(followUpMemberId)!.members.push({
        memberId,
        memberName,
        status,
      });
    }

    const byFollowUpMember = Array.from(byFollowUpMemberMap.values()).map(v => ({
      ...v,
      assignedCount: v.members.length,
    }));

    return {
      byFollowUpMember,
      totalAssigned: assignments.length,
    };
  }

  /**
   * Get consolidated follow-up comments with date filter
   * Requirements: 15.6
   */
  async getFollowUpComments(startDate?: Date, endDate?: Date): Promise<FollowUpInteraction[]> {
    let filterFormula = '';
    
    if (startDate && endDate) {
      filterFormula = `AND(
        {Interaction Date} >= '${this.formatDate(startDate)}',
        {Interaction Date} <= '${this.formatDate(endDate)}'
      )`;
    } else if (startDate) {
      filterFormula = `{Interaction Date} >= '${this.formatDate(startDate)}'`;
    } else if (endDate) {
      filterFormula = `{Interaction Date} <= '${this.formatDate(endDate)}'`;
    }

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_INTERACTIONS,
      filterFormula || 'TRUE()',
      { sort: [{ field: 'Interaction Date', direction: 'desc' }] }
    );

    // Collect all unique member IDs to batch fetch
    const memberIds = new Set<string>();
    const recordData: Array<{
      record: AirtableRecord;
      memberId: string;
      followUpMemberId: string;
    }> = [];

    for (const record of records) {
      const memberId = this.extractLinkedRecordId(record.fields['Member']);
      const followUpMemberId = this.extractLinkedRecordId(record.fields['Follow Up Assignee']);

      if (!memberId) continue;

      memberIds.add(memberId);
      if (followUpMemberId) {
        memberIds.add(followUpMemberId);
      }

      recordData.push({ record, memberId, followUpMemberId: followUpMemberId || '' });
    }

    // Batch fetch all member names at once
    const memberNamesMap = new Map<string, string>();
    
    if (memberIds.size > 0) {
      try {
        // Fetch all members in one query using OR formula
        const memberIdArray = Array.from(memberIds);
        const orConditions = memberIdArray.map(id => `RECORD_ID() = '${id}'`).join(', ');
        const memberFormula = `OR(${orConditions})`;
        
        const memberRecords = await this.airtableClient.findRecords(
          AIRTABLE_TABLES.MEMBERS,
          memberFormula
        );

        // Build the name map
        for (const memberRecord of memberRecords) {
          const fullName = (memberRecord.fields['Full Name'] as string) || memberRecord.id;
          memberNamesMap.set(memberRecord.id, fullName);
        }
      } catch (error) {
        console.error('Failed to batch fetch member names:', error);
        // Continue with IDs as fallback
      }
    }

    // Build interactions with cached names
    const interactions: FollowUpInteraction[] = [];

    for (const { record, memberId, followUpMemberId } of recordData) {
      const memberName = memberNamesMap.get(memberId) || memberId;
      const followUpMemberName = followUpMemberId 
        ? (memberNamesMap.get(followUpMemberId) || followUpMemberId)
        : 'Unknown';

      interactions.push({
        id: record.id,
        memberId,
        memberName,
        followUpMemberId,
        followUpMemberName,
        date: this.parseDate(record.fields['Interaction Date'] as string) || new Date(),
        comment: (record.fields['Comments'] as string) || '',
      });
    }

    return interactions;
  }


  // ============================================
  // Attendance Explorer Queries (Requirements 16.1-16.6)
  // ============================================

  /**
   * Get attendance breakdown by group for a service
   * Requirements: 16.1, 16.2, 16.3
   */
  async getServiceAttendanceBreakdown(serviceId: string): Promise<AttendanceBreakdown> {
    if (!serviceId) {
      throw new Error('Service ID is required');
    }

    // Get service info and linked attendance records
    let serviceName = serviceId;
    let attendanceIds: string[] = [];
    try {
      const serviceRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceId);
      serviceName = (serviceRecord.fields['Service Code'] as string) || serviceId;
      attendanceIds = (serviceRecord.fields['Attendance'] as string[]) || [];
    } catch { /* use ID */ }

    // Fetch attendance records that are marked present
    const attendanceRecords: AirtableRecord[] = [];
    for (const attendanceId of attendanceIds) {
      try {
        const record = await this.airtableClient.getRecord(AIRTABLE_TABLES.ATTENDANCE, attendanceId);
        if (record.fields['Present?'] === true) {
          attendanceRecords.push(record);
        }
      } catch {
        // Skip if record not found
      }
    }

    const memberIds = attendanceRecords
      .map(r => this.extractLinkedRecordId(r.fields['Member']))
      .filter((id): id is string => !!id);

    const uniqueMemberIds = [...new Set(memberIds)];
    const memberRecords = await this.getMembersByIds(uniqueMemberIds);

    let firstTimers = 0;
    let returners = 0;
    let evangelismContacts = 0;
    const departmentCounts: Map<string, { id: string; name: string; count: number }> = new Map();

    for (const member of memberRecords) {
      const status = member.fields['Status'] as MemberStatus;

      if (status === 'First Timer') firstTimers++;
      else if (status === 'Returner') returners++;
      else if (status === 'Evangelism Contact') evangelismContacts++;

      // Get department memberships - Member Departments field contains junction table record IDs
      // We need to look up each junction record to get the actual Department ID
      const memberDeptJunctionIds = member.fields['Member Departments'] as string[] | undefined;
      if (memberDeptJunctionIds) {
        for (const junctionId of memberDeptJunctionIds) {
          try {
            // Get the junction record to find the actual department ID
            const junctionRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBER_DEPARTMENTS, junctionId);
            const deptId = this.extractLinkedRecordId(junctionRecord.fields['Department']);
            if (deptId && !departmentCounts.has(deptId)) {
              let deptName = deptId;
              try {
                const deptRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.DEPARTMENTS, deptId);
                deptName = (deptRecord.fields['Department Name'] as string) || deptId;
              } catch { /* use ID */ }
              departmentCounts.set(deptId, { id: deptId, name: deptName, count: 0 });
            }
            if (deptId) {
              departmentCounts.get(deptId)!.count++;
            }
          } catch { /* skip if junction record not found */ }
        }
      }
    }

    return {
      serviceId,
      serviceName,
      totalAttendance: uniqueMemberIds.length,
      firstTimers,
      returners,
      evangelismContacts,
      departments: Array.from(departmentCounts.values()).map(d => ({
        departmentId: d.id,
        departmentName: d.name,
        count: d.count,
      })),
    };
  }

  /**
   * Get attendees by category for drill-down view
   * Requirements: 3.2, 3.3
   * 
   * @param serviceId - The service ID to get attendees for
   * @param category - The attendance category (firstTimers, returners, evangelismContacts, department)
   * @param departmentId - Optional department ID when category is 'department'
   * @returns Array of DrillDownMember with id, fullName, phone, email, status
   */
  async getAttendeesByCategory(
    serviceId: string,
    category: AttendanceCategory,
    departmentId?: string
  ): Promise<DrillDownMember[]> {
    if (!serviceId) {
      throw new Error('Service ID is required');
    }

    if (category === 'department' && !departmentId) {
      throw new Error('Department ID is required when category is department');
    }

    // Get the service record to access linked attendance records
    const serviceRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceId);
    const attendanceIds = (serviceRecord.fields['Attendance'] as string[]) || [];

    // Fetch attendance records that are marked present
    const attendanceRecords: AirtableRecord[] = [];
    for (const attendanceId of attendanceIds) {
      try {
        const record = await this.airtableClient.getRecord(AIRTABLE_TABLES.ATTENDANCE, attendanceId);
        if (record.fields['Present?'] === true) {
          attendanceRecords.push(record);
        }
      } catch {
        // Skip if record not found
      }
    }

    const memberIds = attendanceRecords
      .map(r => this.extractLinkedRecordId(r.fields['Member']))
      .filter((id): id is string => !!id);

    const uniqueMemberIds = [...new Set(memberIds)];
    const memberRecords = await this.getMembersByIds(uniqueMemberIds);

    // Filter members by category
    let filteredMembers: AirtableRecord[] = [];

    if (category === 'firstTimers') {
      filteredMembers = memberRecords.filter(
        m => (m.fields['Status'] as MemberStatus) === 'First Timer'
      );
    } else if (category === 'returners') {
      filteredMembers = memberRecords.filter(
        m => (m.fields['Status'] as MemberStatus) === 'Returner'
      );
    } else if (category === 'members') {
      filteredMembers = memberRecords.filter(
        m => (m.fields['Status'] as MemberStatus) === 'Member'
      );
    } else if (category === 'children') {
      filteredMembers = memberRecords.filter(
        m => (m.fields['Age Bracket'] as string)?.toLowerCase() === 'child'
      );
    } else if (category === 'evangelismContacts') {
      filteredMembers = memberRecords.filter(
        m => (m.fields['Status'] as MemberStatus) === 'Evangelism Contact'
      );
    } else if (category === 'visitors') {
      filteredMembers = memberRecords.filter(
        m => (m.fields['Status'] as MemberStatus) === 'Visitor'
      );
    } else if (category === 'department' && departmentId) {
      filteredMembers = memberRecords.filter(m => {
        const memberDepts = m.fields['Member Departments'] as string[] | undefined;
        return memberDepts && memberDepts.includes(departmentId);
      });
    }

    // Map to DrillDownMember format
    return filteredMembers.map(m => this.mapRecordToDrillDownMember(m));
  }

  /**
   * Map Airtable record to DrillDownMember interface
   */
  private mapRecordToDrillDownMember(record: AirtableRecord): DrillDownMember {
    const fields = record.fields;

    return {
      id: record.id,
      fullName: (fields['Full Name'] as string) ||
        `${(fields['First Name'] as string) || ''} ${(fields['Last Name'] as string) || ''}`.trim(),
      phone: (fields['Phone'] as string) || undefined,
      email: (fields['Email'] as string) || undefined,
      status: (fields['Status'] as string) || 'Unknown',
    };
  }

  /**
   * Get department attendance with percentage calculation
   * Requirements: 16.4, 16.5, 16.6
   * 
   * Percentage = (present members in department for service / active members in department) × 100
   */
  async getDepartmentAttendance(serviceId: string): Promise<DepartmentAttendance[]> {
    if (!serviceId) {
      throw new Error('Service ID is required');
    }

    // Get the service record to access linked attendance records
    const serviceRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceId);
    const attendanceIds = (serviceRecord.fields['Attendance'] as string[]) || [];

    // Fetch all attendance records for this service
    const serviceAttendanceRecords: AirtableRecord[] = [];
    for (const attendanceId of attendanceIds) {
      try {
        const record = await this.airtableClient.getRecord(AIRTABLE_TABLES.ATTENDANCE, attendanceId);
        if (record.fields['Present?'] === true) {
          serviceAttendanceRecords.push(record);
        }
      } catch {
        // Skip if record not found
      }
    }

    // Build a set of member IDs who attended this service
    const attendedMemberIds = new Set(
      serviceAttendanceRecords
        .map(r => this.extractLinkedRecordId(r.fields['Member']))
        .filter((id): id is string => !!id)
    );

    // Get all departments
    const departments = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.DEPARTMENTS,
      'TRUE()'
    );

    // Get all active member department records
    const allActiveMemberDepts = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.MEMBER_DEPARTMENTS,
      `{Active} = TRUE()`
    );

    // Group member IDs by department
    const deptMemberMap: Map<string, string[]> = new Map();
    for (const md of allActiveMemberDepts) {
      const deptId = this.extractLinkedRecordId(md.fields['Department']);
      const memberId = this.extractLinkedRecordId(md.fields['Member']);
      
      if (deptId && memberId) {
        if (!deptMemberMap.has(deptId)) {
          deptMemberMap.set(deptId, []);
        }
        deptMemberMap.get(deptId)!.push(memberId);
      }
    }

    const results: DepartmentAttendance[] = [];

    for (const dept of departments) {
      const deptId = dept.id;
      const deptName = (dept.fields['Department Name'] as string) || (dept.fields['Name'] as string) || deptId;

      const activeMemberIds = deptMemberMap.get(deptId) || [];
      const activeMemberCount = activeMemberIds.length;

      // Count how many of these members attended
      let presentCount = 0;
      for (const memberId of activeMemberIds) {
        if (attendedMemberIds.has(memberId)) {
          presentCount++;
        }
      }

      const attendancePercentage = activeMemberCount > 0
        ? (presentCount / activeMemberCount) * 100
        : 0;

      results.push({
        serviceId,
        departmentId: deptId,
        departmentName: deptName,
        presentCount,
        activeMemberCount,
        attendancePercentage,
        belowThreshold: attendancePercentage < this.attendanceThreshold,
      });
    }

    return results;
  }

  // ============================================
  // Service Comparison Queries (Requirements 17.1-17.6)
  // ============================================

  /**
   * Compare attendance between two services (unidirectional)
   * Returns only members present in reference service (A) but missing from comparison service (B)
   * Requirements: 5.2, 5.3
   */
  async compareTwoServices(referenceServiceId: string, comparisonServiceId: string): Promise<ServiceComparison> {
    if (!referenceServiceId || !comparisonServiceId) {
      throw new Error('Both service IDs are required');
    }

    // Get service info and linked attendance records
    const [referenceServiceRecord, comparisonServiceRecord] = await Promise.all([
      this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, referenceServiceId),
      this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, comparisonServiceId),
    ]);

    const serviceA = {
      id: referenceServiceId,
      name: (referenceServiceRecord.fields['Service Code'] as string) || referenceServiceId,
    };

    const serviceB = {
      id: comparisonServiceId,
      name: (comparisonServiceRecord.fields['Service Code'] as string) || comparisonServiceId,
    };

    // Get attendance IDs from service records
    const attendanceIdsRef = (referenceServiceRecord.fields['Attendance'] as string[]) || [];
    const attendanceIdsComp = (comparisonServiceRecord.fields['Attendance'] as string[]) || [];

    // Fetch attendance records for reference service
    const attendanceRef: AirtableRecord[] = [];
    for (const id of attendanceIdsRef) {
      try {
        const record = await this.airtableClient.getRecord(AIRTABLE_TABLES.ATTENDANCE, id);
        if (record.fields['Present?'] === true) {
          attendanceRef.push(record);
        }
      } catch { /* skip */ }
    }

    // Fetch attendance records for comparison service
    const attendanceComp: AirtableRecord[] = [];
    for (const id of attendanceIdsComp) {
      try {
        const record = await this.airtableClient.getRecord(AIRTABLE_TABLES.ATTENDANCE, id);
        if (record.fields['Present?'] === true) {
          attendanceComp.push(record);
        }
      } catch { /* skip */ }
    }

    const memberIdsRef = new Set(
      attendanceRef
        .map(r => this.extractLinkedRecordId(r.fields['Member']))
        .filter((id): id is string => !!id)
    );

    const memberIdsComp = new Set(
      attendanceComp
        .map(r => this.extractLinkedRecordId(r.fields['Member']))
        .filter((id): id is string => !!id)
    );

    // Find members in reference service but not in comparison service (unidirectional)
    const missingMemberIds = [...memberIdsRef].filter(id => !memberIdsComp.has(id));

    // Get member details
    const missingMemberRecords = await this.getMembersByIds(missingMemberIds);

    return {
      serviceA,
      serviceB,
      presentInAMissingInB: missingMemberRecords.map(r => this.mapRecordToMember(r)),
    };
  }


  // ============================================
  // Member Journey Queries (Requirements 18.1-18.7)
  // ============================================

  /**
   * Get complete member journey with timeline
   * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
   * 
   * Includes comprehensive error handling for Airtable API errors:
   * - Permission errors are caught and re-thrown with user-friendly messages
   * - Linked record errors are handled gracefully (timeline continues building)
   * - All errors are logged for debugging
   */
  async getMemberJourney(memberId: string): Promise<MemberJourney> {
    if (!memberId) {
      throw new Error('Member ID is required');
    }

    // Get member record - this is critical, so we throw a user-friendly error if it fails
    let memberRecord: AirtableRecord;
    try {
      memberRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBERS, memberId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[getMemberJourney] Failed to fetch member record for ${memberId}:`, errorMessage);
      
      // Check for permission/not found errors and provide user-friendly messages
      if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('not found')) {
        throw new Error(`Member not found: The member with ID "${memberId}" does not exist or has been removed.`);
      }
      if (errorMessage.includes('permission') || errorMessage.includes('INVALID_PERMISSIONS') || errorMessage.includes('Invalid permissions')) {
        throw new Error('Unable to access member data. Please check that the Airtable API key has the correct permissions.');
      }
      if (errorMessage.includes('AUTHENTICATION') || errorMessage.includes('authentication')) {
        throw new Error('Authentication failed. Please verify your Airtable API key is valid.');
      }
      // Generic error with original message for debugging
      throw new Error(`Unable to load member journey: ${errorMessage}`);
    }

    const member = this.mapRecordToMember(memberRecord);

    // Build timeline from multiple sources in parallel
    // Each source is wrapped in try-catch to allow partial data retrieval
    const timeline: TimelineEvent[] = [];

    // Fetch all timeline data sources in parallel
    const [
      evangelismRecords,
      firstTimerRecords,
      attendanceRecords,
      homeVisitRecords,
      followUpRecords,
      memberDeptRecords
    ] = await Promise.all([
      // 1. Evangelism events
      (async () => {
        try {
          const evangelismIds = (memberRecord.fields['Evangelism'] as string[]) || [];
          if (evangelismIds.length === 0) return [];
          
          const queries = evangelismIds.map(id => 
            () => this.airtableClient.getRecord(AIRTABLE_TABLES.EVANGELISM, id)
          );
          return await this.parallelExecutor.executeParallelWithPartialFailure(queries);
        } catch (error) {
          console.error(`[getMemberJourney] Failed to fetch evangelism records for ${memberId}:`, error instanceof Error ? error.message : error);
          return [];
        }
      })(),
      
      // 2. First Timer registration
      (async () => {
        try {
          const firstTimerIds = (memberRecord.fields['First Timers Register'] as string[]) || [];
          if (firstTimerIds.length === 0) return [];
          
          const queries = firstTimerIds.map(id =>
            () => this.airtableClient.getRecord(AIRTABLE_TABLES.FIRST_TIMERS_REGISTER, id)
          );
          return await this.parallelExecutor.executeParallelWithPartialFailure(queries);
        } catch (error) {
          console.error(`[getMemberJourney] Failed to fetch first timer records for ${memberId}:`, error instanceof Error ? error.message : error);
          return [];
        }
      })(),
      
      // 3. Attendance records
      (async () => {
        try {
          const attendanceIds = (memberRecord.fields['Attendance'] as string[]) || [];
          if (attendanceIds.length === 0) return [];
          
          const queries = attendanceIds.map(id =>
            () => this.airtableClient.getRecord(AIRTABLE_TABLES.ATTENDANCE, id)
          );
          return await this.parallelExecutor.executeParallelWithPartialFailure(queries);
        } catch (error) {
          console.error(`[getMemberJourney] Failed to fetch attendance records for ${memberId}:`, error instanceof Error ? error.message : error);
          return [];
        }
      })(),
      
      // 4. Home visits
      (async () => {
        try {
          const homeVisitIds = (memberRecord.fields['Visits Received'] as string[]) || [];
          if (homeVisitIds.length === 0) return [];
          
          const queries = homeVisitIds.map(id =>
            () => this.airtableClient.getRecord(AIRTABLE_TABLES.HOME_VISITS, id)
          );
          return await this.parallelExecutor.executeParallelWithPartialFailure(queries);
        } catch (error) {
          console.error(`[getMemberJourney] Failed to fetch home visit records for ${memberId}:`, error instanceof Error ? error.message : error);
          return [];
        }
      })(),
      
      // 5. Follow-up interactions
      (async () => {
        try {
          const followUpIds = (memberRecord.fields['Follow-up Interactions'] as string[]) || [];
          if (followUpIds.length === 0) return [];
          
          const queries = followUpIds.map(id =>
            () => this.airtableClient.getRecord(AIRTABLE_TABLES.FOLLOW_UP_INTERACTIONS, id)
          );
          return await this.parallelExecutor.executeParallelWithPartialFailure(queries);
        } catch (error) {
          console.error(`[getMemberJourney] Failed to fetch follow-up records for ${memberId}:`, error instanceof Error ? error.message : error);
          return [];
        }
      })(),
      
      // 6. Department joins
      (async () => {
        try {
          const memberDeptIds = (memberRecord.fields['Member Departments'] as string[]) || [];
          if (memberDeptIds.length === 0) return [];
          
          const queries = memberDeptIds.map(id =>
            () => this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBER_DEPARTMENTS, id)
          );
          return await this.parallelExecutor.executeParallelWithPartialFailure(queries);
        } catch (error) {
          console.error(`[getMemberJourney] Failed to fetch department records for ${memberId}:`, error instanceof Error ? error.message : error);
          return [];
        }
      })()
    ]);

    // Process evangelism events
    for (const record of evangelismRecords) {
      const date = this.parseDate(record.fields['Date'] as string);
      if (date) {
        timeline.push({
          date,
          type: 'evangelism',
          title: 'Evangelism Contact',
          description: `First contacted through evangelism`,
          metadata: {
            recordId: record.id,
            capturedBy: this.extractLinkedRecordId(record.fields['Captured By']),
          },
        });
      }
    }

    // Process first timer registrations
    for (const record of firstTimerRecords) {
      const date = this.parseDate(record.fields['Date'] as string) || 
                   this.parseDate(record.createdTime);
      if (date) {
        timeline.push({
          date,
          type: 'first_timer',
          title: 'First Timer Registration',
          description: 'Registered as a first-time visitor',
          metadata: { recordId: record.id },
        });
      }
    }

    // Process attendance records - fetch service details in parallel
    const presentAttendance = attendanceRecords.filter(record => record.fields['Present?'] === true);
    const serviceIds = presentAttendance
      .map(r => this.extractLinkedRecordId(r.fields['Service']))
      .filter((id): id is string => !!id);
    
    if (serviceIds.length > 0) {
      const serviceQueries = serviceIds.map(serviceId =>
        () => this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceId)
          .then(serviceRecord => ({
            serviceId,
            serviceDate: this.parseDate(serviceRecord.fields['Service Date'] as string),
            serviceName: (serviceRecord.fields['Service Code'] as string) || 'Service'
          }))
          .catch(() => null)
      );
      
      const serviceResults = await this.parallelExecutor.executeParallelWithPartialFailure(serviceQueries);
      const serviceMap = new Map(
        serviceResults.filter((s): s is NonNullable<typeof s> => s !== null)
          .map(s => [s.serviceId, s])
      );
      
      for (const record of presentAttendance) {
        const serviceId = this.extractLinkedRecordId(record.fields['Service']);
        if (serviceId) {
          const serviceInfo = serviceMap.get(serviceId);
          if (serviceInfo?.serviceDate) {
            timeline.push({
              date: serviceInfo.serviceDate,
              type: 'attendance',
              title: 'Service Attendance',
              description: `Attended ${serviceInfo.serviceName}`,
              metadata: { serviceId, recordId: record.id },
            });
          }
        }
      }
    }

    // Process home visits - fetch visitor names in parallel
    const visitorIds = homeVisitRecords
      .map(r => this.extractLinkedRecordId(r.fields['Conducted By?']))
      .filter((id): id is string => !!id);
    
    const visitorMap = new Map<string, string>();
    if (visitorIds.length > 0) {
      const visitorQueries = visitorIds.map(visitorId =>
        () => this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBERS, visitorId)
          .then(visitorRecord => ({
            visitorId,
            visitorName: (visitorRecord.fields['Full Name'] as string) || visitorId
          }))
          .catch(() => ({ visitorId, visitorName: 'Unknown' }))
      );
      
      const visitorResults = await this.parallelExecutor.executeParallelWithPartialFailure(visitorQueries);
      for (const { visitorId, visitorName } of visitorResults) {
        visitorMap.set(visitorId, visitorName);
      }
    }
    
    for (const record of homeVisitRecords) {
      const date = this.parseDate(record.fields['Visit Date'] as string);
      const visitorId = this.extractLinkedRecordId(record.fields['Conducted By?']);
      const visitorName = visitorId ? (visitorMap.get(visitorId) || 'Unknown') : 'Unknown';

      if (date) {
        timeline.push({
          date,
          type: 'home_visit',
          title: 'Home Visit',
          description: `Visited by ${visitorName}`,
          metadata: { recordId: record.id, visitorId, visitorName },
        });
      }
    }

    // Process follow-up interactions
    for (const record of followUpRecords) {
      const date = this.parseDate(record.fields['Interaction Date'] as string);
      if (date) {
        timeline.push({
          date,
          type: 'follow_up',
          title: 'Follow-up Interaction',
          description: `Follow-up interaction`,
          metadata: {
            recordId: record.id,
            comment: record.fields['Comments'] as string,
            type: record.fields['Type'] as string,
          },
        });
      }
    }

    // Process department joins - fetch department names in parallel
    const deptIds = memberDeptRecords
      .map(r => this.extractLinkedRecordId(r.fields['Department']))
      .filter((id): id is string => !!id);
    
    const deptMap = new Map<string, string>();
    if (deptIds.length > 0) {
      const deptQueries = deptIds.map(deptId =>
        () => this.airtableClient.getRecord(AIRTABLE_TABLES.DEPARTMENTS, deptId)
          .then(deptRecord => ({
            deptId,
            deptName: (deptRecord.fields['Department Name'] as string) || deptId
          }))
          .catch(() => ({ deptId, deptName: 'Unknown Department' }))
      );
      
      const deptResults = await this.parallelExecutor.executeParallelWithPartialFailure(deptQueries);
      for (const { deptId, deptName } of deptResults) {
        deptMap.set(deptId, deptName);
      }
    }
    
    for (const record of memberDeptRecords) {
      const date = this.parseDate(record.fields['Sign Up Date'] as string) ||
                   this.parseDate(record.createdTime);
      const deptId = this.extractLinkedRecordId(record.fields['Department']);
      const deptName = deptId ? (deptMap.get(deptId) || 'Unknown Department') : 'Unknown Department';

      if (date) {
        timeline.push({
          date,
          type: 'department_join',
          title: 'Department Join',
          description: `Joined ${deptName}`,
          metadata: { recordId: record.id, departmentId: deptId, departmentName: deptName },
        });
      }
    }

    // 7. Program sessions
    try {
      const programRecords = await this.airtableClient.findRecords(
        AIRTABLE_TABLES.MEMBER_PROGRAMS,
        `FIND('${memberId}', ARRAYJOIN({Member}))`
      );

      for (const record of programRecords) {
        const programName = (record.fields['Program Name'] as string) || 'Program';

        // Check each session
        for (let i = 1; i <= 4; i++) {
          const sessionCompleted = record.fields[`Session ${i} Completed`] as boolean;
          const sessionDate = this.parseDate(record.fields[`Session ${i} Date`] as string);

          if (sessionCompleted && sessionDate) {
            timeline.push({
              date: sessionDate,
              type: 'program_session',
              title: `${programName} - Session ${i}`,
              description: `Completed session ${i} of ${programName}`,
              metadata: { recordId: record.id, session: i, programName },
            });
          }
        }
      }
    } catch (error) {
      console.error(`[getMemberJourney] Failed to fetch program records for ${memberId}:`, error instanceof Error ? error.message : error);
      // Continue building timeline with other sources
    }

    // 8. Water baptism
    const waterBaptized = memberRecord.fields['Water Baptized'] as boolean;
    const waterBaptismDate = this.parseDate(memberRecord.fields['Water Baptism Date'] as string);

    if (waterBaptized && waterBaptismDate) {
      timeline.push({
        date: waterBaptismDate,
        type: 'water_baptism',
        title: 'Water Baptism',
        description: 'Baptized in water',
        metadata: {},
      });
    }

    // 9. Membership completed
    const membershipCompleted = this.parseDate(memberRecord.fields['Membership Completed'] as string);

    if (membershipCompleted) {
      timeline.push({
        date: membershipCompleted,
        type: 'membership_completed',
        title: 'Membership Completed',
        description: 'Completed membership requirements',
        metadata: {},
      });
    }

    // 10. Spiritual maturity completed
    const spiritualMaturity = this.parseDate(memberRecord.fields['Spiritual Maturity Completed'] as string);

    if (spiritualMaturity) {
      timeline.push({
        date: spiritualMaturity,
        type: 'spiritual_maturity',
        title: 'Spiritual Maturity Completed',
        description: 'Completed spiritual maturity program',
        metadata: {},
      });
    }

    // Sort timeline chronologically (oldest first)
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Build summary
    const summary = this.buildJourneySummary(member, memberRecord, timeline);

    return {
      member,
      timeline,
      summary,
    };
  }

  /**
   * Search members by name, phone, or email
   * Requirements: 18.7
   */
  async searchMembers(query: string): Promise<Member[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    // Search by name, phone, or email
    const filterFormula = `OR(
      FIND('${searchTerm}', LOWER({Full Name})),
      FIND('${searchTerm}', LOWER({First Name})),
      FIND('${searchTerm}', LOWER({Last Name})),
      FIND('${searchTerm}', {Phone}),
      FIND('${searchTerm}', LOWER({Email}))
    )`;

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.MEMBERS,
      filterFormula,
      { maxRecords: 50 }
    );

    return records.map(r => this.mapRecordToMember(r));
  }


  // ============================================
  // Admin Quick View Queries (Requirements 19.1-19.7)
  // ============================================

  /**
   * Get today's follow-ups due
   * Requirements: 19.1
   */
  async getTodaysFollowUps(): Promise<FollowUpAssignment[]> {
    const today = this.formatDate(new Date());

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      `AND({Due Date} = '${today}', {Status} != 'Completed')`
    );

    return records.map(r => this.mapRecordToAssignment(r));
  }

  /**
   * Get new first timers from the last N days
   * Requirements: 19.2
   */
  async getNewFirstTimers(days: number = 30): Promise<Member[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const filterFormula = `AND(
      {Status} = 'First Timer',
      {Date First Captured} >= '${this.formatDate(startDate)}'
    )`;

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.MEMBERS,
      filterFormula,
      { sort: [{ field: 'Date First Captured', direction: 'desc' }] }
    );

    return records.map(r => this.mapRecordToMember(r));
  }

  /**
   * Get evangelism records with incomplete data
   * Requirements: 19.3
   */
  async getIncompleteEvangelismRecords(): Promise<EvangelismRecord[]> {
    // Data Completeness < 100 indicates missing required fields
    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.EVANGELISM,
      `{Data Completeness} < 100`
    );

    return records.map(r => ({
      id: r.id,
      firstName: (r.fields['First Name'] as string) || '',
      lastName: (r.fields['Last Name'] as string) || '',
      phone: (r.fields['Phone'] as string) || undefined,
      email: (r.fields['Email'] as string) || undefined,
      date: this.parseDate(r.fields['Date'] as string) || new Date(),
      dataCompleteness: (r.fields['Data Completeness'] as number) || 0,
      capturedBy: this.extractLinkedRecordId(r.fields['Captured By']),
    }));
  }

  /**
   * Get members without a follow-up owner assigned
   * Requirements: 19.4
   */
  async getUnassignedMembers(): Promise<Member[]> {
    const filterFormula = `AND(
      {Follow-up Owner} = BLANK(),
      OR({Status} = 'Evangelism Contact', {Status} = 'First Timer')
    )`;

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.MEMBERS,
      filterFormula
    );

    return records.map(r => this.mapRecordToMember(r));
  }

  /**
   * Get visited members with last visited date
   * Requirements: 19.5
   */
  async getVisitedMembers(): Promise<{ member: Member; lastVisited: Date }[]> {
    const filterFormula = `{Visited?} = TRUE()`;

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.MEMBERS,
      filterFormula,
      { sort: [{ field: 'Last Visited', direction: 'desc' }] }
    );

    return records.map(r => ({
      member: this.mapRecordToMember(r),
      lastVisited: this.parseDate(r.fields['Last Visited'] as string) || new Date(),
    }));
  }

  /**
   * Get department membership lists (active members grouped by department)
   * Requirements: 19.6
   */
  async getDepartmentRosters(): Promise<{ departmentId: string; departmentName: string; members: Member[] }[]> {
    // Get all departments first
    const departments = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.DEPARTMENTS,
      'TRUE()'
    );

    // Create a map of department ID to name
    const deptNameMap: Map<string, string> = new Map();
    for (const dept of departments) {
      deptNameMap.set(dept.id, (dept.fields['Department Name'] as string) || dept.id);
    }

    // Get all active member department records
    const allMemberDepts = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.MEMBER_DEPARTMENTS,
      `{Active} = TRUE()`
    );

    // Group member IDs by department
    const deptMemberMap: Map<string, string[]> = new Map();
    
    for (const md of allMemberDepts) {
      const deptId = this.extractLinkedRecordId(md.fields['Department']);
      const memberId = this.extractLinkedRecordId(md.fields['Member']);
      
      if (deptId && memberId) {
        if (!deptMemberMap.has(deptId)) {
          deptMemberMap.set(deptId, []);
        }
        deptMemberMap.get(deptId)!.push(memberId);
      }
    }

    // Build rosters for all departments (including those with 0 members)
    const rosters: { departmentId: string; departmentName: string; members: Member[] }[] = [];

    for (const dept of departments) {
      const deptId = dept.id;
      const deptName = deptNameMap.get(deptId) || deptId;
      const memberIds = deptMemberMap.get(deptId) || [];

      const memberRecords = await this.getMembersByIds(memberIds);
      const members = memberRecords.map(r => this.mapRecordToMember(r));

      rosters.push({
        departmentId: deptId,
        departmentName: deptName,
        members,
      });
    }

    return rosters;
  }

  /**
   * Get a single department roster by ID
   * Requirements: 19.6
   */
  async getDepartmentRoster(departmentId: string): Promise<Member[]> {
    if (!departmentId) {
      throw new Error('Department ID is required');
    }

    // Get all active member department records and filter by department
    const allMemberDepts = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.MEMBER_DEPARTMENTS,
      `{Active} = TRUE()`
    );

    // Filter to only those in this department
    const memberIds: string[] = [];
    for (const md of allMemberDepts) {
      const deptId = this.extractLinkedRecordId(md.fields['Department']);
      const memberId = this.extractLinkedRecordId(md.fields['Member']);
      
      if (deptId === departmentId && memberId) {
        memberIds.push(memberId);
      }
    }

    const memberRecords = await this.getMembersByIds(memberIds);
    return memberRecords.map(r => this.mapRecordToMember(r));
  }

  /**
   * Get service by ID
   */
  async getServiceById(serviceId: string): Promise<{
    id: string;
    serviceName: string;
    serviceDate: Date | null;
    serviceCode: string;
  } | null> {
    if (!serviceId) {
      throw new Error('Service ID is required');
    }

    try {
      const record = await this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceId);
      return {
        id: record.id,
        serviceName: (record.fields['Service Code'] as string) || '',
        serviceDate: this.parseDate(record.fields['Service Date'] as string),
        serviceCode: (record.fields['Service Type'] as string) || '',
      };
    } catch {
      return null;
    }
  }

  /**
   * Get recent services with optional limit
   * Requirements: 2.1, 2.5
   * @param limit - Optional limit on number of services returned. If undefined, returns all services.
   */
  async getRecentServices(limit?: number): Promise<{
    id: string;
    serviceName: string;
    serviceDate: Date | null;
    serviceCode: string;
  }[]> {
    const options: { sort: { field: string; direction: 'asc' | 'desc' }[]; maxRecords?: number } = {
      sort: [{ field: 'Service Date', direction: 'desc' }],
    };
    
    if (limit !== undefined) {
      options.maxRecords = limit;
    }

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.SERVICES,
      'TRUE()',
      options
    );

    return records.map(record => ({
      id: record.id,
      serviceName: (record.fields['Service Code'] as string) || '',
      serviceDate: this.parseDate(record.fields['Service Date'] as string),
      serviceCode: (record.fields['Service Type'] as string) || '',
    }));
  }

  /**
   * Get all services without any limit
   * Requirements: 2.1, 2.5
   * Services are sorted by date in descending order (most recent first)
   */
  async getAllServices(): Promise<{
    id: string;
    serviceName: string;
    serviceDate: Date | null;
    serviceCode: string;
  }[]> {
    return this.getRecentServices(undefined);
  }

  /**
   * Get services within a date range
   * Requirements: 2.3
   * @param startDate - Start date of the range (inclusive)
   * @param endDate - End date of the range (inclusive)
   */
  async getServicesByDateRange(startDate: Date, endDate: Date): Promise<{
    id: string;
    serviceName: string;
    serviceDate: Date | null;
    serviceCode: string;
  }[]> {
    const filterFormula = `AND(
      {Service Date} >= '${this.formatDate(startDate)}',
      {Service Date} <= '${this.formatDate(endDate)}'
    )`;

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.SERVICES,
      filterFormula,
      { sort: [{ field: 'Service Date', direction: 'desc' }] }
    );

    return records.map(record => ({
      id: record.id,
      serviceName: (record.fields['Service Code'] as string) || '',
      serviceDate: this.parseDate(record.fields['Service Date'] as string),
      serviceCode: (record.fields['Service Type'] as string) || '',
    }));
  }

  /**
   * Search services by name or date
   * Requirements: 2.4
   * @param query - Search query string (case-insensitive)
   */
  async searchServices(query: string): Promise<{
    id: string;
    serviceName: string;
    serviceDate: Date | null;
    serviceCode: string;
  }[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    // Search by service name or date
    const filterFormula = `OR(
      FIND('${searchTerm}', LOWER({Service Code})),
      FIND('${searchTerm}', {Service Date})
    )`;

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.SERVICES,
      filterFormula,
      { sort: [{ field: 'Service Date', direction: 'desc' }] }
    );

    return records.map(record => ({
      id: record.id,
      serviceName: (record.fields['Service Code'] as string) || '',
      serviceDate: this.parseDate(record.fields['Service Date'] as string),
      serviceCode: (record.fields['Service Type'] as string) || '',
    }));
  }

  /**
   * Get attendees for a service
   */
  async getServiceAttendees(serviceId: string): Promise<Member[]> {
    if (!serviceId) {
      throw new Error('Service ID is required');
    }

    // Get the service record to access linked attendance records
    const serviceRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceId);
    const attendanceIds = (serviceRecord.fields['Attendance'] as string[]) || [];

    // Fetch attendance records that are marked present
    const attendanceRecords: AirtableRecord[] = [];
    for (const attendanceId of attendanceIds) {
      try {
        const record = await this.airtableClient.getRecord(AIRTABLE_TABLES.ATTENDANCE, attendanceId);
        if (record.fields['Present?'] === true) {
          attendanceRecords.push(record);
        }
      } catch {
        // Skip if record not found
      }
    }

    const memberIds = attendanceRecords
      .map(r => this.extractLinkedRecordId(r.fields['Member']))
      .filter((id): id is string => !!id);

    const uniqueMemberIds = [...new Set(memberIds)];
    const memberRecords = await this.getMembersByIds(uniqueMemberIds);
    return memberRecords.map(r => this.mapRecordToMember(r));
  }

  /**
   * Get member by ID
   */
  async getMemberById(memberId: string): Promise<Member | null> {
    if (!memberId) {
      throw new Error('Member ID is required');
    }

    try {
      const record = await this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBERS, memberId);
      return this.mapRecordToMember(record);
    } catch {
      return null;
    }
  }

  /**
   * Get follow-ups assigned to a follow-up member
   */
  async getFollowUpsByFollowUpMember(followUpMemberId: string): Promise<FollowUpAssignment[]> {
    if (!followUpMemberId) {
      throw new Error('Follow-up member ID is required');
    }

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      `FIND('${followUpMemberId}', ARRAYJOIN({Assigned To}))`
    );

    return records.map(r => this.mapRecordToAssignment(r));
  }

  /**
   * Get souls assigned grouped by follow-up member (evangelism contacts)
   */
  async getSoulsAssignedByFollowUpMember(): Promise<{
    followUpMemberId: string;
    followUpMemberName: string;
    members: {
      id: string;
      name: string;
      status: MemberStatus;
      phone?: string;
      assignedDate: Date;
    }[];
  }[]> {
    // Get all evangelism records with a Soul Winner assigned
    const evangelismRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.EVANGELISM,
      `{Soul Winner} != BLANK()`
    );

    // Group by follow-up member with member IDs and their evangelism dates
    const byFollowUpMemberMap: Map<string, { 
      followUpMemberId: string; 
      followUpMemberName: string; 
      memberData: Map<string, Date>; // memberId -> evangelism date
    }> = new Map();

    for (const record of evangelismRecords) {
      const followUpMemberId = this.extractLinkedRecordId(record.fields['Soul Winner']);
      const memberId = this.extractLinkedRecordId(record.fields['Linked Member']);
      const evangelismDate = this.parseDate(record.fields['Date'] as string) || new Date();

      if (!followUpMemberId) continue;

      if (!byFollowUpMemberMap.has(followUpMemberId)) {
        let followUpMemberName = 'Unknown';
        try {
          // Soul Winner field links to Members table
          const memberRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBERS, followUpMemberId);
          const fullName = memberRecord.fields['Full Name'] as string;
          const firstName = memberRecord.fields['First Name'] as string;
          const lastName = memberRecord.fields['Last Name'] as string;
          
          // Try Full Name first, then construct from First + Last, finally use ID
          if (fullName && fullName.trim()) {
            followUpMemberName = fullName.trim();
          } else if (firstName || lastName) {
            followUpMemberName = `${firstName || ''} ${lastName || ''}`.trim();
          } else {
            followUpMemberName = followUpMemberId;
          }
        } catch (error) {
          console.error(`Failed to fetch soul winner name for ${followUpMemberId}:`, error);
          followUpMemberName = followUpMemberId;
        }

        byFollowUpMemberMap.set(followUpMemberId, { followUpMemberId, followUpMemberName, memberData: new Map() });
      }

      if (memberId) {
        byFollowUpMemberMap.get(followUpMemberId)!.memberData.set(memberId, evangelismDate);
      }
    }

    // Fetch member details and build response
    const results: {
      followUpMemberId: string;
      followUpMemberName: string;
      members: {
        id: string;
        name: string;
        status: MemberStatus;
        phone?: string;
        assignedDate: Date;
      }[];
    }[] = [];

    for (const [, data] of byFollowUpMemberMap) {
      const memberIds = Array.from(data.memberData.keys());
      const memberRecords = await this.getMembersByIds(memberIds);
      
      const members = memberRecords.map(r => {
        const member = this.mapRecordToMember(r);
        return {
          id: member.id,
          name: member.fullName,
          status: member.status,
          phone: member.phone,
          assignedDate: data.memberData.get(member.id) || new Date(),
        };
      });

      results.push({
        followUpMemberId: data.followUpMemberId,
        followUpMemberName: data.followUpMemberName,
        members,
      });
    }

    return results;
  }

  /**
   * Get attendance by service grouped by department
   * Requirements: 19.7
   */
  async getAttendanceByServiceGroupedByDepartment(serviceId: string): Promise<{
    serviceId: string;
    serviceName: string;
    departments: { departmentId: string; departmentName: string; attendees: Member[] }[];
  }> {
    if (!serviceId) {
      throw new Error('Service ID is required');
    }

    // Get service info and linked attendance records
    let serviceName = serviceId;
    let attendanceIds: string[] = [];
    try {
      const serviceRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceId);
      serviceName = (serviceRecord.fields['Service Code'] as string) || serviceId;
      attendanceIds = (serviceRecord.fields['Attendance'] as string[]) || [];
    } catch { /* use ID */ }

    // Fetch attendance records that are marked present
    const attendanceRecords: AirtableRecord[] = [];
    for (const attendanceId of attendanceIds) {
      try {
        const record = await this.airtableClient.getRecord(AIRTABLE_TABLES.ATTENDANCE, attendanceId);
        if (record.fields['Present?'] === true) {
          attendanceRecords.push(record);
        }
      } catch {
        // Skip if record not found
      }
    }

    const memberIds = attendanceRecords
      .map(r => this.extractLinkedRecordId(r.fields['Member']))
      .filter((id): id is string => !!id);

    const uniqueMemberIds = [...new Set(memberIds)];
    const memberRecords = await this.getMembersByIds(uniqueMemberIds);

    // Group by department - Member Departments field contains junction table record IDs
    const departmentMap: Map<string, { id: string; name: string; members: AirtableRecord[] }> = new Map();

    for (const member of memberRecords) {
      const memberDeptJunctionIds = member.fields['Member Departments'] as string[] | undefined;

      if (memberDeptJunctionIds && memberDeptJunctionIds.length > 0) {
        for (const junctionId of memberDeptJunctionIds) {
          try {
            // Get the junction record to find the actual department ID
            const junctionRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBER_DEPARTMENTS, junctionId);
            const deptId = this.extractLinkedRecordId(junctionRecord.fields['Department']);
            
            if (deptId) {
              if (!departmentMap.has(deptId)) {
                let deptName = deptId;
                try {
                  const deptRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.DEPARTMENTS, deptId);
                  deptName = (deptRecord.fields['Department Name'] as string) || deptId;
                } catch { /* use ID */ }
                departmentMap.set(deptId, { id: deptId, name: deptName, members: [] });
              }
              departmentMap.get(deptId)!.members.push(member);
            }
          } catch { /* skip if junction record not found */ }
        }
      }
    }

    return {
      serviceId,
      serviceName,
      departments: Array.from(departmentMap.values()).map(d => ({
        departmentId: d.id,
        departmentName: d.name,
        attendees: d.members.map(m => this.mapRecordToMember(m)),
      })),
    };
  }


  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Calculate period dates for evangelism stats
   * Week: Sunday to Saturday
   * Month: 1st to last day
   */
  private calculatePeriodDates(period: 'week' | 'month'): { startDate: Date; endDate: Date } {
    const now = new Date();

    if (period === 'week') {
      // Get current day of week (0 = Sunday, 6 = Saturday)
      const dayOfWeek = now.getDay();

      // Start date is the most recent Sunday
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);

      // End date is the following Saturday
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      return { startDate, endDate };
    } else {
      // Month: 1st to last day
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      return { startDate, endDate };
    }
  }

  /**
   * Build journey summary from member data and timeline
   */
  private buildJourneySummary(
    member: Member,
    memberRecord: AirtableRecord,
    timeline: TimelineEvent[]
  ): JourneySummary {
    // Find first evangelism event
    const firstEvangelism = timeline.find(e => e.type === 'evangelism');

    // Find first home visit
    const firstVisit = timeline.find(e => e.type === 'home_visit');

    // Find first attendance
    const firstAttendance = timeline.find(e => e.type === 'attendance');

    // Find last attendance
    const attendanceEvents = timeline.filter(e => e.type === 'attendance');
    const lastAttendance = attendanceEvents.length > 0
      ? attendanceEvents[attendanceEvents.length - 1]
      : undefined;

    // Count home visits
    const visitsCount = timeline.filter(e => e.type === 'home_visit').length;

    // Get follow-up owner name
    let assignedFollowUpPerson: string | undefined;
    const followUpOwnerId = member.followUpOwner;

    if (followUpOwnerId) {
      // Try to get from member record's lookup field
      assignedFollowUpPerson = (memberRecord.fields['Follow-up Owner Name'] as string) || followUpOwnerId;
    }

    return {
      firstEvangelised: firstEvangelism?.date,
      firstVisited: firstVisit?.date,
      firstAttended: firstAttendance?.date,
      lastAttended: lastAttendance?.date,
      visitsCount,
      assignedFollowUpPerson,
    };
  }

  /**
   * Get multiple members by their IDs
   */
  private async getMembersByIds(memberIds: string[]): Promise<AirtableRecord[]> {
    if (memberIds.length === 0) {
      return [];
    }

    // Build OR formula for all member IDs
    const conditions = memberIds.map(id => `RECORD_ID() = '${id}'`);
    const filterFormula = conditions.length > 1
      ? `OR(${conditions.join(', ')})`
      : conditions[0] || 'FALSE()';

    return this.airtableClient.findRecords(AIRTABLE_TABLES.MEMBERS, filterFormula);
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
}
