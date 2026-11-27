/**
 * Read-only tools across the student, faculty and HOD consoles.
 */
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { apiRequest } from "../api.js";
import { CHARACTER_LIMIT, ResponseFormat } from "../constants.js";
import {
  renderActivitySummary,
  renderAttendanceSession,
  renderFaculty,
  renderFacultyClasses,
  renderFacultyDashboard,
  renderHodDashboard,
  renderIncidents,
  renderNotifications,
  renderStudentActivity,
  renderStudentDashboard,
  renderStudents,
  renderSubjectAttendance,
  truncate
} from "../format.js";
import { respond } from "./respond.js";

type Dict = Record<string, unknown>;

const responseFormatField = z
  .enum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("'markdown' for readable text, 'json' for structured data");

export function registerReadTools(server: McpServer): void {
  server.registerTool(
    "classsphere_student_dashboard",
    {
      title: "Student dashboard",
      description: `Everything a signed-in student sees on their home console: current lecture, today's schedule, subject-wise attendance, overall percentage, weekly anonymous activity counters and recent incidents.

Requires a STUDENT session (classsphere_login as a student account). For a single metric use classsphere_student_subject_attendance.`,
      inputSchema: z.strictObject({ response_format: responseFormatField }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ response_format }, ctx) => {
      const data = await apiRequest<Dict>("/students/dashboard", { signal: ctx.mcpReq.signal });
      return respond(data, renderStudentDashboard(data), response_format);
    }
  );

  server.registerTool(
    "classsphere_student_subject_attendance",
    {
      title: "Student subject attendance",
      description:
        "Subject-wise attendance for the signed-in student with conducted/attended/missed counts and an ON_TRACK / AT_RISK / CRITICAL status per subject.",
      inputSchema: z.strictObject({ response_format: responseFormatField }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ response_format }, ctx) => {
      const data = await apiRequest<Dict[]>("/students/attendance/subject-wise", { signal: ctx.mcpReq.signal });
      return respond({ subjects: data }, renderSubjectAttendance(data), response_format);
    }
  );

  server.registerTool(
    "classsphere_student_activity",
    {
      title: "Student classroom activity",
      description:
        "Anonymous observable activity for the signed-in student: phone / talking / out-of-seat event counters and the most recent events. No behavioural score exists in the system.",
      inputSchema: z.strictObject({ response_format: responseFormatField }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ response_format }, ctx) => {
      const data = await apiRequest<Dict>("/students/activity", { signal: ctx.mcpReq.signal });
      return respond(data, renderStudentActivity(data), response_format);
    }
  );

  server.registerTool(
    "classsphere_faculty_today_classes",
    {
      title: "Faculty classes today",
      description: `Today's teaching schedule for the signed-in faculty member, with per-session attendance counts and the session_id needed by classsphere_class_attendance and classsphere_override_attendance.

Requires a FACULTY (or HOD/ADMIN) session.`,
      inputSchema: z.strictObject({ response_format: responseFormatField }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ response_format }, ctx) => {
      const data = await apiRequest<Dict>("/faculty/today-classes", { signal: ctx.mcpReq.signal });
      return respond(data, renderFacultyClasses(data), response_format);
    }
  );

  server.registerTool(
    "classsphere_faculty_dashboard",
    {
      title: "Faculty dashboard",
      description:
        "Faculty KPIs: classes today, attendance rate, pending verification reviews, 7-day activity volume, recent sessions with attendance percentages and open incidents.",
      inputSchema: z.strictObject({ response_format: responseFormatField }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ response_format }, ctx) => {
      const data = await apiRequest<Dict>("/faculty/dashboard", { signal: ctx.mcpReq.signal });
      return respond(data, renderFacultyDashboard(data), response_format);
    }
  );

  server.registerTool(
    "classsphere_class_attendance",
    {
      title: "Class attendance roster",
      description: `Full attendance roster for one class session: per-student status, confidence score, override flag and the record_id used for overrides.

Get a session_id from classsphere_faculty_today_classes first. Requires FACULTY, HOD or ADMIN.`,
      inputSchema: z.strictObject({
        session_id: z.string().min(1).describe("Class session UUID (from classsphere_faculty_today_classes)"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ session_id, response_format }, ctx) => {
      const data = await apiRequest<Dict>(`/faculty/attendance/${encodeURIComponent(session_id)}`, {
        signal: ctx.mcpReq.signal
      });
      return respond(data, renderAttendanceSession(data), response_format);
    }
  );

  server.registerTool(
    "classsphere_session_activity",
    {
      title: "Session activity summary",
      description:
        "Per-student anonymous activity counters (phone, talking, other) for one class session, sorted by total events. Requires FACULTY, HOD or ADMIN.",
      inputSchema: z.strictObject({
        session_id: z.string().min(1).describe("Class session UUID"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ session_id, response_format }, ctx) => {
      const data = await apiRequest<Dict>(`/faculty/activity/${encodeURIComponent(session_id)}`, {
        signal: ctx.mcpReq.signal
      });
      return respond(data, renderActivitySummary(data), response_format);
    }
  );

  server.registerTool(
    "classsphere_hod_dashboard",
    {
      title: "HOD governance dashboard",
      description: `Department-wide governance snapshot for the signed-in HOD: student/faculty/section counts, today's attendance percentage, students below 75%, today's sessions, subject attendance and recent incidents.

Requires an HOD (or ADMIN) session.`,
      inputSchema: z.strictObject({ response_format: responseFormatField }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ response_format }, ctx) => {
      const data = await apiRequest<Dict>("/hod/dashboard", { signal: ctx.mcpReq.signal });
      return respond(data, renderHodDashboard(data), response_format);
    }
  );

  server.registerTool(
    "classsphere_hod_students",
    {
      title: "HOD student roster",
      description: `Every student in the department with attendance percentage and risk status. Filter with risk_only to get only students below 75%.

Paginated: pass offset from the previous call's next_offset. Requires an HOD (or ADMIN) session.`,
      inputSchema: z.strictObject({
        risk_only: z.boolean().default(false).describe("Return only students below 75% attendance"),
        limit: z.number().int().min(1).max(100).default(25).describe("Students to return in this page"),
        offset: z.number().int().min(0).default(0).describe("Students to skip, for pagination"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ risk_only, limit, offset, response_format }, ctx) => {
      const data = await apiRequest<Dict>("/hod/student-overview", { signal: ctx.mcpReq.signal });
      const all = Array.isArray(data.students) ? (data.students as Dict[]) : [];
      const filtered = risk_only
        ? all.filter((student) => Number(student.attendance_percentage ?? 0) < 75)
        : all;
      if (response_format === ResponseFormat.JSON) {
        const page = filtered.slice(offset, offset + limit);
        const nextOffset = offset + page.length < filtered.length ? offset + page.length : undefined;
        return respond(
          { total: filtered.length, count: page.length, offset, students: page, next_offset: nextOffset },
          "",
          response_format
        );
      }
      const rendered = renderStudents(filtered, offset, limit);
      return respond(data, truncate(rendered.text, CHARACTER_LIMIT), response_format);
    }
  );

  server.registerTool(
    "classsphere_hod_faculty",
    {
      title: "HOD faculty roster",
      description:
        "Department faculty with employee code, designation, weekly teaching slots, sessions conducted, subjects and attendance percentage. Requires an HOD session.",
      inputSchema: z.strictObject({ response_format: responseFormatField }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ response_format }, ctx) => {
      const data = await apiRequest<Dict>("/hod/faculty-overview", { signal: ctx.mcpReq.signal });
      const faculty = Array.isArray(data.faculty) ? (data.faculty as Dict[]) : [];
      return respond(data, renderFaculty(faculty), response_format);
    }
  );

  server.registerTool(
    "classsphere_list_incidents",
    {
      title: "List safety incidents",
      description: `Alerts and emergency SOS incidents in one normalised timeline: severity, status, room, subject and the incident id used by the acknowledge/resolve tools.

Filter by status (e.g. ACTIVE, REPORTED) or source (ALERT, SOS). Requires FACULTY, HOD or ADMIN.`,
      inputSchema: z.strictObject({
        status: z.string().optional().describe("Only return incidents in this status, e.g. 'ACTIVE' or 'REPORTED'"),
        source: z.enum(["ALERT", "SOS"]).optional().describe("Only return classroom alerts or emergency SOS incidents"),
        limit: z.number().int().min(1).max(100).default(20).describe("Maximum incidents to return"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ status, source, limit, response_format }, ctx) => {
      const data = await apiRequest<Dict[]>(`/incidents?limit=${limit}`, { signal: ctx.mcpReq.signal });
      const filtered = data
        .filter((incident) => (status ? incident.status === status : true))
        .filter((incident) => (source ? incident.source === source : true));
      return respond({ incidents: filtered }, renderIncidents(filtered), response_format);
    }
  );

  server.registerTool(
    "classsphere_notifications",
    {
      title: "Notification inbox",
      description:
        "Notifications for the signed-in account, newest first, with read state. Use classsphere_mark_notification_read to clear one.",
      inputSchema: z.strictObject({
        limit: z.number().int().min(1).max(50).default(15).describe("Notifications to return in this page"),
        offset: z.number().int().min(0).default(0).describe("Notifications to skip, for pagination"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ limit, offset, response_format }, ctx) => {
      const data = await apiRequest<Dict[]>("/notifications", { signal: ctx.mcpReq.signal });
      if (response_format === ResponseFormat.JSON) {
        const page = data.slice(offset, offset + limit);
        const nextOffset = offset + page.length < data.length ? offset + page.length : undefined;
        return respond({ total: data.length, count: page.length, offset, notifications: page, next_offset: nextOffset }, "", response_format);
      }
      const rendered = renderNotifications(data, offset, limit);
      return respond({ notifications: data }, truncate(rendered.text, CHARACTER_LIMIT), response_format);
    }
  );
}
