/**
 * Session tools: sign in, inspect the active identity, sign out.
 */
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { clearSession, login, requireSession } from "../api.js";
import { DEFAULT_INSTITUTION_CODE } from "../constants.js";
import { renderSession } from "../format.js";

export function registerSessionTools(server: McpServer): void {
  server.registerTool(
    "classsphere_login",
    {
      title: "Sign in to ClassSphere",
      description: `Authenticate against the ClassSphere campus API and keep the session for later tool calls.

Every other classsphere_* tool needs this session. Sign in with the account that owns the data you need:
  - student@classsphere.edu -> student console (own attendance, activity, SOS)
  - faculty@classsphere.edu -> faculty console (today's classes, attendance review)
  - hod@classsphere.edu     -> department governance (students, faculty, timetable, audit ledger)
All demo accounts use the password ClassSphere@2026 and institution code INST-DEMO.

Returns the signed-in profile. Re-call it to switch roles.`,
      inputSchema: z.strictObject({
        identifier: z
          .string()
          .min(3)
          .describe("Institutional email, student roll number or faculty employee code, e.g. 'student@classsphere.edu'"),
        password: z.string().min(1).describe("Account password"),
        institution_code: z
          .string()
          .min(2)
          .default(DEFAULT_INSTITUTION_CODE)
          .describe("Institution code used to resolve the tenant, e.g. 'INST-DEMO'"),
        role: z
          .enum(["STUDENT", "FACULTY", "HOD", "ADMIN"])
          .optional()
          .describe("Active role, required only when one account holds several roles")
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ identifier, password, institution_code, role }, ctx) => {
      const session = await login(identifier, password, institution_code, role, ctx.mcpReq.signal);
      return {
        content: [{ type: "text", text: renderSession(session.user) }],
        structuredContent: { user: session.user }
      };
    }
  );

  server.registerTool(
    "classsphere_whoami",
    {
      title: "Current ClassSphere identity",
      description:
        "Report which ClassSphere account and role the MCP session is using, and how long the access token stays valid. Use it before diagnosing a 403 from another tool.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async () => {
      const session = requireSession();
      const minutesLeft = Math.max(Math.round((session.expiresAt - Date.now()) / 60_000), 0);
      return {
        content: [
          {
            type: "text",
            text: `${renderSession(session.user)}\n- Access token: ${minutesLeft} minutes remaining`
          }
        ],
        structuredContent: { user: session.user, expires_in_minutes: minutesLeft }
      };
    }
  );

  server.registerTool(
    "classsphere_logout",
    {
      title: "Sign out of ClassSphere",
      description: "Discard the in-memory ClassSphere session so the next tool call must sign in again.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async () => {
      clearSession();
      return { content: [{ type: "text", text: "ClassSphere session cleared." }] };
    }
  );
}
