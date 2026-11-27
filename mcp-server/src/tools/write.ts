/**
 * Tools with side effects. Each one maps to an audited backend mutation:
 * attendance overrides append to attendance_verification_audits and incident
 * transitions append to the immutable alert/SOS history ledgers.
 */
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { apiRequest } from "../api.js";
import { ResponseFormat } from "../constants.js";
import { respond } from "./respond.js";

type Dict = Record<string, unknown>;

const responseFormatField = z
  .enum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("'markdown' for readable text, 'json' for structured data");

export function registerWriteTools(server: McpServer): void {
  server.registerTool(
    "classsphere_raise_sos",
    {
      title: "Raise an emergency SOS",
      description: `Create a CRITICAL emergency incident for the signed-in student and record the first escalation entry.

Use only when a student reports a real emergency (fall, medical distress, safety threat). Requires a STUDENT session. The response contains the incident code to quote to campus security.`,
      inputSchema: z.strictObject({
        room_number: z.string().max(64).optional().describe("Room the student is in, e.g. 'Room 301'"),
        notes: z.string().max(1000).optional().describe("What is happening, in the student's own words"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ room_number, notes, response_format }, ctx) => {
      const data = await apiRequest<Dict>("/students/sos", {
        method: "POST",
        body: { room_number, notes },
        signal: ctx.mcpReq.signal
      });
      const code = typeof data.incident_code === "string" ? data.incident_code : "unknown";
      const text = [
        "# Emergency incident recorded",
        `Incident code: **${code}**`,
        `Status: ${String(data.status)} · severity: ${String(data.severity)}`,
        `Reported at: ${String(data.reported_at)}`,
        "",
        String(data.message ?? "")
      ].join("\n");
      return respond(data, text, response_format);
    }
  );

  server.registerTool(
    "classsphere_override_attendance",
    {
      title: "Override an attendance record",
      description: `Change one student's attendance status inside a session. The override is written with manual_override=true and an immutable audit row (actor, old status, new status, reason).

Rules enforced by the backend: the session must not be finalized; the reason is mandatory (min 5 characters); the status must be PRESENT, LATE, UNVERIFIED or ABSENT. Get record_id from classsphere_class_attendance.`,
      inputSchema: z.strictObject({
        session_id: z.string().min(1).describe("Class session UUID"),
        record_id: z.string().min(1).describe("Attendance record UUID from classsphere_class_attendance"),
        status: z.enum(["PRESENT", "LATE", "UNVERIFIED", "ABSENT"]).describe("New attendance status"),
        reason: z
          .string()
          .min(5)
          .max(500)
          .describe("Audited justification, e.g. 'Verified student at desk R1-C1 in room footage'"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
    },
    async ({ session_id, record_id, status, reason, response_format }, ctx) => {
      const data = await apiRequest<Dict>(
        `/faculty/attendance/${encodeURIComponent(session_id)}/override`,
        { method: "POST", body: { record_id, status, reason }, signal: ctx.mcpReq.signal }
      );
      const text = [
        "# Attendance overridden",
        `${String(data.old_status)} → **${String(data.new_status)}** (audited: ${data.audited ? "yes" : "no"})`,
        `Record: ${String(data.record_id)}`
      ].join("\n");
      return respond(data, text, response_format);
    }
  );

  server.registerTool(
    "classsphere_finalize_attendance",
    {
      title: "Finalize attendance",
      description: `Lock a session's attendance for the period. Counts are recomputed from the records first, then the session is marked finalized; further overrides return 409.

Requires FACULTY, HOD or ADMIN and a session that is not already finalized.`,
      inputSchema: z.strictObject({
        session_id: z.string().min(1).describe("Class session UUID"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
    },
    async ({ session_id, response_format }, ctx) => {
      const data = await apiRequest<Dict>(`/faculty/attendance/${encodeURIComponent(session_id)}/finalize`, {
        method: "POST",
        signal: ctx.mcpReq.signal
      });
      const text = `# Attendance finalized\nSession ${String(data.session_id)} is now locked for editing.`;
      return respond(data, text, response_format);
    }
  );

  server.registerTool(
    "classsphere_acknowledge_incident",
    {
      title: "Acknowledge an incident",
      description:
        "Move an alert or SOS incident to ACKNOWLEDGED and append the transition to its audit history. Always pass the source that classsphere_list_incidents reported for that id.",
      inputSchema: z.strictObject({
        incident_id: z.string().min(1).describe("Incident UUID from classsphere_list_incidents"),
        source: z.enum(["ALERT", "SOS"]).describe("Which ledger owns this incident"),
        notes: z.string().max(1000).optional().describe("What was done, quoted in the incident history"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ incident_id, source, notes, response_format }, ctx) => {
      const data = await apiRequest<Dict>(`/incidents/${encodeURIComponent(incident_id)}/acknowledge`, {
        method: "POST",
        body: { source, notes },
        signal: ctx.mcpReq.signal
      });
      const text = `# Incident acknowledged\n${String(data.old_status)} → **${String(data.status)}** (${String(data.source)} ${String(data.id)}).`;
      return respond(data, text, response_format);
    }
  );

  server.registerTool(
    "classsphere_resolve_incident",
    {
      title: "Resolve an incident",
      description: `Close an incident. Alerts resolve to RESOLVED; SOS incidents resolve to CAMPUS_RESOLVED unless you name another target (ESCALATION_REQUESTED, EXTERNAL_HANDOFF_PENDING).

Requires FACULTY, HOD or ADMIN; the transition is appended to the incident history.`,
      inputSchema: z.strictObject({
        incident_id: z.string().min(1).describe("Incident UUID"),
        source: z.enum(["ALERT", "SOS"]).describe("Which ledger owns this incident"),
        notes: z.string().min(3).max(1000).describe("Resolution summary recorded in the history ledger"),
        target_status: z
          .enum(["RESOLVED", "CAMPUS_RESOLVED", "ESCALATION_REQUESTED", "EXTERNAL_HANDOFF_PENDING"])
          .optional()
          .describe("Explicit target status when the default does not fit"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ incident_id, source, notes, target_status, response_format }, ctx) => {
      const data = await apiRequest<Dict>(`/incidents/${encodeURIComponent(incident_id)}/resolve`, {
        method: "POST",
        body: { source, notes, status: target_status },
        signal: ctx.mcpReq.signal
      });
      const text = `# Incident resolved\n${String(data.old_status)} → **${String(data.status)}** (${String(data.source)} ${String(data.id)}).`;
      return respond(data, text, response_format);
    }
  );

  server.registerTool(
    "classsphere_mark_notification_read",
    {
      title: "Mark a notification read",
      description: "Mark one notification of the signed-in account as read. Get ids from classsphere_notifications.",
      inputSchema: z.strictObject({
        notification_id: z.string().min(1).describe("Notification UUID from classsphere_notifications"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ notification_id, response_format }, ctx) => {
      const data = await apiRequest<Dict>(`/notifications/${encodeURIComponent(notification_id)}/read`, {
        method: "PATCH",
        signal: ctx.mcpReq.signal
      });
      return respond(data, `# Notification ${String(data.id)} marked as read.`, response_format);
    }
  );
}
