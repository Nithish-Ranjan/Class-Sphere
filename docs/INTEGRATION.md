# ClassSphere — frontend ↔ backend integration

This document records what was connected: the console API added to the FastAPI
backend, the demo tenant that feeds it, the MCP server, and the screens that now
read live data instead of fixtures.

## What the project is

| Layer | Stack | Location |
| --- | --- | --- |
| API | FastAPI + SQLAlchemy + Alembic, PostgreSQL with row-level security, RS256 JWT | `classsphere-backend/` |
| Web console | React 18 + Vite + TypeScript + Tailwind | `frontend/` |
| MCP | TypeScript SDK v2, stdio transport | `mcp-server/` |

Before this work the backend exposed only health and auth endpoints; all 30+
screens were fed by `frontend/src/constants` mocks. The backend now serves the
same shapes those screens describe, and the main console screens read it.

## Run it locally

### 1. Database

Any PostgreSQL 14+ with `pgcrypto` and `uuid-ossp` works. Create the roles and
database as described in `classsphere-backend/README.md`, then:

```bash
cd classsphere-backend
source .venv/bin/activate
alembic upgrade head          # applies 0001 → 0009
```

`DATABASE_URL`, JWT keys and other settings come from `classsphere-backend/.env`
(see `.env.example`; never commit real values).

### 2. Demo tenant

```bash
python -m scripts.seed_portal_demo
```

Seeds institution `INST-DEMO`, department CSE, sections CSE-A (47 students) and
CSE-B (46), 5 faculty, 1 HOD, a 30-slot weekly timetable, 93 sessions with
attendance, classroom activity events, alerts, SOS incidents, notifications and
verification-ledger entries. It is deterministic: re-running resets the same rows.

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@classsphere.edu` | `ClassSphere@2026` |
| Faculty | `faculty@classsphere.edu` | `ClassSphere@2026` |
| HOD | `hod@classsphere.edu` | `ClassSphere@2026` |

Institution code: `INST-DEMO`.

### 3. API

```bash
cd classsphere-backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

OpenAPI lives at `http://127.0.0.1:8000/docs`.

### 4. Web console

```bash
cd frontend
pnpm install
pnpm dev            # http://localhost:5173, proxies /api/v1 -> :8000
```

`pnpm typecheck` runs the active-surface type check and `pnpm build` produces
`dist/`. The "Enter demo console" buttons on the login page now perform a real
`POST /auth/login` against `INST-DEMO`; only if the API is unreachable do they
fall back to the offline persona (the UI labels that case).

### 5. MCP server

See [mcp-server/README.md](../mcp-server/README.md).

## API surface added

All routes are mounted under `/api/v1` and enforce RS256 JWT authentication plus
PostgreSQL row-level security scoped to the caller's institution, department,
sections or student profile.

| Area | Routes |
| --- | --- |
| Auth (pre-existing) | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Student | `GET /students/me/dashboard`, `/students/me/attendance/subject-wise`, `/students/me/attendance/history`, `/students/me/activity`, `/students/me/activity/comparison`, `/students/me/class-companion`, `/students/me/alerts`, `POST /students/me/sos` |
| Faculty | `GET /faculty/dashboard`, `/faculty/today-classes`, `/faculty/class-log/{session_id}`, `/faculty/class-dashboard/{session_id}`, `/faculty/attendance/{session_id}`, `/faculty/activity/{session_id}`, `POST /faculty/attendance/{session_id}/override`, `POST /faculty/attendance/{session_id}/finalize` |
| HOD | `GET /hod/dashboard`, `/hod/student-overview`, `/hod/faculty-overview`, `/hod/class-overview`, `/hod/attendance/{session_id}`, `/hod/activity-overview`, `/hod/timetable`, `/hod/review`, `/hod/admin-review`, `/hod/audit-logs` |
| Notifications | `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all` |
| Incidents | `GET /incidents`, `GET /incidents/{id}/history`, `POST /incidents/{id}/acknowledge`, `/escalate`, `/resolve` |

Write behaviour worth knowing:

- Attendance override requires a reason, is written to the append-only
  `verification_ledger`, and is attributed to the calling faculty account.
- Finalizing a session sets it `FINALIZED`; later overrides return
  `409 SESSION_FINALIZED`.
- SOS creates a `CRITICAL` incident with an escalation-ledger entry, so HOD and
  faculty safety consoles see it immediately.
- Cross-role access returns `403 INSUFFICIENT_ROLE_PERMISSIONS`, and every query
  is additionally filtered by RLS — a student token cannot read another section
  even if a route is called with a foreign id.

## Frontend wiring

Every routed screen now reads the API. None of them renders fixture data.

| Area | Routes | What is live |
| --- | --- | --- |
| Auth | `/login` | Real JWT login; role routed from the returned user |
| Student | `/student/overview`, `/student/companion`, `/student/attendance`, `/student/attendance/subject-wise`, `/student/activity`, `/student/activity/comparison` | Current lecture, attendance history and subject percentages, weekly activity counters and event list, comparison of this week against last |
| Student SOS | `/student/sos` | Raising an incident creates it; the status steps below are read back from `GET /students/sos`. Students cannot acknowledge or escalate their own signal — those actions belong to faculty and HOD |
| Faculty | `/faculty/overview`, `/faculty/today-classes`, `/faculty/daily-overview`, `/faculty/dashboard` | Agenda, KPIs, per-session event and attendance counts, day summary, attendance trend |
| Faculty session | `/faculty/attendance`, `/faculty/class-log`, `/faculty/activity`, `/faculty/class-dashboard` | Real roster with override (reason required) and finalize, session timeline, per-student event counts, single-class dashboard |
| Faculty safety | `/faculty/alerts`, `/faculty/sos` | Incident list with working acknowledge / escalate / resolve and escalation history |
| HOD | `/hod/dashboard`, `/hod/overview`, `/hod/review`, `/hod/students`, `/hod/faculty`, `/hod/classes`, `/hod/attendance`, `/hod/activity` | Department KPIs, subject attendance, roster and section tables, faculty load, session and event review |
| HOD governance | `/hod/timetable`, `/hod/admin-review`, `/hod/alerts`, `/hod/sos` | Published timetable by day, hash-chained audit ledger with corrections, alert and SOS consoles |

Places that still show a **preview** and say so: the student recheck request form (no endpoint exists, nothing is transmitted) and the browser camera panels (frames stay local and never mark attendance).

The `/hod/*-view`, `/hod/*-review` and `/hod/alerts-sos` aliases render the same components as their canonical routes.

Typed client: `frontend/src/services/api.ts` (`authApi`, `studentApi`,
`facultyApi`, `attendanceApi`, `eventApi`, `hodApi`, `incidentApi`,
`notificationApi`). Data fetching: `frontend/src/hooks/useApiQuery.ts` provides
`{ data, loading, error, refetch, enabled }` with cancellation on unmount.

Pages that need a session id (`/faculty/attendance`, `/faculty/activity`,
`/faculty/class-log`, `/faculty/class-dashboard`) pick it from `GET
/faculty/today-classes`, default to the live lecture, and expose a session
selector.

## Verification performed

- `alembic upgrade head` from an empty database, including the new
  `0009_fix_demo_fixture_guard.py` that repairs the demo-fixture lock trigger
  (`record "new" has no field "institution_id"`).
- Every GET route called with each role's token: 200 with data. Student token
  against `/hod/dashboard`: 403 `INSUFFICIENT_ROLE_PERMISSIONS`.
- SOS create, attendance override, finalize, post-finalize override (`409`),
  incident acknowledge + history, notification read.
- `mcp-server`: `pnpm build`, then `pnpm smoke` (21 tools, RBAC negative, roster
  vs `total_enrolled`, all dashboards).
- `frontend`: `pnpm typecheck` and `pnpm build` both pass.

## Repo notes

- `frontend/tsconfig.json` still includes abandoned prototype pages that never
  compiled (`AttendanceSessionView`, `ClassLogView`, `FacultyDashboard`, …).
  `tsconfig.active.json` lists the routed surface and is what `pnpm typecheck`
  and `pnpm build` use.
- Removed during the review: `app/schemas/portal.py` (unused duplicate models),
  `src/pages/HOD/hodMockData.ts` (no longer imported), the simulated `cameraApi`
  (only a non-routed prototype used it), and the unused `PlaceholderRoleView`
  import in `App.tsx`.
- `frontend/node_modules` and `frontend/dist` are tracked in this repository.
  Installing dependencies rewrites those files; keep them out of commits (and
  ideally add them to `.gitignore`).
- Vite must be told the cloud preview hostname when it is not localhost:
  `PREVIEW_ALLOWED_HOST=<host> pnpm dev`.
