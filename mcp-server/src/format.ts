/**
 * Markdown renderers. Every tool can answer in markdown (for a model to read)
 * or raw JSON (for programmatic use).
 */
import type { SessionUser } from "./api.js";

type Dict = Record<string, unknown>;

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;
const num = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const dict = (value: unknown): Dict => (typeof value === "object" && value !== null ? (value as Dict) : {});

export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n… output truncated at ${limit} characters. Ask for a smaller page (lower limit) for the rest.`;
}

export function renderSession(user: SessionUser): string {
  const lines = [
    `# Signed in as ${user.full_name}`,
    `- Role: ${user.role}${user.roles && user.roles.length > 1 ? ` (also: ${user.roles.filter((r) => r !== user.role).join(", ")})` : ""}`,
    `- Institutional ID: ${user.institutional_id ?? user.email}`,
    `- Department: ${user.department ?? "unassigned"}${user.section ? ` · Section ${user.section}` : ""}`
  ];
  return lines.join("\n");
}

export function renderStudentDashboard(data: Dict): string {
  const student = dict(data.student);
  const overall = dict(data.overall_attendance);
  const weekly = dict(data.weekly ?? data.weekly_activity);
  const phone = dict(weekly.phone);
  const talking = dict(weekly.talking);
  const current = dict(data.current_class);

  const lines = [
    `# ${str(student.full_name, "Student")} - ${str(student.section, "section")} · ${str(data.today, "today")}`,
    "",
    `Overall attendance: **${num(overall.attendance_percentage).toFixed(1)}%** ` +
      `(${num(overall.classes_attended)}/${num(overall.classes_conducted)} classes, status ${str(overall.status, "n/a")})`
  ];

  if (Object.keys(current).length > 0) {
    lines.push(
      "",
      `## Current class: ${str(current.subject_name)} (${str(current.subject_code)})`,
      `- ${str(current.scheduled_time, "?")}-${str(current.scheduled_end, "?")} · ${str(current.room_number, "room TBA")} · ${str(current.faculty_name, "faculty TBA")}`,
      `- Status: ${str(current.status)} · attendance taken: ${current.attendance_taken ? "yes" : "no"}` +
        (current.my_attendance_status ? ` · your mark: ${str(current.my_attendance_status)}` : "")
    );
  }

  const subjects = list<Dict>(data.subject_attendance);
  if (subjects.length > 0) {
    lines.push("", "## Subject attendance");
    for (const subject of subjects) {
      lines.push(
        `- ${str(subject.subject_code)} ${str(subject.subject_name)}: ${num(subject.attendance_percentage).toFixed(1)}% ` +
          `(${num(subject.classes_attended)}/${num(subject.classes_conducted)}) - ${str(subject.status)}`
      );
    }
  }

  const schedule = list<Dict>(data.schedule);
  if (schedule.length > 0) {
    lines.push("", "## Today's schedule");
    for (const item of schedule) {
      lines.push(
        `- ${str(item.scheduled_time, "?")} ${str(item.subject_code)} ${str(item.subject_name)} - ${str(item.room_number, "room TBA")} (${str(item.status)})`
      );
    }
  }

  lines.push(
    "",
    "## Observable activity (anonymous event counters at your desk)",
    `- Phone events: ${num(phone.this_week)} this week vs ${num(phone.last_week)} last week (${str(phone.trend, "UNCHANGED")})`,
    `- Talking events: ${num(talking.this_week)} this week vs ${num(talking.last_week)} last week (${str(talking.trend, "UNCHANGED")})`,
    `- Unread notifications: ${num(data.notifications_unread)}`
  );

  const alerts = list<Dict>(data.alerts);
  if (alerts.length > 0) {
    lines.push("", "## Recent incidents");
    for (const alert of alerts.slice(0, 5)) {
      lines.push(`- [${str(alert.severity)}] ${str(alert.title)} - ${str(alert.status)}`);
    }
  }
  return lines.join("\n");
}

export function renderSubjectAttendance(subjects: Dict[]): string {
  if (subjects.length === 0) return "No attendance records exist yet for this student.";
  const lines = ["# Subject-wise attendance", ""];
  for (const subject of subjects) {
    lines.push(
      `- **${str(subject.subject_code)} ${str(subject.subject_name)}** - ${num(subject.attendance_percentage).toFixed(1)}% ` +
        `(${num(subject.classes_attended)}/${num(subject.classes_conducted)} classes, ${num(subject.classes_missed)} missed, ` +
        `${num(subject.classes_unverified)} unverified) → ${str(subject.status)}`
    );
  }
  return lines.join("\n");
}

export function renderStudentActivity(data: Dict): string {
  const counts = dict(data.counts);
  const weekly = dict(data.weekly ?? data.weekly_activity);
  const lines = [
    "# Observable classroom activity",
    `Desk marker: ${str(data.desk_marker, "unassigned")}`,
    `Totals: PHONE ${num(counts.PHONE)}, TALKING ${num(counts.TALKING)}, OUT_OF_SEAT ${num(counts.OUT_OF_SEAT)}`,
    Object.keys(weekly).length > 0
      ? `This week vs last week: phone ${num(dict(weekly.phone).this_week)}/${num(dict(weekly.phone).last_week)}, ` +
        `talking ${num(dict(weekly.talking).this_week)}/${num(dict(weekly.talking).last_week)}`
      : "",
    `Recorded events returned: ${num(data.total_recorded_events)}`
  ].filter(Boolean);
  const events = list<Dict>(data.events);
  if (events.length > 0) {
    lines.push("", "## Most recent events");
    for (const event of events.slice(0, 10)) {
      lines.push(`- ${str(event.timestamp)} · ${str(event.event_code)} · ${str(event.subject_name, "class")}`);
    }
  }
  return lines.join("\n");
}

export function renderFacultyClasses(data: Dict): string {
  const classes = list<Dict>(data.classes);
  const summary = dict(data.summary);
  const lines = [
    `# Today's classes - ${str(dict(data.faculty).full_name, "faculty")} (${str(data.today)})`,
    `Scheduled: ${num(summary.scheduled, classes.length)} · completed: ${num(summary.completed)} · attendance rate: ${num(summary.attendance_rate).toFixed(1)}%`,
    ""
  ];
  if (classes.length === 0) lines.push("No classes are scheduled today.");
  for (const item of classes) {
    lines.push(
      `- ${str(item.scheduled_time, "?")} **${str(item.subject_code)} ${str(item.subject_name)}** · ${str(item.section_name, "section")} · ` +
        `${str(item.room_number, "room TBA")} (${str(item.status)})` +
        (item.attendance_taken
          ? ` · present ${num(item.present_count)}, late ${num(item.late_count)}, unverified ${num(item.unverified_count)}, absent ${num(item.absent_count)} of ${num(item.total_enrolled)}`
          : " · attendance not taken") +
        `\n  session_id: \`${str(item.id)}\``
    );
  }
  return lines.join("\n");
}

export function renderFacultyDashboard(data: Dict): string {
  const kpis = dict(data.kpis);
  const lines = [
    `# Faculty dashboard - ${str(dict(data.faculty).full_name, "faculty")}`,
    `- Classes today: ${num(kpis.classes_today)} (completed ${num(kpis.classes_completed)})`,
    `- Attendance rate today: ${num(kpis.attendance_rate_today).toFixed(1)}%`,
    `- Pending review: ${num(kpis.pending_reviews)} records`,
    `- Activity events (7 days): ${num(kpis.activity_events_7d)}`
  ];
  const trend = list<Dict>(data.attendance_trend);
  if (trend.length > 0) {
    lines.push("", "## Recent sessions");
    for (const row of trend) {
      lines.push(
        `- ${str(row.session_date)} ${str(row.subject_code)} (${str(row.section_name)}): ` +
          `${num(row.attendance_percentage).toFixed(1)}% present, ${num(row.unverified)} unverified · session_id \`${str(row.session_id)}\``
      );
    }
  }
  const alerts = list<Dict>(data.alerts);
  if (alerts.length > 0) {
    lines.push("", "## Open incidents");
    for (const alert of alerts.slice(0, 6)) {
      lines.push(`- [${str(alert.severity)}] ${str(alert.title)} (${str(alert.source)} · ${str(alert.status)})`);
    }
  }
  return lines.join("\n");
}

export function renderAttendanceSession(data: Dict): string {
  const lines = [
    `# Attendance - ${str(data.subject_code)} ${str(data.subject_name)} · ${str(data.section_name, "section")}`,
    `Status: ${str(data.status)} · finalized: ${data.is_finalized ? "yes" : "no"}`,
    `Present ${num(data.present_count)} · late ${num(data.late_count)} · unverified ${num(data.unverified_count)} · absent ${num(data.absent_count)} of ${num(data.total_enrolled)}`,
    ""
  ];
  const records = list<Dict>(data.records);
  if (records.length === 0) lines.push("No attendance records for this session.");
  for (const record of records.slice(0, 50)) {
    lines.push(
      `- ${str(record.roll_number)} ${str(record.student_name)}: ${str(record.status)}` +
        (record.manual_override ? " (manual override)" : "") +
        ` · record_id \`${str(record.id)}\``
    );
  }
  if (records.length > 50) lines.push(`… ${records.length - 50} more records omitted; request the raw JSON for the full roster.`);
  return lines.join("\n");
}

export function renderActivitySummary(data: Dict): string {
  const students = list<Dict>(data.students);
  const lines = [
    `# Session activity summary (session ${str(data.class_session_id)})`,
    `Total observed events: ${num(data.total_events)} across ${num(data.covered_desks)} desks`,
    ""
  ];
  if (students.length === 0) return lines.concat("No anonymous activity events were recorded for this session.").join("\n");
  for (const student of students.slice(0, 20)) {
    lines.push(
      `- ${str(student.roll_number)} ${str(student.student_name)}: phone ${num(student.phone_event_count)}, ` +
        `talking ${num(student.talking_event_count)}, other ${num(student.other_event_count)}`
    );
  }
  return lines.join("\n");
}

export function renderHodDashboard(data: Dict): string {
  const kpis = dict(data.kpis);
  const department = dict(data.department);
  const lines = [
    `# ${str(department.name, "Department")} governance dashboard · ${str(data.today)}`,
    `- Students ${num(kpis.students)} · faculty ${num(kpis.faculty)} · sections ${num(kpis.sections)} · subjects ${num(kpis.subjects)}`,
    `- Attendance today: **${num(kpis.today_attendance_percentage).toFixed(1)}%**`,
    `- Students below 75%: ${num(kpis.at_risk_students)}`
  ];
  const sessions = list<Dict>(data.sessions_today);
  if (sessions.length > 0) {
    lines.push("", "## Sessions today");
    for (const session of sessions) {
      lines.push(
        `- ${str(session.scheduled_time, "?")} ${str(session.subject_code)} ${str(session.subject_name)} · ${str(session.section_name)} · ${str(session.faculty_name, "faculty TBA")} (${str(session.status)})`
      );
    }
  }
  const subjects = list<Dict>(data.subject_attendance);
  if (subjects.length > 0) {
    lines.push("", "## Subject attendance");
    for (const subject of subjects) {
      lines.push(`- ${str(subject.subject_code)} ${str(subject.subject_name)}: ${num(subject.attendance_percentage).toFixed(1)}%`);
    }
  }
  const atRisk = list<Dict>(data.at_risk_students);
  if (atRisk.length > 0) {
    lines.push("", "## Students below 75%");
    for (const student of atRisk.slice(0, 10)) {
      lines.push(
        `- ${str(student.roll_number)} ${str(student.full_name)} (${str(student.section_name)}): ${num(student.attendance_percentage).toFixed(1)}%`
      );
    }
  }
  return lines.join("\n");
}

export function renderStudents(students: Dict[], offset: number, limit: number): { text: string; nextOffset?: number } {
  const page = students.slice(offset, offset + limit);
  const lines = [`# Students (${students.length} in scope)`, ""];
  for (const student of page) {
    lines.push(
      `- ${str(student.roll_number)} ${str(student.full_name)} (${str(student.section_name)}): ` +
        `${num(student.attendance_percentage).toFixed(1)}% · ${str(student.status)} · ${num(student.classes_unverified)} unverified`
    );
  }
  const nextOffset = offset + page.length < students.length ? offset + page.length : undefined;
  if (nextOffset !== undefined) lines.push("", `More results: call again with offset=${nextOffset}.`);
  return { text: lines.join("\n"), nextOffset };
}

export function renderFaculty(faculty: Dict[]): string {
  const lines = ["# Faculty roster", ""];
  for (const member of faculty) {
    lines.push(
      `- ${str(member.full_name)} (${str(member.employee_code)}, ${str(member.designation)}): ` +
        `${num(member.weekly_slots)} weekly slots · ${num(member.sessions_conducted)} sessions · ` +
        `attendance ${num(member.attendance_percentage).toFixed(1)}% · subjects ${list<string>(member.subject_codes).join(", ") || "none"}`
    );
  }
  return lines.join("\n");
}

export function renderIncidents(incidents: Dict[]): string {
  if (incidents.length === 0) return "No safety incidents have been recorded.";
  const lines = ["# Safety incidents", ""];
  for (const incident of incidents) {
    lines.push(
      `- [${str(incident.severity)}] ${str(incident.title)} · ${str(incident.status)} · ${str(incident.timestamp)}` +
        `\n  source ${str(incident.source)} · id \`${str(incident.id)}\`${incident.room_number ? ` · ${str(incident.room_number)}` : ""}`
    );
  }
  return lines.join("\n");
}

export function renderNotifications(items: Dict[], offset: number, limit: number): { text: string; nextOffset?: number } {
  const page = items.slice(offset, offset + limit);
  const unread = items.filter((item) => item.is_read === false).length;
  const lines = [`# Notifications (${items.length} total, ${unread} unread)`, ""];
  if (page.length === 0) lines.push("No notifications on this page.");
  for (const item of page) {
    lines.push(
      `- ${item.is_read === false ? "●" : "○"} [${str(item.category)}] **${str(item.title)}** - ${str(item.message)} (${str(item.created_at)})`
    );
  }
  const nextOffset = offset + page.length < items.length ? offset + page.length : undefined;
  if (nextOffset !== undefined) lines.push("", `More results: call again with offset=${nextOffset}.`);
  return { text: lines.join("\n"), nextOffset };
}

export function renderIncidentHistory(data: Dict): string {
  const history = list<Dict>(data.history);
  const lines = [`# Incident history (${str(data.source)} ${str(data.incident_id)})`, ""];
  if (history.length === 0) lines.push("No transitions recorded yet.");
  for (const entry of history) {
    lines.push(`- ${str(entry.timestamp)} · ${str(entry.stage)} by ${str(entry.actor, "system")}: ${str(entry.action)}`);
  }
  return lines.join("\n");
}
