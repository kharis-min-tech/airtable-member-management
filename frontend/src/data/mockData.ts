/**
 * Comprehensive Mock Data Module for Demo Pages
 * Requirements: 6.2 - Realistic mock data that demonstrates all features
 * 
 * This module provides interconnected, realistic demo data for all demo pages.
 * All data is static and no API calls are made when using this module.
 */

import type {
  Service,
  Member,
  ServiceKPIs,
  EvangelismStats,
  SoulsAssignedByVolunteer,
  FollowUpInteraction,
  AttendanceBreakdown,
  MemberJourney,
  DepartmentAttendance,
  ServiceAttendee,
  ServiceComparison,
  FollowUpAssignment,
  TimelineEvent,
} from '../types';
import type { DepartmentRoster, EvangelismRecord } from '../types/admin';

// ============================================================================
// SERVICES
// ============================================================================

export const mockServices: Service[] = [
  { id: 'svc-001', serviceName: 'Sunday Service', serviceDate: new Date('2026-01-04'), serviceCode: '2026-01-04-SUN' },
  { id: 'svc-002', serviceName: 'Sunday Service', serviceDate: new Date('2025-12-28'), serviceCode: '2025-12-28-SUN' },
  { id: 'svc-003', serviceName: 'Midweek Service', serviceDate: new Date('2025-12-31'), serviceCode: '2025-12-31-MID' },
  { id: 'svc-004', serviceName: 'Sunday Service', serviceDate: new Date('2025-12-21'), serviceCode: '2025-12-21-SUN' },
  { id: 'svc-005', serviceName: 'Christmas Service', serviceDate: new Date('2025-12-25'), serviceCode: '2025-12-25-XMAS' },
  { id: 'svc-006', serviceName: 'Sunday Service', serviceDate: new Date('2025-12-14'), serviceCode: '2025-12-14-SUN' },
  { id: 'svc-007', serviceName: 'Midweek Service', serviceDate: new Date('2025-12-17'), serviceCode: '2025-12-17-MID' },
  { id: 'svc-008', serviceName: 'Sunday Service', serviceDate: new Date('2025-12-07'), serviceCode: '2025-12-07-SUN' },
  { id: 'svc-009', serviceName: 'Sunday Service', serviceDate: new Date('2025-11-30'), serviceCode: '2025-11-30-SUN' },
  { id: 'svc-010', serviceName: 'Thanksgiving Service', serviceDate: new Date('2025-11-27'), serviceCode: '2025-11-27-THX' },
];

// ============================================================================
// MEMBERS
// ============================================================================

export const mockMembers: Member[] = [
  {
    id: 'mem-001',
    firstName: 'Kwame',
    lastName: 'Asante',
    fullName: 'Kwame Asante',
    phone: '0244123456',
    email: 'kwame.asante@email.com',
    status: 'First Timer',
    source: 'First Timer Form',
    dateFirstCaptured: new Date('2025-12-28'),
    followUpStatus: 'In Progress',
    followUpOwner: 'vol-001',
    followUpOwnerName: 'John Mensah',
  },
  {
    id: 'mem-002',
    firstName: 'Ama',
    lastName: 'Serwaa',
    fullName: 'Ama Serwaa',
    phone: '0201234567',
    email: 'ama.serwaa@email.com',
    status: 'Evangelism Contact',
    source: 'Evangelism',
    dateFirstCaptured: new Date('2025-12-25'),
    followUpStatus: 'Contacted',
    followUpOwner: 'vol-001',
    followUpOwnerName: 'John Mensah',
  },
  {
    id: 'mem-003',
    firstName: 'Kofi',
    lastName: 'Boateng',
    fullName: 'Kofi Boateng',
    phone: '0551234567',
    email: 'kofi.boateng@email.com',
    status: 'First Timer',
    source: 'First Timer Form',
    dateFirstCaptured: new Date('2025-12-20'),
    followUpStatus: 'Visiting',
    followUpOwner: 'vol-001',
    followUpOwnerName: 'John Mensah',
    visited: true,
    lastVisited: new Date('2025-12-28'),
  },
  {
    id: 'mem-004',
    firstName: 'Abena',
    lastName: 'Darko',
    fullName: 'Abena Darko',
    phone: '0271234567',
    email: 'abena.darko@email.com',
    status: 'Returner',
    source: 'Returner Form',
    dateFirstCaptured: new Date('2025-12-30'),
    followUpStatus: 'In Progress',
    followUpOwner: 'vol-002',
    followUpOwnerName: 'Grace Owusu',
  },
  {
    id: 'mem-005',
    firstName: 'Yaw',
    lastName: 'Mensah',
    fullName: 'Yaw Mensah',
    phone: '0541234567',
    email: 'yaw.mensah@email.com',
    status: 'Evangelism Contact',
    source: 'Evangelism',
    dateFirstCaptured: new Date('2025-12-22'),
    followUpStatus: 'Not Started',
    followUpOwner: 'vol-002',
    followUpOwnerName: 'Grace Owusu',
  },

  {
    id: 'mem-006',
    firstName: 'Akua',
    lastName: 'Frimpong',
    fullName: 'Akua Frimpong',
    phone: '0231234567',
    email: 'akua.frimpong@email.com',
    status: 'First Timer',
    source: 'First Timer Form',
    dateFirstCaptured: new Date('2025-12-29'),
    followUpStatus: 'In Progress',
    followUpOwner: 'vol-003',
    followUpOwnerName: 'Emmanuel Adjei',
  },
  {
    id: 'mem-007',
    firstName: 'Kwesi',
    lastName: 'Appiah',
    fullName: 'Kwesi Appiah',
    phone: '0501234567',
    email: 'kwesi.appiah@email.com',
    status: 'Evangelism Contact',
    source: 'Evangelism',
    dateFirstCaptured: new Date('2025-12-27'),
    followUpStatus: 'Contacted',
    followUpOwner: 'vol-003',
    followUpOwnerName: 'Emmanuel Adjei',
  },
  {
    id: 'mem-008',
    firstName: 'Efua',
    lastName: 'Mensah',
    fullName: 'Efua Mensah',
    phone: '0261234567',
    email: 'efua.mensah@email.com',
    status: 'First Timer',
    source: 'First Timer Form',
    dateFirstCaptured: new Date('2025-12-26'),
    followUpStatus: 'Visiting',
    followUpOwner: 'vol-003',
    followUpOwnerName: 'Emmanuel Adjei',
    visited: true,
    lastVisited: new Date('2025-12-30'),
  },
  {
    id: 'mem-009',
    firstName: 'Nana',
    lastName: 'Yaw',
    fullName: 'Nana Yaw',
    phone: '0571234567',
    email: 'nana.yaw@email.com',
    status: 'Returner',
    source: 'Returner Form',
    dateFirstCaptured: new Date('2025-12-24'),
    followUpStatus: 'Integrated',
    followUpOwner: 'vol-003',
    followUpOwnerName: 'Emmanuel Adjei',
  },
  {
    id: 'mem-010',
    firstName: 'Adwoa',
    lastName: 'Sarpong',
    fullName: 'Adwoa Sarpong',
    phone: '0241234567',
    email: 'adwoa.sarpong@email.com',
    status: 'First Timer',
    source: 'First Timer Form',
    dateFirstCaptured: new Date('2025-12-31'),
    followUpStatus: 'Not Started',
    followUpOwner: 'vol-004',
    followUpOwnerName: 'Priscilla Agyemang',
  },
  {
    id: 'mem-011',
    firstName: 'Daniel',
    lastName: 'Osei',
    fullName: 'Daniel Osei',
    phone: '0209876543',
    email: 'daniel.osei@email.com',
    status: 'Member',
    source: 'Other',
    dateFirstCaptured: new Date('2024-06-15'),
    followUpStatus: 'Established',
    departments: ['Choir', 'Youth'],
    membershipCompleted: new Date('2024-09-01'),
    waterBaptized: true,
    waterBaptismDate: new Date('2024-08-15'),
  },
  {
    id: 'mem-012',
    firstName: 'Sarah',
    lastName: 'Adjei',
    fullName: 'Sarah Adjei',
    phone: '0245678901',
    email: 'sarah.adjei@email.com',
    status: 'Member',
    source: 'First Timer Form',
    dateFirstCaptured: new Date('2024-03-10'),
    followUpStatus: 'Established',
    departments: ['Ushers'],
    membershipCompleted: new Date('2024-07-20'),
    spiritualMaturityCompleted: new Date('2024-11-15'),
    waterBaptized: true,
    waterBaptismDate: new Date('2024-06-01'),
  },
  {
    id: 'mem-013',
    firstName: 'Michael',
    lastName: 'Owusu',
    fullName: 'Michael Owusu',
    phone: '0556789012',
    email: 'michael.owusu@email.com',
    status: 'Member',
    source: 'Evangelism',
    dateFirstCaptured: new Date('2024-01-20'),
    followUpStatus: 'Established',
    departments: ['Media'],
    membershipCompleted: new Date('2024-05-10'),
  },
  {
    id: 'mem-014',
    firstName: 'Grace',
    lastName: 'Amponsah',
    fullName: 'Grace Amponsah',
    phone: '0277890123',
    email: 'grace.amponsah@email.com',
    status: 'Member',
    source: 'Other',
    dateFirstCaptured: new Date('2023-11-05'),
    followUpStatus: 'Established',
    departments: ['Children'],
    membershipCompleted: new Date('2024-02-28'),
    spiritualMaturityCompleted: new Date('2024-08-20'),
    waterBaptized: true,
    waterBaptismDate: new Date('2024-01-15'),
    holySpritBaptism: true,
  },
  {
    id: 'mem-015',
    firstName: 'Emmanuel',
    lastName: 'Tetteh',
    fullName: 'Emmanuel Tetteh',
    phone: '0508901234',
    status: 'Evangelism Contact',
    source: 'Evangelism',
    dateFirstCaptured: new Date('2025-12-15'),
    followUpStatus: 'Not Started',
  },
];

// ============================================================================
// SERVICE KPIs
// ============================================================================

export const mockKPIs: Record<string, ServiceKPIs> = {
  'svc-001': {
    totalAttendance: 245,
    firstTimersCount: 12,
    returnersCount: 8,
    departmentBreakdown: [
      { department: 'Choir', count: 35 },
      { department: 'Ushers', count: 22 },
      { department: 'Media', count: 15 },
      { department: 'Children', count: 28 },
      { department: 'Youth', count: 45 },
    ],
  },
  'svc-002': {
    totalAttendance: 198,
    firstTimersCount: 7,
    returnersCount: 5,
    departmentBreakdown: [
      { department: 'Choir', count: 30 },
      { department: 'Ushers', count: 18 },
      { department: 'Media', count: 12 },
      { department: 'Children', count: 25 },
      { department: 'Youth', count: 38 },
    ],
  },
  'svc-003': {
    totalAttendance: 85,
    firstTimersCount: 3,
    returnersCount: 2,
    departmentBreakdown: [
      { department: 'Choir', count: 15 },
      { department: 'Ushers', count: 8 },
      { department: 'Media', count: 6 },
    ],
  },
  'svc-004': {
    totalAttendance: 210,
    firstTimersCount: 9,
    returnersCount: 6,
    departmentBreakdown: [
      { department: 'Choir', count: 32 },
      { department: 'Ushers', count: 20 },
      { department: 'Media', count: 14 },
      { department: 'Children', count: 26 },
      { department: 'Youth', count: 42 },
    ],
  },
  'svc-005': {
    totalAttendance: 320,
    firstTimersCount: 25,
    returnersCount: 15,
    departmentBreakdown: [
      { department: 'Choir', count: 45 },
      { department: 'Ushers', count: 30 },
      { department: 'Media', count: 18 },
      { department: 'Children', count: 40 },
      { department: 'Youth', count: 55 },
    ],
  },
  'svc-006': {
    totalAttendance: 195,
    firstTimersCount: 6,
    returnersCount: 4,
    departmentBreakdown: [
      { department: 'Choir', count: 28 },
      { department: 'Ushers', count: 17 },
      { department: 'Media', count: 11 },
      { department: 'Children', count: 24 },
      { department: 'Youth', count: 36 },
    ],
  },
};


// ============================================================================
// EVANGELISM STATS
// ============================================================================

export const mockEvangelismStats: Record<'week' | 'month', EvangelismStats> = {
  week: {
    period: 'week',
    contactCount: 18,
    startDate: new Date('2025-12-28'),
    endDate: new Date('2026-01-03'),
  },
  month: {
    period: 'month',
    contactCount: 67,
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
  },
};

// ============================================================================
// SOULS ASSIGNED BY VOLUNTEER
// ============================================================================

export const mockSoulsAssigned: SoulsAssignedByVolunteer[] = [
  {
    volunteerId: 'vol-001',
    volunteerName: 'John Mensah',
    members: [
      { id: 'mem-001', name: 'Kwame Asante', status: 'First Timer', phone: '0244123456', assignedDate: new Date('2025-12-28') },
      { id: 'mem-002', name: 'Ama Serwaa', status: 'Evangelism Contact', phone: '0201234567', assignedDate: new Date('2025-12-25') },
      { id: 'mem-003', name: 'Kofi Boateng', status: 'First Timer', phone: '0551234567', assignedDate: new Date('2025-12-20') },
    ],
  },
  {
    volunteerId: 'vol-002',
    volunteerName: 'Grace Owusu',
    members: [
      { id: 'mem-004', name: 'Abena Darko', status: 'Returner', phone: '0271234567', assignedDate: new Date('2025-12-30') },
      { id: 'mem-005', name: 'Yaw Mensah', status: 'Evangelism Contact', phone: '0541234567', assignedDate: new Date('2025-12-22') },
    ],
  },
  {
    volunteerId: 'vol-003',
    volunteerName: 'Emmanuel Adjei',
    members: [
      { id: 'mem-006', name: 'Akua Frimpong', status: 'First Timer', phone: '0231234567', assignedDate: new Date('2025-12-29') },
      { id: 'mem-007', name: 'Kwesi Appiah', status: 'Evangelism Contact', phone: '0501234567', assignedDate: new Date('2025-12-27') },
      { id: 'mem-008', name: 'Efua Mensah', status: 'First Timer', phone: '0261234567', assignedDate: new Date('2025-12-26') },
      { id: 'mem-009', name: 'Nana Yaw', status: 'Returner', phone: '0571234567', assignedDate: new Date('2025-12-24') },
    ],
  },
  {
    volunteerId: 'vol-004',
    volunteerName: 'Priscilla Agyemang',
    members: [
      { id: 'mem-010', name: 'Adwoa Sarpong', status: 'First Timer', phone: '0241234567', assignedDate: new Date('2025-12-31') },
    ],
  },
];

// ============================================================================
// FOLLOW-UP COMMENTS
// ============================================================================

export const mockFollowUpComments: FollowUpInteraction[] = [
  { id: 'c1', memberId: 'mem-001', memberName: 'Kwame Asante', volunteerId: 'vol-001', volunteerName: 'John Mensah', date: new Date('2026-01-02T10:30:00'), comment: 'Called and spoke with him. He is excited about the church and wants to join a cell group.' },
  { id: 'c2', memberId: 'mem-002', memberName: 'Ama Serwaa', volunteerId: 'vol-001', volunteerName: 'John Mensah', date: new Date('2026-01-01T14:15:00'), comment: 'Visited her home. She has some questions about baptism. Will follow up next week.' },
  { id: 'c3', memberId: 'mem-004', memberName: 'Abena Darko', volunteerId: 'vol-002', volunteerName: 'Grace Owusu', date: new Date('2025-12-31T09:00:00'), comment: 'She attended the New Year service. Very happy to be back in church.' },
  { id: 'c4', memberId: 'mem-006', memberName: 'Akua Frimpong', volunteerId: 'vol-003', volunteerName: 'Emmanuel Adjei', date: new Date('2025-12-30T16:45:00'), comment: 'First call made. She is interested in the youth ministry.' },
  { id: 'c5', memberId: 'mem-007', memberName: 'Kwesi Appiah', volunteerId: 'vol-003', volunteerName: 'Emmanuel Adjei', date: new Date('2025-12-29T11:20:00'), comment: 'Met him at the market. Reminded him about Sunday service.' },
  { id: 'c6', memberId: 'mem-003', memberName: 'Kofi Boateng', volunteerId: 'vol-001', volunteerName: 'John Mensah', date: new Date('2025-12-28T15:00:00'), comment: 'Home visit completed. Family is very welcoming. Prayed with them.' },
  { id: 'c7', memberId: 'mem-005', memberName: 'Yaw Mensah', volunteerId: 'vol-002', volunteerName: 'Grace Owusu', date: new Date('2025-12-27T10:00:00'), comment: 'Phone was off. Will try again tomorrow.' },
  { id: 'c8', memberId: 'mem-008', memberName: 'Efua Mensah', volunteerId: 'vol-003', volunteerName: 'Emmanuel Adjei', date: new Date('2025-12-26T13:30:00'), comment: 'She confirmed she will attend the Christmas service with her family.' },
];

// ============================================================================
// ATTENDANCE BREAKDOWN
// ============================================================================

export const mockAttendanceBreakdown: Record<string, AttendanceBreakdown> = {
  'svc-001': {
    serviceId: 'svc-001',
    serviceName: 'Sunday Service - Jan 4, 2026',
    totalAttendance: 245,
    firstTimers: 12,
    returners: 8,
    evangelismContacts: 5,
    departments: [
      { departmentId: 'dept-001', departmentName: 'Choir', count: 35 },
      { departmentId: 'dept-002', departmentName: 'Ushers', count: 22 },
      { departmentId: 'dept-003', departmentName: 'Media', count: 15 },
      { departmentId: 'dept-004', departmentName: 'Children', count: 28 },
      { departmentId: 'dept-005', departmentName: 'Youth', count: 45 },
    ],
  },
  'svc-002': {
    serviceId: 'svc-002',
    serviceName: 'Sunday Service - Dec 28, 2025',
    totalAttendance: 198,
    firstTimers: 7,
    returners: 5,
    evangelismContacts: 3,
    departments: [
      { departmentId: 'dept-001', departmentName: 'Choir', count: 30 },
      { departmentId: 'dept-002', departmentName: 'Ushers', count: 18 },
      { departmentId: 'dept-003', departmentName: 'Media', count: 12 },
      { departmentId: 'dept-004', departmentName: 'Children', count: 25 },
      { departmentId: 'dept-005', departmentName: 'Youth', count: 38 },
    ],
  },
  'svc-005': {
    serviceId: 'svc-005',
    serviceName: 'Christmas Service - Dec 25, 2025',
    totalAttendance: 320,
    firstTimers: 25,
    returners: 15,
    evangelismContacts: 8,
    departments: [
      { departmentId: 'dept-001', departmentName: 'Choir', count: 45 },
      { departmentId: 'dept-002', departmentName: 'Ushers', count: 30 },
      { departmentId: 'dept-003', departmentName: 'Media', count: 18 },
      { departmentId: 'dept-004', departmentName: 'Children', count: 40 },
      { departmentId: 'dept-005', departmentName: 'Youth', count: 55 },
    ],
  },
};

// ============================================================================
// DEPARTMENT ATTENDANCE
// ============================================================================

export const mockDepartmentAttendance: Record<string, DepartmentAttendance[]> = {
  'svc-001': [
    { serviceId: 'svc-001', departmentId: 'dept-001', departmentName: 'Choir', presentCount: 35, activeMemberCount: 40, attendancePercentage: 87.5, belowThreshold: false },
    { serviceId: 'svc-001', departmentId: 'dept-002', departmentName: 'Ushers', presentCount: 22, activeMemberCount: 25, attendancePercentage: 88, belowThreshold: false },
    { serviceId: 'svc-001', departmentId: 'dept-003', departmentName: 'Media', presentCount: 15, activeMemberCount: 18, attendancePercentage: 83.3, belowThreshold: false },
    { serviceId: 'svc-001', departmentId: 'dept-004', departmentName: 'Children', presentCount: 28, activeMemberCount: 35, attendancePercentage: 80, belowThreshold: false },
    { serviceId: 'svc-001', departmentId: 'dept-005', departmentName: 'Youth', presentCount: 45, activeMemberCount: 60, attendancePercentage: 75, belowThreshold: false },
  ],
  'svc-002': [
    { serviceId: 'svc-002', departmentId: 'dept-001', departmentName: 'Choir', presentCount: 30, activeMemberCount: 40, attendancePercentage: 75, belowThreshold: false },
    { serviceId: 'svc-002', departmentId: 'dept-002', departmentName: 'Ushers', presentCount: 18, activeMemberCount: 25, attendancePercentage: 72, belowThreshold: false },
    { serviceId: 'svc-002', departmentId: 'dept-003', departmentName: 'Media', presentCount: 12, activeMemberCount: 18, attendancePercentage: 66.7, belowThreshold: false },
    { serviceId: 'svc-002', departmentId: 'dept-004', departmentName: 'Children', presentCount: 25, activeMemberCount: 35, attendancePercentage: 71.4, belowThreshold: false },
    { serviceId: 'svc-002', departmentId: 'dept-005', departmentName: 'Youth', presentCount: 38, activeMemberCount: 60, attendancePercentage: 63.3, belowThreshold: false },
  ],
};


// ============================================================================
// SERVICE ATTENDEES (for drill-down)
// ============================================================================

export const mockServiceAttendees: Record<string, {
  firstTimers: ServiceAttendee[];
  returners: ServiceAttendee[];
  evangelismContacts: ServiceAttendee[];
  departments: Record<string, ServiceAttendee[]>;
}> = {
  'svc-001': {
    firstTimers: [
      { id: 'mem-001', fullName: 'Kwame Asante', phone: '0244123456', email: 'kwame.asante@email.com', status: 'First Timer', sourceForm: 'First Timer' },
      { id: 'mem-006', fullName: 'Akua Frimpong', phone: '0231234567', email: 'akua.frimpong@email.com', status: 'First Timer', sourceForm: 'First Timer' },
      { id: 'mem-008', fullName: 'Efua Mensah', phone: '0261234567', email: 'efua.mensah@email.com', status: 'First Timer', sourceForm: 'First Timer' },
      { id: 'mem-010', fullName: 'Adwoa Sarpong', phone: '0241234567', email: 'adwoa.sarpong@email.com', status: 'First Timer', sourceForm: 'First Timer' },
    ],
    returners: [
      { id: 'mem-004', fullName: 'Abena Darko', phone: '0271234567', email: 'abena.darko@email.com', status: 'Returner', sourceForm: 'Returner' },
      { id: 'mem-009', fullName: 'Nana Yaw', phone: '0571234567', email: 'nana.yaw@email.com', status: 'Returner', sourceForm: 'Returner' },
    ],
    evangelismContacts: [
      { id: 'mem-002', fullName: 'Ama Serwaa', phone: '0201234567', email: 'ama.serwaa@email.com', status: 'Evangelism Contact', sourceForm: 'Evangelism' },
      { id: 'mem-005', fullName: 'Yaw Mensah', phone: '0541234567', email: 'yaw.mensah@email.com', status: 'Evangelism Contact', sourceForm: 'Evangelism' },
      { id: 'mem-007', fullName: 'Kwesi Appiah', phone: '0501234567', email: 'kwesi.appiah@email.com', status: 'Evangelism Contact', sourceForm: 'Evangelism' },
    ],
    departments: {
      'Choir': [
        { id: 'mem-011', fullName: 'Daniel Osei', phone: '0209876543', email: 'daniel.osei@email.com', status: 'Member', sourceForm: 'Manual', groupTag: 'Choir' },
      ],
      'Ushers': [
        { id: 'mem-012', fullName: 'Sarah Adjei', phone: '0245678901', email: 'sarah.adjei@email.com', status: 'Member', sourceForm: 'Manual', groupTag: 'Ushers' },
      ],
      'Media': [
        { id: 'mem-013', fullName: 'Michael Owusu', phone: '0556789012', email: 'michael.owusu@email.com', status: 'Member', sourceForm: 'Manual', groupTag: 'Media' },
      ],
      'Children': [
        { id: 'mem-014', fullName: 'Grace Amponsah', phone: '0277890123', email: 'grace.amponsah@email.com', status: 'Member', sourceForm: 'Manual', groupTag: 'Children' },
      ],
    },
  },
};

// ============================================================================
// SERVICE COMPARISON (for missing members - unidirectional)
// ============================================================================

export const mockServiceComparison: ServiceComparison = {
  serviceA: mockServices[0], // Jan 4
  serviceB: mockServices[1], // Dec 28
  presentInAMissingInB: [
    mockMembers[0], // Kwame Asante
    mockMembers[5], // Akua Frimpong
    mockMembers[9], // Adwoa Sarpong
  ],
};

// ============================================================================
// MEMBER JOURNEYS
// ============================================================================

export const mockMemberJourneys: Record<string, MemberJourney> = {
  'mem-001': {
    member: mockMembers[0],
    summary: {
      firstAttended: new Date('2025-12-28'),
      lastAttended: new Date('2026-01-04'),
      visitsCount: 2,
      assignedFollowUpPerson: 'John Mensah',
    },
    timeline: [
      {
        date: new Date('2026-01-04'),
        type: 'attendance',
        title: 'Attended Sunday Service',
        description: 'Second visit to church',
      },
      {
        date: new Date('2026-01-02'),
        type: 'follow_up',
        title: 'Follow-up Call',
        description: 'Called and spoke with him. He is excited about the church and wants to join a cell group.',
      },
      {
        date: new Date('2025-12-28'),
        type: 'first_timer',
        title: 'First Time Visitor',
        description: 'Filled out first timer form at Sunday Service',
      },
    ],
  },
  'mem-011': {
    member: mockMembers[10], // Daniel Osei - established member
    summary: {
      firstEvangelised: undefined,
      firstVisited: new Date('2024-06-20'),
      firstAttended: new Date('2024-06-15'),
      lastAttended: new Date('2026-01-04'),
      visitsCount: 45,
      assignedFollowUpPerson: undefined,
    },
    timeline: [
      {
        date: new Date('2026-01-04'),
        type: 'attendance',
        title: 'Attended Sunday Service',
        description: 'Regular attendance',
      },
      {
        date: new Date('2024-09-01'),
        type: 'membership_completed',
        title: 'Membership Completed',
        description: 'Completed membership class and became an official member',
      },
      {
        date: new Date('2024-08-15'),
        type: 'water_baptism',
        title: 'Water Baptism',
        description: 'Baptized in water during Sunday service',
      },
      {
        date: new Date('2024-07-10'),
        type: 'department_join',
        title: 'Joined Choir Department',
        description: 'Became a member of the Choir ministry',
      },
      {
        date: new Date('2024-07-05'),
        type: 'department_join',
        title: 'Joined Youth Department',
        description: 'Became a member of the Youth ministry',
      },
      {
        date: new Date('2024-06-20'),
        type: 'home_visit',
        title: 'Home Visit',
        description: 'Follow-up team visited at home',
      },
      {
        date: new Date('2024-06-15'),
        type: 'first_timer',
        title: 'First Time Visitor',
        description: 'First visit to church',
      },
    ],
  },
  'mem-014': {
    member: mockMembers[13], // Grace Amponsah - fully established
    summary: {
      firstAttended: new Date('2023-11-05'),
      lastAttended: new Date('2026-01-04'),
      visitsCount: 78,
      assignedFollowUpPerson: undefined,
    },
    timeline: [
      {
        date: new Date('2026-01-04'),
        type: 'attendance',
        title: 'Attended Sunday Service',
        description: 'Regular attendance',
      },
      {
        date: new Date('2024-08-20'),
        type: 'spiritual_maturity',
        title: 'Spiritual Maturity Completed',
        description: 'Completed spiritual maturity program',
      },
      {
        date: new Date('2024-02-28'),
        type: 'membership_completed',
        title: 'Membership Completed',
        description: 'Completed membership class',
      },
      {
        date: new Date('2024-01-15'),
        type: 'water_baptism',
        title: 'Water Baptism',
        description: 'Baptized in water',
      },
      {
        date: new Date('2023-12-20'),
        type: 'department_join',
        title: 'Joined Children Department',
        description: 'Became a children ministry worker',
      },
      {
        date: new Date('2023-11-05'),
        type: 'first_timer',
        title: 'First Time Visitor',
        description: 'First visit to church',
      },
    ],
  },
};

// ============================================================================
// ADMIN VIEW DATA
// ============================================================================

export const mockTodaysFollowUps: FollowUpAssignment[] = [
  {
    id: 'fu-001',
    memberId: 'mem-001',
    memberName: 'Kwame Asante',
    assignedTo: 'vol-001',
    assignedToName: 'John Mensah',
    assignedDate: new Date('2025-12-28'),
    dueDate: new Date('2026-01-07'),
    status: 'In Progress',
    latestComment: 'Called and spoke with him. He is excited about the church.',
  },
  {
    id: 'fu-002',
    memberId: 'mem-006',
    memberName: 'Akua Frimpong',
    assignedTo: 'vol-003',
    assignedToName: 'Emmanuel Adjei',
    assignedDate: new Date('2025-12-29'),
    dueDate: new Date('2026-01-07'),
    status: 'In Progress',
    latestComment: 'First call made. She is interested in the youth ministry.',
  },
  {
    id: 'fu-003',
    memberId: 'mem-010',
    memberName: 'Adwoa Sarpong',
    assignedTo: 'vol-004',
    assignedToName: 'Priscilla Agyemang',
    assignedDate: new Date('2025-12-31'),
    dueDate: new Date('2026-01-07'),
    status: 'Assigned',
  },
];

export const mockNewFirstTimers: Member[] = mockMembers.filter(
  (m) => m.status === 'First Timer' && new Date(m.dateFirstCaptured) >= new Date('2025-12-01')
);

export const mockIncompleteEvangelism: EvangelismRecord[] = [
  {
    id: 'ev-001',
    firstName: 'Emmanuel',
    lastName: 'Tetteh',
    phone: '0508901234',
    date: new Date('2025-12-15'),
    dataCompleteness: 40,
    capturedBy: 'vol-005',
    capturedByName: 'Peter Asare',
  },
  {
    id: 'ev-002',
    firstName: 'Yaw',
    lastName: 'Mensah',
    phone: '0541234567',
    date: new Date('2025-12-22'),
    dataCompleteness: 70,
    capturedBy: 'vol-002',
    capturedByName: 'Grace Owusu',
  },
];

export const mockUnassignedMembers: Member[] = mockMembers.filter((m) => !m.followUpOwner);

export const mockVisitedMembers = mockMembers
  .filter((m) => m.visited && m.lastVisited)
  .map((m) => ({
    member: m,
    lastVisited: m.lastVisited!,
  }));

export const mockDepartmentRosters: DepartmentRoster[] = [
  {
    departmentId: 'dept-001',
    departmentName: 'Choir',
    members: [mockMembers[10]], // Daniel Osei
  },
  {
    departmentId: 'dept-002',
    departmentName: 'Ushers',
    members: [mockMembers[11]], // Sarah Adjei
  },
  {
    departmentId: 'dept-003',
    departmentName: 'Media',
    members: [mockMembers[12]], // Michael Owusu
  },
  {
    departmentId: 'dept-004',
    departmentName: 'Children',
    members: [mockMembers[13]], // Grace Amponsah
  },
  {
    departmentId: 'dept-005',
    departmentName: 'Youth',
    members: [mockMembers[10]], // Daniel Osei
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get mock KPIs for a service
 */
export function getMockKPIs(serviceId: string): ServiceKPIs | null {
  return mockKPIs[serviceId] || null;
}

/**
 * Get mock attendance breakdown for a service
 */
export function getMockAttendanceBreakdown(serviceId: string): AttendanceBreakdown | null {
  return mockAttendanceBreakdown[serviceId] || null;
}

/**
 * Get mock department attendance for a service
 */
export function getMockDepartmentAttendance(serviceId: string): DepartmentAttendance[] {
  return mockDepartmentAttendance[serviceId] || [];
}

/**
 * Get mock service attendees by category
 */
export function getMockServiceAttendees(serviceId: string, category: 'firstTimers' | 'returners' | 'evangelismContacts' | string): ServiceAttendee[] {
  const attendees = mockServiceAttendees[serviceId];
  if (!attendees) return [];
  
  if (category === 'firstTimers') return attendees.firstTimers;
  if (category === 'returners') return attendees.returners;
  if (category === 'evangelismContacts') return attendees.evangelismContacts;
  
  // Check if it's a department
  return attendees.departments[category] || [];
}

/**
 * Get mock member journey
 */
export function getMockMemberJourney(memberId: string): MemberJourney | null {
  // Return specific journey if exists
  if (mockMemberJourneys[memberId]) {
    return mockMemberJourneys[memberId];
  }
  
  // Generate a basic journey for any member
  const member = mockMembers.find((m) => m.id === memberId);
  if (!member) return null;
  
  const timeline: TimelineEvent[] = [
    {
      date: member.dateFirstCaptured,
      type: member.source === 'Evangelism' ? 'evangelism' : 'first_timer',
      title: member.source === 'Evangelism' ? 'Evangelism Contact' : 'First Time Visitor',
      description: `Recorded via ${member.source}`,
    },
  ];
  
  return {
    member,
    summary: {
      firstAttended: member.dateFirstCaptured,
      lastAttended: member.lastServiceAttended || member.dateFirstCaptured,
      visitsCount: member.visitsCount || 1,
      assignedFollowUpPerson: member.followUpOwnerName,
    },
    timeline,
  };
}

/**
 * Compare two services and return missing members (unidirectional)
 * Returns only members present in reference service but missing from comparison service
 */
export function getMockServiceComparison(referenceServiceId: string, comparisonServiceId: string): ServiceComparison {
  const serviceA = mockServices.find((s) => s.id === referenceServiceId) || mockServices[0];
  const serviceB = mockServices.find((s) => s.id === comparisonServiceId) || mockServices[1];
  
  // Simulate some members missing between services
  const missingInB = mockMembers.slice(0, 3);
  
  return {
    serviceA,
    serviceB,
    presentInAMissingInB: missingInB,
  };
}

/**
 * Search members by name, phone, or email
 */
export function searchMockMembers(query: string): Member[] {
  const lowerQuery = query.toLowerCase();
  return mockMembers.filter(
    (m) =>
      m.fullName.toLowerCase().includes(lowerQuery) ||
      m.phone?.includes(query) ||
      m.email?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filter services by date range
 */
export function filterMockServicesByDateRange(startDate: Date, endDate: Date): Service[] {
  return mockServices.filter((s) => {
    const serviceDate = new Date(s.serviceDate);
    return serviceDate >= startDate && serviceDate <= endDate;
  });
}

/**
 * Search services by name or date
 */
export function searchMockServices(query: string): Service[] {
  const lowerQuery = query.toLowerCase();
  return mockServices.filter(
    (s) =>
      s.serviceName.toLowerCase().includes(lowerQuery) ||
      s.serviceCode.toLowerCase().includes(lowerQuery)
  );
}
