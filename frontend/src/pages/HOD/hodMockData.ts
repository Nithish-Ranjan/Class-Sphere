// ============================================================================
// CLASSSPHERE PHASE 5: HOD GOVERNANCE RECONCILED DATA & DEMO DIRECTORIES
// Grounded strictly in CampusPulse Blueprint Page 15 (HOD Review) & Page 20 (Workflow)
// All data is explicitly labelled DEMO DATA / BLUEPRINT REFERENCE VALUES.
// ============================================================================

export interface HODFacultyRecord {
  id: string;
  name: string;
  designation: string;
  email: string;
  classesCount: number;
  eventsCount: number;
  alertsCount: number;
  phoneEvents: number;
  talkingEvents: number;
  outEvents: number;
  assignedSubjects: string[];
  assignedRooms: string[];
  scheduleSummary: string;
}

export interface HODClassOverviewItem {
  id: string;
  subjectName: string;
  subjectCode: string;
  section: string;
  room: string;
  facultyName: string;
  enrolled: number;
  present: number;
  late: number;
  unverified: number;
  alertsCount: number;
  timeSlot: string;
  status: 'Completed' | 'In Progress' | 'Scheduled';
  unverifiedNotes?: string[];
}

export interface HODStudentItem {
  id: string;
  name: string;
  rollNumber: string;
  section: 'CSE-A' | 'CSE-B';
  registrationStatus: 'DEMO_REGISTERED' | 'DEMO_PENDING_REGISTRATION';
  enrolledClasses: number;
  phoneEvents: number;
  talkingEvents: number;
  outEvents: number;
  attendanceRefPercent: number; // Demo reference value
  recentEvents: {
    id: string;
    type: 'PHONE' | 'TALKING' | 'OUT';
    classCode: string;
    timestamp: string;
    room: string;
  }[];
}

export interface TimetableSlotItem {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  section: 'CSE-A' | 'CSE-B';
  room: string;
  status: 'mapped' | 'unrecognized' | 'conflict';
  rawTokenNote?: string;
}

export interface HODAlertItem {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'SAFETY' | 'ATTENDANCE' | 'SCHEDULE' | 'TELEMETRY';
  title: string;
  description: string;
  location: string;
  facultyName?: string;
  classCode?: string;
  timestamp: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  resolutionNotes?: string;
}

export interface HODIncidentItem {
  id: string;
  incidentType: 'EMERGENCY_SOS' | 'SAFETY_ALARM' | 'FACULTY_ASSIST';
  location: string;
  room: string;
  reportedBy: string;
  timestamp: string;
  stage: 'DETECT' | 'CHECK' | 'RECOVERED' | 'DONE';
  description: string;
  dispatchDetails: string;
  logs: {
    stage: string;
    timestamp: string;
    actor: string;
    note: string;
  }[];
}

// ----------------------------------------------------------------------------
// 1. Department Information & Reconciled Aggregates
// ----------------------------------------------------------------------------
export const HOD_DEPARTMENT_INFO = {
  department: 'Computer Science & Engineering',
  code: 'CSE',
  academicYear: '2025-2026',
  semester: 'Semester 5 (Odd Semester)',
  hodName: 'Dr. Suresh Nair',
  hodId: 'HOD-CSE-001',
  hodEmail: 'hod@classsphere.edu',
  reportingPeriod: "Today's Completed Sessions (CSE Department, 6 Class Sessions)",
  totalFaculty: 3,
  totalUniqueStudents: 93,
  totalStudentClassInstances: 276,
  totalPresentInstances: 253,
  totalLateInstances: 13,
  totalUnverifiedInstances: 10,
  presentRateBenchmark: 91.7, // Formula: 253 / 276 = 91.666% -> 91.7%
  totalActiveClasses: 6,
  totalObservableEvents: 41, // Reconciled: 24 (Kumar) + 11 (Nair) + 6 (Shetty) = 41
  totalPhoneEvents: 26,     // Reconciled: 14 + 8 + 4 = 26
  totalTalkingEvents: 11,   // Reconciled: 7 + 2 + 2 = 11
  totalOutEvents: 4,        // Reconciled: 3 + 1 + 0 = 4
  activeAlertsCount: 4,
  pendingApprovalsCount: 2,
};

// ----------------------------------------------------------------------------
// 2. Faculty Overview Data (Blueprint Page 15: Reconciled 24 + 11 + 6 = 41 events)
// ----------------------------------------------------------------------------
export const HOD_FACULTY_LIST: HODFacultyRecord[] = [
  {
    id: 'FAC-2026-0104',
    name: 'Dr. Suresh Kumar',
    designation: 'Associate Professor',
    email: 's.kumar@classsphere.edu',
    classesCount: 6,
    eventsCount: 24, // 14 Phone + 7 Talking + 3 Out = 24
    alertsCount: 3,
    phoneEvents: 14,
    talkingEvents: 7,
    outEvents: 3,
    assignedSubjects: ['Database Management Systems (CS301)', 'Operating Systems (CS304)'],
    assignedRooms: ['Room 204', 'Room 105'],
    scheduleSummary: 'Mon/Wed/Fri: 10:00 AM (CS301) | Tue/Thu: 02:15 PM (CS304)',
  },
  {
    id: 'FAC-2026-0108',
    name: 'Prof. Ananya Nair',
    designation: 'Assistant Professor',
    email: 'a.nair@classsphere.edu',
    classesCount: 5,
    eventsCount: 11, // 8 Phone + 2 Talking + 1 Out = 11
    alertsCount: 1,
    phoneEvents: 8,
    talkingEvents: 2,
    outEvents: 1,
    assignedSubjects: ['Computer Networks (CS302)', 'Database Management Systems Lab (CS301-B)'],
    assignedRooms: ['Room 307', 'Room 301'],
    scheduleSummary: 'Mon/Wed: 11:15 AM (CS302) | Tue/Thu: 10:00 AM (CS301-B)',
  },
  {
    id: 'FAC-2026-0092',
    name: 'Dr. Rajesh Shetty',
    designation: 'Professor',
    email: 'r.shetty@classsphere.edu',
    classesCount: 4,
    eventsCount: 6, // 4 Phone + 2 Talking + 0 Out = 6
    alertsCount: 0,
    phoneEvents: 4,
    talkingEvents: 2,
    outEvents: 0,
    assignedSubjects: ['Java Programming & Systems (CS303)', 'Discrete Mathematics (MA301)'],
    assignedRooms: ['Room 301', 'Room 204'],
    scheduleSummary: 'Mon/Wed: 01:00 PM (CS303) | Tue/Thu: 03:30 PM (MA301)',
  },
];

// ----------------------------------------------------------------------------
// 3. Class Overview Data (Blueprint Page 15: 276 Total Instances, 253 Present, 13 Late, 10 Unverified)
// ----------------------------------------------------------------------------
export const HOD_CLASSES_LIST: HODClassOverviewItem[] = [
  {
    id: 'CLS-CS301-A',
    subjectName: 'Database Management Systems',
    subjectCode: 'CS301',
    section: 'CSE-A',
    room: 'Room 204',
    facultyName: 'Dr. Suresh Kumar',
    enrolled: 47,
    present: 42,
    late: 3,
    unverified: 2,
    alertsCount: 2,
    timeSlot: '10:00 - 11:00 AM',
    status: 'Completed',
    unverifiedNotes: [
      'Roll 26: Rear-row illumination obstruction during capture',
      'Roll 41: Angle of view obscured by adjacent student movement',
    ],
  },
  {
    id: 'CLS-CS302-A',
    subjectName: 'Computer Networks',
    subjectCode: 'CS302',
    section: 'CSE-A',
    room: 'Room 307',
    facultyName: 'Prof. Ananya Nair',
    enrolled: 45,
    present: 41,
    late: 2,
    unverified: 2,
    alertsCount: 1,
    timeSlot: '11:15 - 12:15 PM',
    status: 'In Progress',
    unverifiedNotes: [
      'Roll 14: Hand gesture obscured facial region',
      'Roll 38: Camera angle reflection from laboratory glass',
    ],
  },
  {
    id: 'CLS-CS303-A',
    subjectName: 'Java Programming & Systems',
    subjectCode: 'CS303',
    section: 'CSE-A',
    room: 'Room 301',
    facultyName: 'Dr. Rajesh Shetty',
    enrolled: 48,
    present: 45,
    late: 1,
    unverified: 2,
    alertsCount: 0,
    timeSlot: '01:00 - 02:00 PM',
    status: 'Scheduled',
    unverifiedNotes: [
      'Roll 03: Session not yet conducted (scheduled estimate)',
      'Roll 19: Session not yet conducted (scheduled estimate)',
    ],
  },
  {
    id: 'CLS-CS304-B',
    subjectName: 'Operating Systems',
    subjectCode: 'CS304',
    section: 'CSE-B',
    room: 'Room 105',
    facultyName: 'Dr. Suresh Kumar',
    enrolled: 46,
    present: 40,
    late: 4,
    unverified: 2,
    alertsCount: 1,
    timeSlot: '02:15 - 03:15 PM',
    status: 'Scheduled',
    unverifiedNotes: [
      'Roll 08: Session not yet conducted (scheduled estimate)',
      'Roll 29: Session not yet conducted (scheduled estimate)',
    ],
  },
  {
    id: 'CLS-MA301-B',
    subjectName: 'Discrete Mathematics',
    subjectCode: 'MA301',
    section: 'CSE-B',
    room: 'Room 204',
    facultyName: 'Dr. Rajesh Shetty',
    enrolled: 44,
    present: 42,
    late: 1,
    unverified: 1,
    alertsCount: 0,
    timeSlot: '03:30 - 04:30 PM',
    status: 'Scheduled',
    unverifiedNotes: ['Roll 12: Session not yet conducted (scheduled estimate)'],
  },
  {
    id: 'CLS-CS301-B',
    subjectName: 'Database Management Systems Lab',
    subjectCode: 'CS301-B',
    section: 'CSE-B',
    room: 'Room 301',
    facultyName: 'Prof. Ananya Nair',
    enrolled: 46,
    present: 43,
    late: 2,
    unverified: 1,
    alertsCount: 0,
    timeSlot: '10:00 - 11:00 AM',
    status: 'Completed',
    unverifiedNotes: ['Roll 33: Screen backlight glare across terminal desk'],
  },
];

// ----------------------------------------------------------------------------
// 4. Department Student Cohort Roster (Neutral, zero behavioral scoring)
// ----------------------------------------------------------------------------
export const HOD_STUDENTS_LIST: HODStudentItem[] = [
  {
    id: 'STU-2026-001',
    name: 'Aarav Patel',
    rollNumber: 'CSE24-001',
    section: 'CSE-A',
    registrationStatus: 'DEMO_REGISTERED',
    enrolledClasses: 6,
    phoneEvents: 1,
    talkingEvents: 1,
    outEvents: 0,
    attendanceRefPercent: 91.2,
    recentEvents: [
      { id: 'EV-101', type: 'PHONE', classCode: 'CS301', timestamp: '10:18 AM', room: 'Room 204' },
      { id: 'EV-102', type: 'TALKING', classCode: 'CS302', timestamp: '11:40 AM', room: 'Room 307' },
    ],
  },
  {
    id: 'STU-2026-002',
    name: 'Aditi Sharma',
    rollNumber: 'CSE24-002',
    section: 'CSE-A',
    registrationStatus: 'DEMO_REGISTERED',
    enrolledClasses: 6,
    phoneEvents: 0,
    talkingEvents: 0,
    outEvents: 0,
    attendanceRefPercent: 95.8,
    recentEvents: [],
  },
  {
    id: 'STU-2026-003',
    name: 'Ananya Krishnan',
    rollNumber: 'CSE24-003',
    section: 'CSE-A',
    registrationStatus: 'DEMO_REGISTERED',
    enrolledClasses: 6,
    phoneEvents: 2,
    talkingEvents: 0,
    outEvents: 0,
    attendanceRefPercent: 88.5,
    recentEvents: [
      { id: 'EV-103', type: 'PHONE', classCode: 'CS301', timestamp: '10:32 AM', room: 'Room 204' },
      { id: 'EV-104', type: 'PHONE', classCode: 'CS303', timestamp: '01:25 PM', room: 'Room 301' },
    ],
  },
  {
    id: 'STU-2026-004',
    name: 'Devansh Reddy',
    rollNumber: 'CSE24-004',
    section: 'CSE-A',
    registrationStatus: 'DEMO_REGISTERED',
    enrolledClasses: 6,
    phoneEvents: 1,
    talkingEvents: 1,
    outEvents: 1,
    attendanceRefPercent: 82.0,
    recentEvents: [
      { id: 'EV-105', type: 'TALKING', classCode: 'CS301', timestamp: '10:44 AM', room: 'Room 204' },
      { id: 'EV-106', type: 'OUT', classCode: 'CS302', timestamp: '11:50 AM', room: 'Room 307' },
    ],
  },
  {
    id: 'STU-2026-005',
    name: 'Ishaan Verma',
    rollNumber: 'CSE24-005',
    section: 'CSE-A',
    registrationStatus: 'DEMO_PENDING_REGISTRATION',
    enrolledClasses: 6,
    phoneEvents: 0,
    talkingEvents: 1,
    outEvents: 0,
    attendanceRefPercent: 78.4,
    recentEvents: [
      { id: 'EV-107', type: 'TALKING', classCode: 'CS301', timestamp: '10:22 AM', room: 'Room 204' },
    ],
  },
  {
    id: 'STU-2026-006',
    name: 'Kavya Pillai',
    rollNumber: 'CSE24-006',
    section: 'CSE-B',
    registrationStatus: 'DEMO_REGISTERED',
    enrolledClasses: 6,
    phoneEvents: 1,
    talkingEvents: 0,
    outEvents: 0,
    attendanceRefPercent: 93.1,
    recentEvents: [
      { id: 'EV-108', type: 'PHONE', classCode: 'CS304', timestamp: '02:40 PM', room: 'Room 105' },
    ],
  },
  {
    id: 'STU-2026-007',
    name: 'Manish Iyer',
    rollNumber: 'CSE24-007',
    section: 'CSE-B',
    registrationStatus: 'DEMO_REGISTERED',
    enrolledClasses: 6,
    phoneEvents: 1,
    talkingEvents: 0,
    outEvents: 1,
    attendanceRefPercent: 86.4,
    recentEvents: [
      { id: 'EV-109', type: 'OUT', classCode: 'CS301-B', timestamp: '10:48 AM', room: 'Room 301' },
      { id: 'EV-110', type: 'PHONE', classCode: 'MA301', timestamp: '03:55 PM', room: 'Room 204' },
    ],
  },
  {
    id: 'STU-2026-008',
    name: 'Meera Nambiar',
    rollNumber: 'CSE24-008',
    section: 'CSE-B',
    registrationStatus: 'DEMO_REGISTERED',
    enrolledClasses: 6,
    phoneEvents: 0,
    talkingEvents: 0,
    outEvents: 0,
    attendanceRefPercent: 97.2,
    recentEvents: [],
  },
];

// ----------------------------------------------------------------------------
// 5. Initial Timetable Grid (Manual Data Entry & Sample Fixture Tokens)
// ----------------------------------------------------------------------------
export const INITIAL_TIMETABLE_SLOTS: TimetableSlotItem[] = [
  {
    id: 'TT-01',
    day: 'Monday',
    startTime: '10:00',
    endTime: '11:00',
    subjectCode: 'CS301',
    subjectName: 'Database Management Systems',
    facultyName: 'Dr. Suresh Kumar',
    section: 'CSE-A',
    room: 'Room 204',
    status: 'mapped',
    rawTokenNote: 'Sample Fixture Token — Not OCR Output',
  },
  {
    id: 'TT-02',
    day: 'Monday',
    startTime: '11:15',
    endTime: '12:15',
    subjectCode: 'CS302',
    subjectName: 'Computer Networks',
    facultyName: 'Prof. Ananya Nair',
    section: 'CSE-A',
    room: 'Room 307',
    status: 'mapped',
    rawTokenNote: 'Sample Fixture Token — Not OCR Output',
  },
  {
    id: 'TT-03',
    day: 'Monday',
    startTime: '13:00',
    endTime: '14:00',
    subjectCode: 'CS303',
    subjectName: 'Java Programming & Systems',
    facultyName: 'Dr. Rajesh Shetty',
    section: 'CSE-A',
    room: 'Room 301',
    status: 'mapped',
    rawTokenNote: 'Sample Fixture Token — Not OCR Output',
  },
  {
    id: 'TT-04',
    day: 'Tuesday',
    startTime: '10:00',
    endTime: '11:00',
    subjectCode: 'CS301-B',
    subjectName: 'Database Management Systems Lab',
    facultyName: 'Prof. Ananya Nair',
    section: 'CSE-B',
    room: 'Room 301',
    status: 'mapped',
    rawTokenNote: 'Sample Fixture Token — Not OCR Output',
  },
  {
    id: 'TT-05',
    day: 'Tuesday',
    startTime: '14:15',
    endTime: '15:15',
    subjectCode: 'CS304',
    subjectName: 'Operating Systems',
    facultyName: 'Dr. Suresh Kumar',
    section: 'CSE-B',
    room: 'Room 105',
    status: 'mapped',
    rawTokenNote: 'Sample Fixture Token — Not OCR Output',
  },
  {
    id: 'TT-06',
    day: 'Wednesday',
    startTime: '10:00',
    endTime: '11:00',
    subjectCode: 'CS301',
    subjectName: 'Database Management Systems',
    facultyName: 'Dr. Suresh Kumar',
    section: 'CSE-A',
    room: 'Room 204',
    status: 'mapped',
    rawTokenNote: 'Sample Fixture Token — Not OCR Output',
  },
  {
    id: 'TT-07',
    day: 'Wednesday',
    startTime: '15:30',
    endTime: '16:30',
    subjectCode: 'MA301',
    subjectName: 'Discrete Mathematics',
    facultyName: 'Dr. Rajesh Shetty',
    section: 'CSE-B',
    room: 'Room 204',
    status: 'mapped',
    rawTokenNote: 'Sample Fixture Token — Not OCR Output',
  },
  {
    id: 'TT-08',
    day: 'Thursday',
    startTime: '11:15',
    endTime: '12:15',
    subjectCode: 'CS302',
    subjectName: 'Computer Networks',
    facultyName: 'Prof. Ananya Nair',
    section: 'CSE-A',
    room: 'Room 307',
    status: 'mapped',
    rawTokenNote: 'Sample Fixture Token — Not OCR Output',
  },
  {
    id: 'TT-09',
    day: 'Friday',
    startTime: '10:00',
    endTime: '11:00',
    subjectCode: 'CS301',
    subjectName: 'Database Management Systems',
    facultyName: 'Dr. Suresh Kumar',
    section: 'CSE-A',
    room: 'Room 204',
    status: 'mapped',
    rawTokenNote: 'Sample Fixture Token — Not OCR Output',
  },
  {
    id: 'TT-10',
    day: 'Friday',
    startTime: '14:15',
    endTime: '15:15',
    subjectCode: 'CS304',
    subjectName: 'Operating Systems',
    facultyName: 'Dr. Suresh Kumar',
    section: 'CSE-B',
    room: 'Room 105',
    status: 'mapped',
    rawTokenNote: 'Sample Fixture Token — Not OCR Output',
  },
];

// Demo Institutional Directories (until actual integration)
export const INSTITUTIONAL_FACULTY = [
  'Dr. Suresh Kumar',
  'Prof. Ananya Nair',
  'Dr. Rajesh Shetty',
];

export const INSTITUTIONAL_SUBJECTS = [
  { code: 'CS301', name: 'Database Management Systems' },
  { code: 'CS302', name: 'Computer Networks' },
  { code: 'CS303', name: 'Java Programming & Systems' },
  { code: 'CS304', name: 'Operating Systems' },
  { code: 'MA301', name: 'Discrete Mathematics' },
  { code: 'CS301-B', name: 'Database Management Systems Lab' },
];

export const INSTITUTIONAL_SECTIONS = ['CSE-A', 'CSE-B'] as const;

export const INSTITUTIONAL_ROOMS = [
  'Room 204',
  'Room 307',
  'Room 301',
  'Room 105',
];

// ----------------------------------------------------------------------------
// 6. Department Alerts List
// ----------------------------------------------------------------------------
export const HOD_ALERTS_LIST: HODAlertItem[] = [
  {
    id: 'ALT-2026-081',
    severity: 'CRITICAL',
    category: 'SAFETY',
    title: 'Emergency Medical Assistance Triggered',
    description: 'Hallway emergency push button activated near Room 204 (Hardware Lab Block). Campus First Responder dispatch notified.',
    location: 'Block C, 2nd Floor, Room 204 Corridor',
    classCode: 'CS301',
    facultyName: 'Dr. Suresh Kumar',
    timestamp: 'Today, 10:22 AM',
    status: 'ACTIVE',
  },
  {
    id: 'ALT-2026-082',
    severity: 'WARNING',
    category: 'ATTENDANCE',
    title: 'Attendance Discrepancy Flagged',
    description: 'DBMS CS301 (CSE-A): 2 unverified student facial frames flagged due to rear-window lighting obstruction. Manual faculty roll-call required.',
    location: 'Room 204',
    classCode: 'CS301',
    facultyName: 'Dr. Suresh Kumar',
    timestamp: 'Today, 10:45 AM',
    status: 'ACTIVE',
  },
  {
    id: 'ALT-2026-083',
    severity: 'WARNING',
    category: 'SCHEDULE',
    title: 'Potential Room Allocation Collision',
    description: 'Room 204 has overlapping lab setup booking request for Friday 02:00 PM against scheduled CS301 tutorial.',
    location: 'Room 204',
    classCode: 'CS301',
    facultyName: 'Dr. Suresh Kumar',
    timestamp: 'Today, 09:15 AM',
    status: 'ACKNOWLEDGED',
  },
  {
    id: 'ALT-2026-084',
    severity: 'INFO',
    category: 'TELEMETRY',
    title: 'Observable Phone Usage Rate Notice',
    description: 'CN CS302 (CSE-A): 8 phone interaction events logged during 45-minute lab configuration period.',
    location: 'Room 307',
    classCode: 'CS302',
    facultyName: 'Prof. Ananya Nair',
    timestamp: 'Today, 11:35 AM',
    status: 'ACTIVE',
  },
];

// ----------------------------------------------------------------------------
// 7. Active Escalation SOS Incident (CampusPulse 4-stage lifecycle)
// ----------------------------------------------------------------------------
export const HOD_ACTIVE_INCIDENT: HODIncidentItem = {
  id: 'INC-2026-CSE-09',
  incidentType: 'EMERGENCY_SOS',
  location: 'Lab Block C, Room 204 East Annex',
  room: 'Room 204',
  reportedBy: 'Student Terminal Station & Faculty Call',
  timestamp: 'Today, 10:22 AM',
  stage: 'CHECK',
  description: 'Student distress call triggered at hallway terminal station adjacent to Room 204 during CS301 lecture. First aid medical kit deployed.',
  dispatchDetails: 'Campus Medical Dispatch Unit-2 mobilized. Floor Marshall confirmed on-site.',
  logs: [
    {
      stage: 'DETECT',
      timestamp: '10:22:14 AM',
      actor: 'Automated Safety Terminal',
      note: 'Emergency distress button triggered in Block C corridor.',
    },
    {
      stage: 'DETECT',
      timestamp: '10:22:30 AM',
      actor: 'ClassSphere System',
      note: 'Broadcast SMS alert dispatched to HOD Dr. Suresh Nair & Security Control.',
    },
    {
      stage: 'CHECK',
      timestamp: '10:24:05 AM',
      actor: 'Floor Marshall (Prof. Ananya Nair)',
      note: 'Arrived at scene. Student conscious, experiencing acute dehydration. First responder attending.',
    },
  ],
};
