# ClassSphere MCP server

A Model Context Protocol server that exposes the ClassSphere console API to MCP
clients (Codebuff, Claude Desktop, MCP Inspector, or any SDK host). It holds one
authenticated ClassSphere session in memory, so a client can log in once and then
read or act with the permissions of that account.

- Transport: stdio
- SDK: `@modelcontextprotocol/server` (TypeScript SDK v2), Zod 4 input schemas
- 21 tools, every one annotated with `readOnlyHint` / `destructiveHint`

## Setup

```bash
cd mcp-server
pnpm install          # or: npm install
pnpm build            # tsc -> dist/
```

The server talks to the ClassSphere API, which must be running:

```bash
# in another shell, from classsphere-backend/
.venv/bin/uvicorn app.main:app --port 8000
```

### Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `CLASSSPHERE_API_URL` | `http://127.0.0.1:8000/api/v1` | Base URL of the API |
| `CLASSSPHERE_EMAIL` | — | If set, the server logs in on first tool call |
| `CLASSSPHERE_PASSWORD` | — | Password for that account |
| `CLASSSPHERE_INSTITUTION_CODE` | `INST-DEMO` | Tenant code used for login |
| `CLASSSPHERE_ACCESS_TOKEN` | — | Use an existing JWT instead of email/password |

Credentials are read from the environment only; nothing is written to disk.

## Client configuration

```json
{
  "mcpServers": {
    "classsphere": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "CLASSSPHERE_API_URL": "http://127.0.0.1:8000/api/v1",
        "CLASSSPHERE_EMAIL": "student@classsphere.edu",
        "CLASSSPHERE_PASSWORD": "ClassSphere@2026",
        "CLASSSPHERE_INSTITUTION_CODE": "INST-DEMO"
      }
    }
  }
}
```

## Tools

**Session**
- `classsphere_login` — sign in and hold the session
- `classsphere_logout` — discard the session
- `classsphere_whoami` — current user, role and institution

**Student reads**
- `classsphere_student_dashboard`
- `classsphere_student_subject_attendance`
- `classsphere_student_activity`
- `classsphere_notifications` / `classsphere_mark_notification_read`
- `classsphere_raise_sos`

**Faculty reads and writes**
- `classsphere_faculty_dashboard`
- `classsphere_faculty_today_classes`
- `classsphere_class_attendance`
- `classsphere_session_activity`
- `classsphere_override_attendance` — audited manual correction
- `classsphere_finalize_attendance` — locks the session

**HOD reads**
- `classsphere_hod_dashboard`
- `classsphere_hod_students`
- `classsphere_hod_faculty`

**Incidents**
- `classsphere_list_incidents`
- `classsphere_acknowledge_incident`
- `classsphere_resolve_incident`

Tool results return both human-readable text and JSON, so an agent can read the
summary and still parse fields. RBAC failures surface the API's error code (for
example `INSUFFICIENT_ROLE_PERMISSIONS`) with the role the tool needs.

## Verify

```bash
pnpm build
pnpm smoke      # logs in, exercises RBAC, reads every dashboard, checks roster maths
```

The smoke test prints `tools: 21` and `Smoke test passed` when the server and API
agree.
