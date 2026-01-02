/**
 * Query Service
 * Provides dashboard KPIs, attendance data, member journeys, and admin views
 * 
 * Requirements: 15.1-15.7, 16.1-16.6, 17.1-17.6, 18.1-18.7, 19.1-19.7
 */

import { AirtableClient, AIRTABLE_TABLES } from './airtable-client';
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
 * Follow-up summary grouped by volunteer
 */
export interface FollowUpSummary {
  byVolunteer: {
    volunteerId: string;
    volunteerName: string;
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
  volunteerId: string;
  volunteerName: string;
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

  constructor(
    private readonly airtableClient: AirtableClient,
    config?: { attendanceThreshold?: number }
  ) {
    this.attendanceThreshold = config?.attendanceThreshold ?? 85;
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

    // Get all attendance records for the service
    const attendanceRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.ATTENDANCE,
      `AND(FIND('${serviceId}', ARRAYJOIN({Service})), {Present?} = TRUE())`
    );

    // Get member details for each attendance record
    const memberIds = attendanceRecords
      .map(r => this.extractLinkedRecordId(r.fields['Member']))
      .filter((id): id is string => !!id);

    // Get unique member IDs
    const uniqueMemberIds = [...new Set(memberIds)];

    // Fetch member records to categorize
    const memberRecords = await this.getMembersByIds(uniqueMemberIds);

    // Categorize by status
    let firstTimersCount = 0;
    let returnersCount = 0;
    const departmentCounts: Map<string, number> = new Map();

    for (const member of memberRecords) {
      const status = member.fields['Status'] as MemberStatus;
      
      if (status === 'First Timer') {
        firstTimersCount++;
      } else if (status === 'Returner') {
        returnersCount++;
      }

      // Count department memberships
      const departments = member.fields['Member Departments'] as string[] | undefined;
      if (departments) {
        for (const deptId of departments) {
          departmentCounts.set(deptId, (departmentCounts.get(deptId) || 0) + 1);
        }
      }
    }

    // Get department names
    const departmentBreakdown: { department: string; count: number }[] = [];
    for (const [deptId, count] of departmentCounts) {
      try {
        const deptRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.DEPARTMENTS, deptId);
        const deptName = (deptRecord.fields['Name'] as string) || deptId;
        departmentBreakdown.push({ department: deptName, count });
      } catch {
        departmentBreakdown.push({ department: deptId, count });
      }
    }

    return {
      totalAttendance: uniqueMemberIds.length,
      firstTimersCount,
      returnersCount,
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
   * Get follow-up summary grouped by volunteer
   * Requirements: 15.5, 15.6
   */
  async getFollowUpSummary(): Promise<FollowUpSummary> {
    // Get all active follow-up assignments
    const assignments = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_ASSIGNMENTS,
      `OR({Status} = 'Assigned', {Status} = 'In Progress')`
    );

    // Group by volunteer
    const byVolunteerMap: Map<string, {
      volunteerId: string;
      volunteerName: string;
      members: { memberId: string; memberName: string; status: AssignmentStatus }[];
    }> = new Map();

    for (const assignment of assignments) {
      const volunteerId = this.extractLinkedRecordId(assignment.fields['Assigned To']);
      const memberId = this.extractLinkedRecordId(assignment.fields['Member']);
      const status = (assignment.fields['Status'] as AssignmentStatus) || 'Assigned';

      if (!volunteerId || !memberId) continue;

      if (!byVolunteerMap.has(volunteerId)) {
        // Get volunteer name
        let volunteerName = volunteerId;
        try {
          const volunteerRecord = await this.airtableClient.getRecord(
            AIRTABLE_TABLES.VOLUNTEERS,
            volunteerId
          );
          volunteerName = (volunteerRecord.fields['Name'] as string) || volunteerId;
        } catch {
          // Use ID if name lookup fails
        }

        byVolunteerMap.set(volunteerId, {
          volunteerId,
          volunteerName,
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

      byVolunteerMap.get(volunteerId)!.members.push({
        memberId,
        memberName,
        status,
      });
    }

    const byVolunteer = Array.from(byVolunteerMap.values()).map(v => ({
      ...v,
      assignedCount: v.members.length,
    }));

    return {
      byVolunteer,
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
        {Date} >= '${this.formatDate(startDate)}',
        {Date} <= '${this.formatDate(endDate)}'
      )`;
    } else if (startDate) {
      filterFormula = `{Date} >= '${this.formatDate(startDate)}'`;
    } else if (endDate) {
      filterFormula = `{Date} <= '${this.formatDate(endDate)}'`;
    }

    const records = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_INTERACTIONS,
      filterFormula || 'TRUE()',
      { sort: [{ field: 'Date', direction: 'desc' }] }
    );

    const interactions: FollowUpInteraction[] = [];

    for (const record of records) {
      const memberId = this.extractLinkedRecordId(record.fields['Member']);
      const volunteerId = this.extractLinkedRecordId(record.fields['Volunteer']);

      if (!memberId) continue;

      // Get names
      let memberName = memberId;
      let volunteerName = volunteerId || 'Unknown';

      try {
        const memberRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBERS, memberId);
        memberName = (memberRecord.fields['Full Name'] as string) || memberId;
      } catch { /* use ID */ }

      if (volunteerId) {
        try {
          const volunteerRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.VOLUNTEERS, volunteerId);
          volunteerName = (volunteerRecord.fields['Name'] as string) || volunteerId;
        } catch { /* use ID */ }
      }

      interactions.push({
        id: record.id,
        memberId,
        memberName,
        volunteerId: volunteerId || '',
        volunteerName,
        date: this.parseDate(record.fields['Date'] as string) || new Date(),
        comment: (record.fields['Comment'] as string) || '',
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

    // Get service info
    let serviceName = serviceId;
    try {
      const serviceRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceId);
      serviceName = (serviceRecord.fields['Service Name + Date'] as string) || serviceId;
    } catch { /* use ID */ }

    // Get all attendance records for the service
    const attendanceRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.ATTENDANCE,
      `AND(FIND('${serviceId}', ARRAYJOIN({Service})), {Present?} = TRUE())`
    );

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

      // Get department memberships
      const memberDepts = member.fields['Member Departments'] as string[] | undefined;
      if (memberDepts) {
        for (const deptId of memberDepts) {
          if (!departmentCounts.has(deptId)) {
            let deptName = deptId;
            try {
              const deptRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.DEPARTMENTS, deptId);
              deptName = (deptRecord.fields['Name'] as string) || deptId;
            } catch { /* use ID */ }
            departmentCounts.set(deptId, { id: deptId, name: deptName, count: 0 });
          }
          departmentCounts.get(deptId)!.count++;
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
   * Get department attendance with percentage calculation
   * Requirements: 16.4, 16.5, 16.6
   * 
   * Percentage = (present members in department for service / active members in department) × 100
   */
  async getDepartmentAttendance(serviceId: string): Promise<DepartmentAttendance[]> {
    if (!serviceId) {
      throw new Error('Service ID is required');
    }

    // Get all departments
    const departments = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.DEPARTMENTS,
      'TRUE()'
    );

    const results: DepartmentAttendance[] = [];

    for (const dept of departments) {
      const deptId = dept.id;
      const deptName = (dept.fields['Name'] as string) || deptId;

      // Get active members in this department
      const activeMemberDepts = await this.airtableClient.findRecords(
        AIRTABLE_TABLES.MEMBER_DEPARTMENTS,
        `AND(FIND('${deptId}', ARRAYJOIN({Department})), {Active} = TRUE())`
      );

      const activeMemberCount = activeMemberDepts.length;

      // Get members who attended this service from this department
      const activeMemberIds = activeMemberDepts
        .map(md => this.extractLinkedRecordId(md.fields['Member']))
        .filter((id): id is string => !!id);

      let presentCount = 0;

      if (activeMemberIds.length > 0) {
        // Check attendance for each active member
        for (const memberId of activeMemberIds) {
          const attendance = await this.airtableClient.findRecords(
            AIRTABLE_TABLES.ATTENDANCE,
            `AND(
              FIND('${memberId}', ARRAYJOIN({Member})),
              FIND('${serviceId}', ARRAYJOIN({Service})),
              {Present?} = TRUE()
            )`,
            { maxRecords: 1 }
          );

          if (attendance.length > 0) {
            presentCount++;
          }
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
   * Compare attendance between two services
   * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
   */
  async compareTwoServices(serviceAId: string, serviceBId: string): Promise<ServiceComparison> {
    if (!serviceAId || !serviceBId) {
      throw new Error('Both service IDs are required');
    }

    // Get service info
    const [serviceARecord, serviceBRecord] = await Promise.all([
      this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceAId),
      this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceBId),
    ]);

    const serviceA = {
      id: serviceAId,
      name: (serviceARecord.fields['Service Name + Date'] as string) || serviceAId,
    };

    const serviceB = {
      id: serviceBId,
      name: (serviceBRecord.fields['Service Name + Date'] as string) || serviceBId,
    };

    // Get attendance for both services
    const [attendanceA, attendanceB] = await Promise.all([
      this.airtableClient.findRecords(
        AIRTABLE_TABLES.ATTENDANCE,
        `AND(FIND('${serviceAId}', ARRAYJOIN({Service})), {Present?} = TRUE())`
      ),
      this.airtableClient.findRecords(
        AIRTABLE_TABLES.ATTENDANCE,
        `AND(FIND('${serviceBId}', ARRAYJOIN({Service})), {Present?} = TRUE())`
      ),
    ]);

    const memberIdsA = new Set(
      attendanceA
        .map(r => this.extractLinkedRecordId(r.fields['Member']))
        .filter((id): id is string => !!id)
    );

    const memberIdsB = new Set(
      attendanceB
        .map(r => this.extractLinkedRecordId(r.fields['Member']))
        .filter((id): id is string => !!id)
    );

    // Find members in A but not in B
    const inANotB = [...memberIdsA].filter(id => !memberIdsB.has(id));
    
    // Find members in B but not in A
    const inBNotA = [...memberIdsB].filter(id => !memberIdsA.has(id));

    // Get member details
    const [membersInANotB, membersInBNotA] = await Promise.all([
      this.getMembersByIds(inANotB),
      this.getMembersByIds(inBNotA),
    ]);

    return {
      serviceA,
      serviceB,
      presentInAMissingInB: membersInANotB.map(r => this.mapRecordToMember(r)),
      presentInBMissingInA: membersInBNotA.map(r => this.mapRecordToMember(r)),
    };
  }


  // ============================================
  // Member Journey Queries (Requirements 18.1-18.7)
  // ============================================

  /**
   * Get complete member journey with timeline
   * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
   */
  async getMemberJourney(memberId: string): Promise<MemberJourney> {
    if (!memberId) {
      throw new Error('Member ID is required');
    }

    // Get member record
    const memberRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.MEMBERS, memberId);
    const member = this.mapRecordToMember(memberRecord);

    // Build timeline from multiple sources
    const timeline: TimelineEvent[] = [];

    // 1. Evangelism events
    const evangelismRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.EVANGELISM,
      `FIND('${memberId}', ARRAYJOIN({Linked Member}))`
    );

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

    // 2. First Timer registration
    const firstTimerRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FIRST_TIMERS_REGISTER,
      `FIND('${memberId}', ARRAYJOIN({Linked Member}))`
    );

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

    // 3. Attendance records
    const attendanceRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.ATTENDANCE,
      `AND(FIND('${memberId}', ARRAYJOIN({Member})), {Present?} = TRUE())`
    );

    for (const record of attendanceRecords) {
      const serviceId = this.extractLinkedRecordId(record.fields['Service']);
      if (serviceId) {
        try {
          const serviceRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceId);
          const serviceDate = this.parseDate(serviceRecord.fields['Service Date'] as string);
          const serviceName = (serviceRecord.fields['Service Name + Date'] as string) || 'Service';

          if (serviceDate) {
            timeline.push({
              date: serviceDate,
              type: 'attendance',
              title: 'Service Attendance',
              description: `Attended ${serviceName}`,
              metadata: { serviceId, recordId: record.id },
            });
          }
        } catch { /* skip if service not found */ }
      }
    }

    // 4. Home visits
    const homeVisitRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.HOME_VISITS,
      `FIND('${memberId}', ARRAYJOIN({Member}))`
    );

    for (const record of homeVisitRecords) {
      const date = this.parseDate(record.fields['Date'] as string);
      const visitorId = this.extractLinkedRecordId(record.fields['Visitor']);
      let visitorName = 'Unknown';

      if (visitorId) {
        try {
          const visitorRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.VOLUNTEERS, visitorId);
          visitorName = (visitorRecord.fields['Name'] as string) || visitorId;
        } catch { /* use default */ }
      }

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

    // 5. Follow-up interactions
    const followUpRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.FOLLOW_UP_INTERACTIONS,
      `FIND('${memberId}', ARRAYJOIN({Member}))`
    );

    for (const record of followUpRecords) {
      const date = this.parseDate(record.fields['Date'] as string);
      const volunteerId = this.extractLinkedRecordId(record.fields['Volunteer']);
      let volunteerName = 'Unknown';

      if (volunteerId) {
        try {
          const volunteerRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.VOLUNTEERS, volunteerId);
          volunteerName = (volunteerRecord.fields['Name'] as string) || volunteerId;
        } catch { /* use default */ }
      }

      if (date) {
        timeline.push({
          date,
          type: 'follow_up',
          title: 'Follow-up Interaction',
          description: `Follow-up by ${volunteerName}`,
          metadata: {
            recordId: record.id,
            volunteerId,
            volunteerName,
            comment: record.fields['Comment'] as string,
          },
        });
      }
    }

    // 6. Department joins
    const memberDeptRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.MEMBER_DEPARTMENTS,
      `FIND('${memberId}', ARRAYJOIN({Member}))`
    );

    for (const record of memberDeptRecords) {
      const date = this.parseDate(record.fields['Join Date'] as string) ||
                   this.parseDate(record.createdTime);
      const deptId = this.extractLinkedRecordId(record.fields['Department']);
      let deptName = 'Unknown Department';

      if (deptId) {
        try {
          const deptRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.DEPARTMENTS, deptId);
          deptName = (deptRecord.fields['Name'] as string) || deptId;
        } catch { /* use default */ }
      }

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
    // Get all departments
    const departments = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.DEPARTMENTS,
      'TRUE()'
    );

    const rosters: { departmentId: string; departmentName: string; members: Member[] }[] = [];

    for (const dept of departments) {
      const deptId = dept.id;
      const deptName = (dept.fields['Name'] as string) || deptId;

      // Get active members in this department
      const memberDepts = await this.airtableClient.findRecords(
        AIRTABLE_TABLES.MEMBER_DEPARTMENTS,
        `AND(FIND('${deptId}', ARRAYJOIN({Department})), {Active} = TRUE())`
      );

      const memberIds = memberDepts
        .map(md => this.extractLinkedRecordId(md.fields['Member']))
        .filter((id): id is string => !!id);

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

    // Get service info
    let serviceName = serviceId;
    try {
      const serviceRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.SERVICES, serviceId);
      serviceName = (serviceRecord.fields['Service Name + Date'] as string) || serviceId;
    } catch { /* use ID */ }

    // Get attendance for the service
    const attendanceRecords = await this.airtableClient.findRecords(
      AIRTABLE_TABLES.ATTENDANCE,
      `AND(FIND('${serviceId}', ARRAYJOIN({Service})), {Present?} = TRUE())`
    );

    const memberIds = attendanceRecords
      .map(r => this.extractLinkedRecordId(r.fields['Member']))
      .filter((id): id is string => !!id);

    const uniqueMemberIds = [...new Set(memberIds)];
    const memberRecords = await this.getMembersByIds(uniqueMemberIds);

    // Group by department
    const departmentMap: Map<string, { id: string; name: string; members: AirtableRecord[] }> = new Map();

    for (const member of memberRecords) {
      const memberDepts = member.fields['Member Departments'] as string[] | undefined;

      if (memberDepts && memberDepts.length > 0) {
        for (const deptId of memberDepts) {
          if (!departmentMap.has(deptId)) {
            let deptName = deptId;
            try {
              const deptRecord = await this.airtableClient.getRecord(AIRTABLE_TABLES.DEPARTMENTS, deptId);
              deptName = (deptRecord.fields['Name'] as string) || deptId;
            } catch { /* use ID */ }
            departmentMap.set(deptId, { id: deptId, name: deptName, members: [] });
          }
          departmentMap.get(deptId)!.members.push(member);
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
