/**
 * Self-check: starts the built server over stdio, exercises its tools as a real
 * client would, and exits non-zero on any failure.
 *
 * Run with: npm run build && npm run smoke
 * Prerequisite: the ClassSphere API is running (default http://127.0.0.1:8000/api/v1).
 */
import { strict as assert } from "node:assert";
import { Client } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const API_URL = process.env.CLASSSPHERE_API_URL ?? "http://127.0.0.1:8000/api/v1";
const PASSWORD = process.env.CLASSSPHERE_DEMO_PASSWORD ?? "ClassSphere@2026";

type TextResult = { isError?: boolean; content?: { type: string; text?: string }[]; structuredContent?: unknown };

function textOf(result: TextResult): string {
  const first = result.content?.find((item) => item.type === "text");
  return first?.text ?? "";
}

const client = new Client({ name: "classsphere-smoke-test", version: "1.0.0" });
await client.connect(
  new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: { ...getDefaultEnvironment(), CLASSSPHERE_API_URL: API_URL }
  })
);

const { tools } = await client.listTools();
const names = tools.map((tool) => tool.name).sort();
assert.ok(names.includes("classsphere_login"), "classsphere_login must be advertised");
assert.ok(names.includes("classsphere_student_dashboard"), "student dashboard tool missing");
assert.ok(names.includes("classsphere_hod_dashboard"), "HOD dashboard tool missing");
assert.ok(names.length >= 18, `expected at least 18 tools, got ${names.length}`);
console.error(`tools: ${names.length}`);

// Unauthenticated calls must fail with an actionable message, not a crash.
const unsigned = (await client.callTool({
  name: "classsphere_student_dashboard",
  arguments: { response_format: "markdown" }
})) as TextResult;
assert.equal(unsigned.isError, true, "dashboard must fail before login");
assert.match(textOf(unsigned), /classsphere_login/i);

// Student persona
const studentLogin = (await client.callTool({
  name: "classsphere_login",
  arguments: { identifier: "student@classsphere.edu", password: PASSWORD, institution_code: "INST-DEMO" }
})) as TextResult;
assert.ok(!studentLogin.isError, `student login failed: ${textOf(studentLogin)}`);

const dashboard = (await client.callTool({
  name: "classsphere_student_dashboard",
  arguments: { response_format: "json" }
})) as TextResult;
assert.ok(!dashboard.isError, `student dashboard failed: ${textOf(dashboard)}`);
const dashboardData = dashboard.structuredContent as { student: { roll_number: string }; subject_attendance: unknown[] };
assert.equal(dashboardData.student.roll_number, "24CS-A01");
assert.ok(Array.isArray(dashboardData.subject_attendance) && dashboardData.subject_attendance.length > 0);

const subjects = (await client.callTool({
  name: "classsphere_student_subject_attendance",
  arguments: { response_format: "markdown" }
})) as TextResult;
assert.ok(!subjects.isError, `subject attendance failed: ${textOf(subjects)}`);
assert.match(textOf(subjects), /CS3\d\d/);

const comparison = (await client.callTool({
  name: "classsphere_student_activity",
  arguments: { response_format: "json" }
})) as TextResult;
assert.ok(!comparison.isError, `student activity failed: ${textOf(comparison)}`);

// Faculty persona: students cannot read the faculty console
const forbidden = (await client.callTool({
  name: "classsphere_faculty_today_classes",
  arguments: { response_format: "markdown" }
})) as TextResult;
assert.equal(forbidden.isError, true, "a student must not read the faculty console");
assert.match(textOf(forbidden), /403|Permission denied/i);

const facultyLogin = (await client.callTool({
  name: "classsphere_login",
  arguments: { identifier: "faculty@classsphere.edu", password: PASSWORD, institution_code: "INST-DEMO" }
})) as TextResult;
assert.ok(!facultyLogin.isError, `faculty login failed: ${textOf(facultyLogin)}`);

const classes = (await client.callTool({
  name: "classsphere_faculty_today_classes",
  arguments: { response_format: "json" }
})) as TextResult;
assert.ok(!classes.isError, `faculty classes failed: ${textOf(classes)}`);
const classesData = classes.structuredContent as { classes: { id: string; status: string }[] };
assert.ok(classesData.classes.length > 0, "faculty should have classes today");

const sessionId = classesData.classes[0].id;
const attendance = (await client.callTool({
  name: "classsphere_class_attendance",
  arguments: { session_id: sessionId, response_format: "json" }
})) as TextResult;
assert.ok(!attendance.isError, `class attendance failed: ${textOf(attendance)}`);
const attendanceData = attendance.structuredContent as { records: unknown[]; total_enrolled: number };
assert.ok(attendanceData.records.length === attendanceData.total_enrolled, "roster size mismatch");

// HOD persona
const hodLogin = (await client.callTool({
  name: "classsphere_login",
  arguments: { identifier: "hod@classsphere.edu", password: PASSWORD, institution_code: "INST-DEMO" }
})) as TextResult;
assert.ok(!hodLogin.isError, `HOD login failed: ${textOf(hodLogin)}`);

const hodDashboard = (await client.callTool({
  name: "classsphere_hod_dashboard",
  arguments: { response_format: "json" }
})) as TextResult;
assert.ok(!hodDashboard.isError, `HOD dashboard failed: ${textOf(hodDashboard)}`);
const hodData = hodDashboard.structuredContent as { kpis: { students: number; faculty: number } };
assert.equal(hodData.kpis.students, 93, "demo tenant must expose 93 students");
assert.equal(hodData.kpis.faculty, 5);

const students = (await client.callTool({
  name: "classsphere_hod_students",
  arguments: { risk_only: true, limit: 5, offset: 0, response_format: "json" }
})) as TextResult;
assert.ok(!students.isError, `HOD students failed: ${textOf(students)}`);

// Invalid input must come back as a readable tool error
const invalid = (await client.callTool({
  name: "classsphere_override_attendance",
  arguments: { session_id: "abc", record_id: "def", status: "PRESENT", reason: "no" }
})) as TextResult;
assert.equal(invalid.isError, true, "a one-character reason should be rejected by the schema");

await client.close();
console.error("Smoke test passed");
