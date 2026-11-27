"""
Portal service: operational queries for the ClassSphere consoles.

All reads/writes execute inside the RLS-scoped session supplied by
``app.core.dependencies.get_authenticated_db_session`` (transaction-local
``app.current_*`` settings). Aggregations are expressed in SQL so that
PostgreSQL RLS policies - not application filtering - remain the security
boundary.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import AuthenticatedUser
from app.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

STUDENT_CTX_SQL = text(
    """
    SELECT sp.id, sp.department_id, sp.section_id, sp.roll_number,
           sp.enrollment_number, s.name AS section_name, u.full_name
    FROM student_profiles sp
    JOIN sections s ON s.id = sp.section_id
    JOIN users u ON u.id = sp.user_id
    WHERE sp.user_id = :uid
    """
)

FACULTY_CTX_SQL = text(
    """
    SELECT fp.id, fp.department_id, fp.employee_code, fp.designation, u.full_name
    FROM faculty_profiles fp
    JOIN users u ON u.id = fp.user_id
    WHERE fp.user_id = :uid
    """
)

# Sessions of the day, enriched with timetable-subject/room/section/faculty data.
SESSION_SELECT = """
    SELECT cs.id, cs.status, cs.started_at, cs.ended_at, cs.session_date,
           ts.day_of_week,
           lower(ts.slot_minutes) AS start_minute,
           upper(ts.slot_minutes) AS end_minute,
           subj.id AS subject_id, subj.code AS subject_code, subj.name AS subject_name,
           sec.id AS section_id, sec.name AS section_name,
           room.room_number, room.building,
           fu.full_name AS faculty_name, fp.id AS faculty_profile_id,
           att.id AS attendance_session_id, att.present_count, att.late_count,
           att.unverified_count, att.total_enrolled, att.is_finalized,
           (SELECT COUNT(*) FROM activity_events ae WHERE ae.class_session_id = cs.id) AS activity_event_count
    FROM class_sessions cs
    LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
    LEFT JOIN subjects subj ON subj.id = ts.subject_id
    LEFT JOIN sections sec ON sec.id = ts.section_id
    LEFT JOIN classrooms room ON room.id = cs.actual_room_id
    LEFT JOIN faculty_profiles fp ON fp.id = cs.actual_faculty_id
    LEFT JOIN users fu ON fu.id = fp.user_id
    LEFT JOIN attendance_sessions att ON att.class_session_id = cs.id
"""

SUBJECT_ATTENDANCE_SQL = """
    SELECT subj.id AS subject_id, subj.code AS subject_code, subj.name AS subject_name,
           subj.credits,
           COALESCE(MAX(fu.full_name), 'Unassigned') AS faculty_name,
           COUNT(ar.id) AS classes_conducted,
           COUNT(*) FILTER (WHERE ar.status IN ('PRESENT', 'LATE')) AS classes_attended,
           COUNT(*) FILTER (WHERE ar.status = 'ABSENT') AS classes_missed,
           COUNT(*) FILTER (WHERE ar.status = 'UNVERIFIED') AS classes_unverified
    FROM attendance_records ar
    JOIN attendance_sessions att ON att.id = ar.attendance_session_id
    JOIN class_sessions cs ON cs.id = att.class_session_id
    JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
    JOIN subjects subj ON subj.id = ts.subject_id
    LEFT JOIN faculty_profiles fp ON fp.id = ts.faculty_id
    LEFT JOIN users fu ON fu.id = fp.user_id
    WHERE ar.student_id = :student_profile_id
    GROUP BY subj.id, subj.code, subj.name, subj.credits
    ORDER BY subj.code
"""

SEAT_INDEX_SQL = """
    SELECT t.idx
    FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY roll_number) - 1 AS idx
        FROM student_profiles
        WHERE section_id = :section_id
    ) t
    WHERE t.id = :student_profile_id
"""


def _f(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _i(value: Any) -> int:
    return int(value) if value is not None else 0


def _iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _hhmm(minutes: Any) -> Optional[str]:
    if minutes is None:
        return None
    total = int(minutes)
    return f"{(total // 60):02d}:{(total % 60):02d}"


def seat_marker(idx: int) -> str:
    """Deterministic desk marker for a student seat index within a section."""
    return f"Desk-R{idx // 5 + 1}-C{idx % 5 + 1}"


def _attendance_status(pct: float) -> str:
    if pct >= 85:
        return "ON_TRACK"
    if pct >= 75:
        return "AT_RISK"
    return "CRITICAL"


async def _scalar(session: AsyncSession, sql: str, params: Dict[str, Any]) -> Any:
    result = await session.execute(text(sql), params)
    return result.scalar()


async def _rows(session: AsyncSession, sql: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    result = await session.execute(text(sql), params)
    return [dict(row) for row in result.mappings().all()]


async def bind_student_context(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    """Resolves the caller's student profile and injects RLS self-scope."""
    result = await session.execute(STUDENT_CTX_SQL, {"uid": str(user.id)})
    row = result.mappings().first()
    if not row:
        raise NotFoundError("No student profile is linked to this account", code="STUDENT_PROFILE_MISSING")
    student = dict(row)
    await session.execute(
        text("SELECT set_config('app.current_student_profile_id', :val, true)"),
        {"val": str(student["id"])},
    )
    return student


async def resolve_faculty(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    result = await session.execute(FACULTY_CTX_SQL, {"uid": str(user.id)})
    row = result.mappings().first()
    if not row:
        raise NotFoundError("No faculty profile is linked to this account", code="FACULTY_PROFILE_MISSING")
    return dict(row)


async def student_seat(session: AsyncSession, student: Dict[str, Any]) -> str:
    idx = await _scalar(
        session,
        SEAT_INDEX_SQL,
        {"section_id": str(student["section_id"]), "student_profile_id": str(student["id"])},
    )
    return seat_marker(int(idx or 0))


async def recompute_attendance_counts(session: AsyncSession, attendance_session_id: str) -> None:
    await session.execute(
        text(
            """
            UPDATE attendance_sessions att
            SET present_count = COALESCE(c.present, 0),
                late_count = COALESCE(c.late, 0),
                unverified_count = COALESCE(c.unverified, 0)
            FROM (
                SELECT COUNT(*) FILTER (WHERE status = 'PRESENT') AS present,
                       COUNT(*) FILTER (WHERE status = 'LATE') AS late,
                       COUNT(*) FILTER (WHERE status = 'UNVERIFIED') AS unverified
                FROM attendance_records
                WHERE attendance_session_id = :att_id
            ) c
            WHERE att.id = :att_id
            """
        ),
        {"att_id": attendance_session_id},
    )


def _session_item(row: Dict[str, Any]) -> Dict[str, Any]:
    total_enrolled = _i(row.get("total_enrolled"))
    present = _i(row.get("present_count"))
    late = _i(row.get("late_count"))
    unverified = _i(row.get("unverified_count"))
    return {
        "id": str(row["id"]),
        "session_id": str(row["id"]),
        "subject_id": str(row["subject_id"]) if row.get("subject_id") else None,
        "subject_code": row.get("subject_code") or "—",
        "subject_name": row.get("subject_name") or "Unscheduled session",
        "section_name": row.get("section_name"),
        "room_number": row.get("room_number"),
        "building": row.get("building"),
        "faculty_name": row.get("faculty_name"),
        "scheduled_time": _hhmm(row.get("start_minute")),
        "scheduled_end": _hhmm(row.get("end_minute")),
        "day_of_week": row.get("day_of_week"),
        "session_date": _iso(row.get("session_date")),
        "status": row.get("status"),
        "attendance_taken": row.get("attendance_session_id") is not None,
        "present_count": present,
        "late_count": late,
        "unverified_count": unverified,
        "absent_count": max(total_enrolled - present - late - unverified, 0),
        "total_enrolled": total_enrolled,
        "activity_event_count": _i(row.get("activity_event_count")),
    }


def _subject_items(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for row in rows:
        conducted = _i(row["classes_conducted"])
        attended = _i(row["classes_attended"])
        pct = round((attended / conducted) * 100, 1) if conducted else 0.0
        items.append(
            {
                "subject_id": str(row["subject_id"]),
                "subject_code": row["subject_code"],
                "subject_name": row["subject_name"],
                "faculty_name": row["faculty_name"],
                "credits": _i(row["credits"]),
                "classes_conducted": conducted,
                "classes_attended": attended,
                "classes_missed": _i(row["classes_missed"]),
                "classes_unverified": _i(row["classes_unverified"]),
                "attendance_percentage": pct,
                "status": _attendance_status(pct),
            }
        )
    return items


async def _weekly_activity(session: AsyncSession, department_id: str, marker: str) -> Dict[str, Any]:
    rows = await _rows(
        session,
        """
        SELECT event_code,
               COUNT(*) FILTER (WHERE event_timestamp >= now() - INTERVAL '7 days') AS current_week,
               COUNT(*) FILTER (WHERE event_timestamp >= now() - INTERVAL '14 days'
                                  AND event_timestamp < now() - INTERVAL '7 days') AS previous_week
        FROM activity_events
        WHERE department_id = :dept_id
          AND location_marker = :marker
        GROUP BY event_code
        """,
        {"dept_id": department_id, "marker": marker},
    )
    current = {"PHONE": 0, "TALKING": 0, "OUT_OF_SEAT": 0, "HEAD_DOWN": 0, "NOTE_PASSING": 0}
    previous = dict(current)
    for row in rows:
        code = row["event_code"]
        current[code] = _i(row["current_week"])
        previous[code] = _i(row["previous_week"])

    def trend(cur: int, prev: int) -> str:
        if cur > prev:
            return "INCREASED"
        if cur < prev:
            return "DECREASED"
        return "UNCHANGED"

    return {
        "desk_marker": marker,
        "phone": {"last_week": previous["PHONE"], "this_week": current["PHONE"], "trend": trend(current["PHONE"], previous["PHONE"])},
        "talking": {"last_week": previous["TALKING"], "this_week": current["TALKING"], "trend": trend(current["TALKING"], previous["TALKING"])},
        "out_of_seat": {"last_week": previous["OUT_OF_SEAT"], "this_week": current["OUT_OF_SEAT"]},
    }


# ---------------------------------------------------------------------------
# Student console
# ---------------------------------------------------------------------------


async def student_dashboard(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    student = await bind_student_context(session, user)
    today = date.today()
    marker = await student_seat(session, student)

    schedule_rows = await _rows(
        session,
        SESSION_SELECT
        + """
        WHERE cs.session_date = :today AND ts.section_id = :section_id
        ORDER BY lower(ts.slot_minutes), cs.created_at
        """,
        {"today": today, "section_id": str(student["section_id"])},
    )
    schedule = [_session_item(row) for row in schedule_rows]

    attendance_rows = await _rows(
        session, SUBJECT_ATTENDANCE_SQL, {"student_profile_id": str(student["id"])}
    )
    subjects = _subject_items(attendance_rows)

    conducted = sum(s["classes_conducted"] for s in subjects)
    attended = sum(s["classes_attended"] for s in subjects)
    overall_pct = round((attended / conducted) * 100, 1) if conducted else 0.0

    my_status_rows = await _rows(
        session,
        """
        SELECT att.class_session_id, ar.status
        FROM attendance_records ar
        JOIN attendance_sessions att ON att.id = ar.attendance_session_id
        WHERE ar.student_id = :student_profile_id
        """,
        {"student_profile_id": str(student["id"])},
    )
    status_by_session = {str(r["class_session_id"]): r["status"] for r in my_status_rows}

    current = None
    for item in schedule:
        item["my_attendance_status"] = status_by_session.get(item["id"])
    for item in schedule:
        if item["status"] == "IN_PROGRESS":
            current = item
            break
    if current is None:
        upcoming = [i for i in schedule if i["status"] == "SCHEDULED"]
        current = upcoming[0] if upcoming else (schedule[-1] if schedule else None)

    unread = await _scalar(
        session,
        "SELECT COUNT(*) FROM notifications WHERE recipient_user_id = :uid AND is_read = false",
        {"uid": str(user.id)},
    )

    alerts = await list_incidents(session, limit=5)

    return {
        "student": {
            "id": str(student["id"]),
            "user_id": str(user.id),
            "full_name": student["full_name"],
            "roll_number": student["roll_number"],
            "enrollment_number": student["enrollment_number"],
            "section": student["section_name"],
            "department_id": str(student["department_id"]),
            "desk_marker": marker,
        },
        "today": today,
        "current_class": current,
        "schedule": schedule,
        "subject_attendance": subjects,
        "overall_attendance": {
            "classes_conducted": conducted,
            "classes_attended": attended,
            "classes_missed": conducted - attended,
            "attendance_percentage": overall_pct,
            "status": _attendance_status(overall_pct),
        },
        "weekly_activity": await _weekly_activity(session, str(student["department_id"]), marker),
        "notifications_unread": _i(unread),
        "alerts": alerts,
    }


async def student_class_companion(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    student = await bind_student_context(session, user)
    today = date.today()
    rows = await _rows(
        session,
        SESSION_SELECT
        + """
        WHERE cs.session_date = :today AND ts.section_id = :section_id
        ORDER BY lower(ts.slot_minutes), cs.created_at
        """,
        {"today": today, "section_id": str(student["section_id"])},
    )
    if not rows:
        return {"active": False, "today": today, "message": "No lecture is scheduled for your section today."}

    active = next((r for r in rows if r["status"] == "IN_PROGRESS"), None) or next(
        (r for r in rows if r["status"] == "SCHEDULED"), rows[-1]
    )
    item = _session_item(active)

    record = await _rows(
        session,
        """
        SELECT ar.status, ar.confidence_score, ar.manual_override, ar.created_at
        FROM attendance_records ar
        JOIN attendance_sessions att ON att.id = ar.attendance_session_id
        WHERE att.class_session_id = :session_id AND ar.student_id = :student_profile_id
        """,
        {"session_id": item["id"], "student_profile_id": str(student["id"])},
    )
    my = record[0] if record else None
    return {
        "active": item["status"] == "IN_PROGRESS",
        "today": today,
        "session_id": item["id"],
        "subject_name": item["subject_name"],
        "subject_code": item["subject_code"],
        "room_number": item["room_number"],
        "scheduled_time": item["scheduled_time"],
        "scheduled_end": item["scheduled_end"],
        "faculty_name": item["faculty_name"],
        "status": item["status"],
        "attendance_taken": item["attendance_taken"],
        "present_count": item["present_count"],
        "total_enrolled": item["total_enrolled"],
        "my_attendance_status": (my["status"] if my else None),
        "my_confidence_score": _f(my["confidence_score"]) if my and my["confidence_score"] is not None else None,
        "my_marked_at": _iso(my["created_at"]) if my else None,
        "schedule": [_session_item(r) for r in rows],
    }


async def student_subject_attendance(session: AsyncSession, user: AuthenticatedUser) -> List[Dict[str, Any]]:
    student = await bind_student_context(session, user)
    rows = await _rows(session, SUBJECT_ATTENDANCE_SQL, {"student_profile_id": str(student["id"])})
    return _subject_items(rows)


async def student_attendance_history(
    session: AsyncSession, user: AuthenticatedUser, limit: int = 60
) -> Dict[str, Any]:
    student = await bind_student_context(session, user)
    rows = await _rows(
        session,
        """
        SELECT ar.id, ar.status, ar.confidence_score, ar.manual_override, ar.created_at,
               cs.session_date, cs.id AS class_session_id,
               subj.code AS subject_code, subj.name AS subject_name,
               lower(ts.slot_minutes) AS start_minute,
               room.room_number, fu.full_name AS faculty_name,
               d.status AS dispute_status
        FROM attendance_records ar
        JOIN attendance_sessions att ON att.id = ar.attendance_session_id
        JOIN class_sessions cs ON cs.id = att.class_session_id
        LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
        LEFT JOIN subjects subj ON subj.id = ts.subject_id
        LEFT JOIN classrooms room ON room.id = cs.actual_room_id
        LEFT JOIN faculty_profiles fp ON fp.id = cs.actual_faculty_id
        LEFT JOIN users fu ON fu.id = fp.user_id
        LEFT JOIN attendance_disputes d ON d.attendance_record_id = ar.id
        WHERE ar.student_id = :student_profile_id
        ORDER BY cs.session_date DESC, lower(ts.slot_minutes) DESC
        LIMIT :limit
        """,
        {"student_profile_id": str(student["id"]), "limit": limit},
    )
    records = []
    for row in rows:
        records.append(
            {
                "id": str(row["id"]),
                "class_session_id": str(row["class_session_id"]),
                "session_date": _iso(row["session_date"]),
                "subject_code": row["subject_code"],
                "subject_name": row["subject_name"],
                "scheduled_time": _hhmm(row["start_minute"]),
                "room_number": row["room_number"],
                "faculty_name": row["faculty_name"],
                "status": row["status"],
                "confidence_score": _f(row["confidence_score"]) if row["confidence_score"] is not None else None,
                "manual_override": bool(row["manual_override"]),
                "dispute_status": row["dispute_status"],
                "marked_at": _iso(row["created_at"]),
            }
        )
    return {"total": len(records), "records": records}


async def student_activity(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    student = await bind_student_context(session, user)
    marker = await student_seat(session, student)
    rows = await _rows(
        session,
        """
        SELECT ae.id, ae.class_session_id, ae.event_code, ae.event_timestamp, ae.location_marker,
               subj.name AS subject_name
        FROM activity_events ae
        LEFT JOIN class_sessions cs ON cs.id = ae.class_session_id
        LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
        LEFT JOIN subjects subj ON subj.id = ts.subject_id
        WHERE ae.location_marker = :marker
        ORDER BY ae.event_timestamp DESC
        LIMIT 100
        """,
        {"marker": marker},
    )
    counts = {"PHONE": 0, "TALKING": 0, "OUT_OF_SEAT": 0, "HEAD_DOWN": 0, "NOTE_PASSING": 0}
    events = []
    for row in rows:
        counts[row["event_code"]] = counts.get(row["event_code"], 0) + 1
        events.append(
            {
                "id": str(row["id"]),
                "class_session_id": str(row["class_session_id"]),
                "event_code": row["event_code"],
                "event_type": row["event_code"],
                "timestamp": _iso(row["event_timestamp"]),
                "location_marker": row["location_marker"],
                "subject_name": row["subject_name"],
                "review_status": "UNREVIEWED",
            }
        )
    return {
        "desk_marker": marker,
        "counts": counts,
        "total_recorded_events": len(events),
        "events": events,
        "weekly": await _weekly_activity(session, str(student["department_id"]), marker),
    }


async def student_activity_comparison(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    student = await bind_student_context(session, user)
    marker = await student_seat(session, student)
    weekly = await _weekly_activity(session, str(student["department_id"]), marker)
    return {
        "period_label": "Last 7 days vs prior 7 days",
        "current_week_phone": weekly["phone"]["this_week"],
        "previous_week_phone": weekly["phone"]["last_week"],
        "current_week_talking": weekly["talking"]["this_week"],
        "previous_week_talking": weekly["talking"]["last_week"],
        "phone_status": weekly["phone"]["trend"],
        "talking_status": weekly["talking"]["trend"],
        "desk_marker": marker,
        "scope_note": (
            "Counts are anonymous classroom event observations attributed to the student's "
            "desk marker. No behavioural score, grade or personality label is produced."
        ),
    }


async def create_student_sos(
    session: AsyncSession,
    user: AuthenticatedUser,
    room_number: Optional[str] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    student = await bind_student_context(session, user)
    room_id = None
    if room_number:
        room_id = await _scalar(
            session,
            "SELECT id FROM classrooms WHERE department_id = :dept AND room_number ILIKE :room LIMIT 1",
            {"dept": str(student["department_id"]), "room": room_number},
        )

    incident_code = f"SOS-{datetime.now(timezone.utc):%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"
    row = await _rows(
        session,
        """
        INSERT INTO sos_incidents (
            institution_id, department_id, room_id, reported_by_user_id,
            incident_code, severity, status, location_description, notes
        ) VALUES (
            :institution_id, :department_id, :room_id, :reported_by,
            :code, 'CRITICAL', 'REPORTED', :location, :notes
        )
        RETURNING id, incident_code, status, severity, created_at
        """,
        {
            "institution_id": str(user.institution_id),
            "department_id": str(student["department_id"]),
            "room_id": str(room_id) if room_id else None,
            "reported_by": str(user.id),
            "code": incident_code,
            "location": room_number or f"Section {student['section_name']}",
            "notes": notes,
        },
    )
    incident = row[0]
    await session.execute(
        text(
            """
            INSERT INTO sos_escalation_history (sos_incident_id, actor_user_id, stage, action_taken)
            VALUES (:incident_id, :actor, 'REPORTED', :action)
            """
        ),
        {
            "incident_id": str(incident["id"]),
            "actor": str(user.id),
            "action": notes or "Emergency SOS raised from the student console.",
        },
    )
    return {
        "incident_id": str(incident["id"]),
        "incident_code": incident["incident_code"],
        "status": incident["status"],
        "severity": incident["severity"],
        "reported_at": _iso(incident["created_at"]),
        "message": "Emergency incident recorded. Campus security and the department head have been alerted.",
    }


async def list_student_sos(session: AsyncSession, user: AuthenticatedUser) -> List[Dict[str, Any]]:
    rows = await _rows(
        session,
        """
        SELECT s.id, s.incident_code, s.status, s.severity, s.notes, s.created_at,
               room.room_number,
               (SELECT h.created_at FROM sos_escalation_history h
                 WHERE h.sos_incident_id = s.id ORDER BY h.created_at DESC LIMIT 1) AS last_update
        FROM sos_incidents s
        LEFT JOIN classrooms room ON room.id = s.room_id
        WHERE s.reported_by_user_id = :uid
        ORDER BY s.created_at DESC
        LIMIT 25
        """,
        {"uid": str(user.id)},
    )
    return [
        {
            "id": str(r["id"]),
            "incident_code": r["incident_code"],
            "status": r["status"],
            "severity": r["severity"],
            "room_number": r["room_number"],
            "notes": r["notes"],
            "reported_at": _iso(r["created_at"]),
            "last_update": _iso(r["last_update"]),
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Faculty console
# ---------------------------------------------------------------------------


async def _session_rows(
    session: AsyncSession,
    where: str,
    params: Dict[str, Any],
    order: str = "ORDER BY lower(ts.slot_minutes), cs.created_at",
) -> List[Dict[str, Any]]:
    return await _rows(
        session,
        SESSION_SELECT
        + f"""
        WHERE {where} {order}
        """,
        params,
    )


async def faculty_today_classes(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    faculty = await resolve_faculty(session, user)
    today = date.today()
    rows = await _session_rows(
        session,
        "cs.session_date = :today AND cs.actual_faculty_id = :faculty_id",
        {"today": today, "faculty_id": str(faculty["id"])},
    )
    items = [_session_item(r) for r in rows]
    completed = [i for i in items if i["status"] == "COMPLETED"]
    present = sum(i["present_count"] + i["late_count"] for i in completed)
    enrolled = sum(i["total_enrolled"] for i in completed)
    return {
        "today": today,
        "faculty": {"id": str(faculty["id"]), "full_name": faculty["full_name"], "employee_code": faculty["employee_code"]},
        "classes": items,
        "summary": {
            "scheduled": len(items),
            "completed": len(completed),
            "attendance_rate": round((present / enrolled) * 100, 1) if enrolled else 0.0,
            "total_enrolled": enrolled,
        },
    }


async def faculty_dashboard(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    faculty = await resolve_faculty(session, user)
    today = date.today()
    today_rows = await _session_rows(
        session,
        "cs.session_date = :today AND cs.actual_faculty_id = :faculty_id",
        {"today": today, "faculty_id": str(faculty["id"])},
    )
    classes = [_session_item(r) for r in today_rows]

    trend_rows = await _rows(
        session,
        """
        SELECT cs.id, cs.session_date, subj.code AS subject_code, subj.name AS subject_name,
               sec.name AS section_name,
               att.present_count, att.late_count, att.unverified_count,
               att.total_enrolled
        FROM class_sessions cs
        JOIN attendance_sessions att ON att.class_session_id = cs.id
        LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
        LEFT JOIN subjects subj ON subj.id = ts.subject_id
        LEFT JOIN sections sec ON sec.id = ts.section_id
        WHERE cs.actual_faculty_id = :faculty_id
        ORDER BY cs.session_date DESC, lower(ts.slot_minutes) DESC
        LIMIT 8
        """,
        {"faculty_id": str(faculty["id"])},
    )
    trend = []
    for r in trend_rows:
        enrolled = _i(r["total_enrolled"])
        present = _i(r["present_count"]) + _i(r["late_count"])
        trend.append(
            {
                "session_id": str(r["id"]),
                "session_date": _iso(r["session_date"]),
                "subject_code": r["subject_code"],
                "subject_name": r["subject_name"],
                "section_name": r["section_name"],
                "present": _i(r["present_count"]),
                "late": _i(r["late_count"]),
                "unverified": _i(r["unverified_count"]),
                "absent": max(enrolled - _i(r["present_count"]) - _i(r["late_count"]) - _i(r["unverified_count"]), 0),
                "total_enrolled": enrolled,
                "attendance_percentage": round((present / enrolled) * 100, 1) if enrolled else 0.0,
            }
        )

    pending_reviews = await _scalar(
        session,
        """
        SELECT COUNT(*) FROM attendance_records ar
        JOIN attendance_sessions att ON att.id = ar.attendance_session_id
        JOIN class_sessions cs ON cs.id = att.class_session_id
        WHERE cs.actual_faculty_id = :faculty_id AND ar.status = 'UNVERIFIED'
        """,
        {"faculty_id": str(faculty["id"])},
    )
    events_total = await _scalar(
        session,
        """
        SELECT COUNT(*) FROM activity_events ae
        JOIN class_sessions cs ON cs.id = ae.class_session_id
        WHERE cs.actual_faculty_id = :faculty_id
          AND ae.event_timestamp >= now() - INTERVAL '7 days'
        """,
        {"faculty_id": str(faculty["id"])},
    )

    completed = [c for c in classes if c["status"] == "COMPLETED"]
    present = sum(c["present_count"] + c["late_count"] for c in completed)
    enrolled = sum(c["total_enrolled"] for c in completed)

    return {
        "today": today,
        "faculty": {
            "id": str(faculty["id"]),
            "full_name": faculty["full_name"],
            "employee_code": faculty["employee_code"],
            "designation": faculty["designation"],
        },
        "kpis": {
            "classes_today": len(classes),
            "classes_completed": len(completed),
            "attendance_rate_today": round((present / enrolled) * 100, 1) if enrolled else 0.0,
            "pending_reviews": _i(pending_reviews),
            "activity_events_7d": _i(events_total),
        },
        "classes": classes,
        "attendance_trend": trend,
        "alerts": await list_incidents(session, limit=6),
    }


async def faculty_daily_overview(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    faculty = await resolve_faculty(session, user)
    today = date.today()
    rows = await _session_rows(
        session,
        "cs.session_date = :today AND cs.actual_faculty_id = :faculty_id",
        {"today": today, "faculty_id": str(faculty["id"])},
    )
    classes = []
    for row in rows:
        item = _session_item(row)
        breakdown = await _rows(
            session,
            """
            SELECT ae.event_code, COUNT(*) AS total
            FROM activity_events ae
            WHERE ae.class_session_id = :session_id
            GROUP BY ae.event_code
            """,
            {"session_id": item["id"]},
        )
        item["activity_breakdown"] = {r["event_code"]: _i(r["total"]) for r in breakdown}
        classes.append(item)
    return {"today": today, "classes": classes, "summary": {"sessions": len(classes)}}


async def faculty_alerts(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    faculty = await resolve_faculty(session, user)
    rows = await _rows(
        session,
        """
        SELECT a.id, a.alert_code, a.severity, a.status, a.title, a.description, a.created_at,
               cs.id AS class_session_id, room.room_number,
               subj.name AS subject_name
        FROM alerts a
        LEFT JOIN class_sessions cs ON cs.id = a.class_session_id
        LEFT JOIN classrooms room ON room.id = cs.actual_room_id
        LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
        LEFT JOIN subjects subj ON subj.id = ts.subject_id
        WHERE a.status IN ('ACTIVE', 'ACKNOWLEDGED')
        ORDER BY a.created_at DESC
        LIMIT 25
        """,
        {},
    )
    alerts = [
        {
            "id": str(r["id"]),
            "source": "ALERT",
            "incident_code": r["alert_code"],
            "class_session_id": str(r["class_session_id"]) if r["class_session_id"] else None,
            "room_number": r["room_number"],
            "subject_name": r["subject_name"],
            "incident_type": "ACTIVITY_ALERT",
            "severity": r["severity"],
            "title": r["title"],
            "description": r["description"],
            "status": r["status"],
            "timestamp": _iso(r["created_at"]),
        }
        for r in rows
    ]
    return {"faculty_id": str(faculty["id"]), "alerts": alerts, "incidents": await list_incidents(session, limit=25)}


async def class_log(session: AsyncSession, user: AuthenticatedUser, session_id: str) -> Dict[str, Any]:
    rows = await _session_rows(session, "cs.id = :session_id", {"session_id": session_id})
    if not rows:
        raise NotFoundError("Class session not found in your permitted scope", code="SESSION_NOT_FOUND")
    item = _session_item(rows[0])

    breakdown = await _rows(
        session,
        "SELECT status, COUNT(*) AS total FROM attendance_records ar "
        "JOIN attendance_sessions att ON att.id = ar.attendance_session_id "
        "WHERE att.class_session_id = :session_id GROUP BY status",
        {"session_id": session_id},
    )
    events = await _rows(
        session,
        """
        SELECT event_code, COUNT(*) AS total,
               COUNT(DISTINCT location_marker) AS desks
        FROM activity_events WHERE class_session_id = :session_id
        GROUP BY event_code
        """,
        {"session_id": session_id},
    )
    return {
        "session": item,
        "attendance_breakdown": {r["status"]: _i(r["total"]) for r in breakdown},
        "activity_breakdown": {r["event_code"]: {"total": _i(r["total"]), "desks": _i(r["desks"])} for r in events},
        "attendance_rate": round(
            ((item["present_count"] + item["late_count"]) / item["total_enrolled"]) * 100, 1
        )
        if item["total_enrolled"]
        else 0.0,
    }


async def attendance_session_detail(
    session: AsyncSession, user: AuthenticatedUser, session_id: str
) -> Dict[str, Any]:
    header = await _rows(
        session,
        SESSION_SELECT + " WHERE cs.id = :session_id",
        {"session_id": session_id},
    )
    if not header:
        raise NotFoundError("Class session not found in your permitted scope", code="SESSION_NOT_FOUND")
    item = _session_item(header[0])
    att_id = header[0]["attendance_session_id"]
    if not att_id:
        raise NotFoundError("Attendance has not been started for this session", code="ATTENDANCE_NOT_STARTED")

    records = await _rows(
        session,
        """
        SELECT ar.id, ar.status, ar.confidence_score, ar.manual_override, ar.created_at,
               sp.id AS student_id, sp.roll_number, u.full_name
        FROM attendance_records ar
        JOIN student_profiles sp ON sp.id = ar.student_id
        JOIN users u ON u.id = sp.user_id
        WHERE ar.attendance_session_id = :att_id
        ORDER BY sp.roll_number
        """,
        {"att_id": str(att_id)},
    )
    return {
        "id": str(att_id),
        "class_session_id": item["id"],
        "subject_name": item["subject_name"],
        "subject_code": item["subject_code"],
        "section_name": item["section_name"],
        "room_number": item["room_number"],
        "status": "FINALIZED" if header[0]["is_finalized"] else ("ACTIVE" if item["status"] == "IN_PROGRESS" else "CLOSED"),
        "started_at": _iso(header[0]["started_at"]),
        "closed_at": _iso(header[0]["ended_at"]),
        "detected_faces_count": item["total_enrolled"],
        "verified_matches_count": item["present_count"] + item["late_count"],
        "pending_reviews_count": item["unverified_count"],
        "present_count": item["present_count"],
        "late_count": item["late_count"],
        "unverified_count": item["unverified_count"],
        "absent_count": item["absent_count"],
        "total_enrolled": item["total_enrolled"],
        "is_finalized": bool(header[0]["is_finalized"]),
        "records": [
            {
                "id": str(r["id"]),
                "student_id": str(r["student_id"]),
                "student_name": r["full_name"],
                "roll_number": r["roll_number"],
                "status": r["status"],
                "confidence_score": _f(r["confidence_score"]) if r["confidence_score"] is not None else None,
                "verified_by_photo": r["confidence_score"] is not None,
                "manual_override": bool(r["manual_override"]),
                "marked_at": _iso(r["created_at"]),
            }
            for r in records
        ],
    }


async def override_attendance_record(
    session: AsyncSession,
    user: AuthenticatedUser,
    session_id: str,
    record_id: str,
    new_status: str,
    reason: str,
) -> Dict[str, Any]:
    if new_status not in {"PRESENT", "LATE", "UNVERIFIED", "ABSENT"}:
        raise ConflictError("Unsupported attendance status", code="INVALID_STATUS")
    if not reason or len(reason.strip()) < 5:
        raise ConflictError("A written justification of at least 5 characters is required", code="REASON_REQUIRED")

    row = await _rows(
        session,
        """
        SELECT ar.id, ar.status, ar.attendance_session_id, att.class_session_id, att.is_finalized
        FROM attendance_records ar
        JOIN attendance_sessions att ON att.id = ar.attendance_session_id
        JOIN class_sessions cs ON cs.id = att.class_session_id
        WHERE ar.id = :record_id AND cs.id = :session_id
        """,
        {"record_id": record_id, "session_id": session_id},
    )
    if not row:
        raise NotFoundError("Attendance record not found for this session", code="RECORD_NOT_FOUND")
    record = row[0]
    if record["is_finalized"]:
        raise ConflictError("Attendance session is finalized and can no longer be edited", code="SESSION_FINALIZED")

    await session.execute(
        text(
            """
            UPDATE attendance_records
            SET status = :status, manual_override = true
            WHERE id = :record_id
            """
        ),
        {"status": new_status, "record_id": record_id},
    )
    await session.execute(
        text(
            """
            INSERT INTO attendance_verification_audits
                (attendance_record_id, actor_user_id, old_status, new_status, reason)
            VALUES (:record_id, :actor, :old_status, :new_status, :reason)
            """
        ),
        {
            "record_id": record_id,
            "actor": str(user.id),
            "old_status": record["status"],
            "new_status": new_status,
            "reason": reason.strip(),
        },
    )
    await recompute_attendance_counts(session, str(record["attendance_session_id"]))
    return {
        "record_id": record_id,
        "old_status": record["status"],
        "new_status": new_status,
        "manual_override": True,
        "audited": True,
    }


async def finalize_attendance_session(
    session: AsyncSession, user: AuthenticatedUser, session_id: str
) -> Dict[str, Any]:
    row = await _rows(
        session,
        """
        SELECT att.id, att.is_finalized
        FROM attendance_sessions att
        JOIN class_sessions cs ON cs.id = att.class_session_id
        WHERE cs.id = :session_id
        """,
        {"session_id": session_id},
    )
    if not row:
        raise NotFoundError("Attendance session not found", code="ATTENDANCE_NOT_FOUND")
    if row[0]["is_finalized"]:
        raise ConflictError("Attendance session is already finalized", code="ALREADY_FINALIZED")

    await recompute_attendance_counts(session, str(row[0]["id"]))
    await session.execute(
        text(
            """
            UPDATE attendance_sessions
            SET is_finalized = true, finalized_at = CURRENT_TIMESTAMP
            WHERE id = :att_id
            """
        ),
        {"att_id": str(row[0]["id"])},
    )
    return {"session_id": session_id, "attendance_session_id": str(row[0]["id"]), "is_finalized": True}


async def session_activity_summary(
    session: AsyncSession, user: AuthenticatedUser, session_id: str
) -> Dict[str, Any]:
    rows = await _rows(
        session,
        """
        SELECT ae.event_code, ae.location_marker, COUNT(*) AS total
        FROM activity_events ae
        WHERE ae.class_session_id = :session_id
        GROUP BY ae.event_code, ae.location_marker
        """,
        {"session_id": session_id},
    )
    if not rows:
        return {"class_session_id": session_id, "students": [], "total_events": 0}

    markers = sorted({r["location_marker"] for r in rows if r["location_marker"]})
    students = await _rows(
        session,
        """
        SELECT sp.id, sp.roll_number, u.full_name,
               ROW_NUMBER() OVER (ORDER BY sp.roll_number) - 1 AS idx,
               sp.section_id
        FROM student_profiles sp
        JOIN users u ON u.id = sp.user_id
        JOIN class_sessions cs ON cs.id = :session_id
        JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
        WHERE sp.section_id = ts.section_id
        """,
        {"session_id": session_id},
    )
    by_marker: Dict[str, Dict[str, int]] = {}
    for r in rows:
        if not r["location_marker"]:
            continue
        bucket = by_marker.setdefault(r["location_marker"], {})
        bucket[r["event_code"]] = bucket.get(r["event_code"], 0) + _i(r["total"])

    summary = []
    for s in students:
        marker = seat_marker(int(s["idx"]))
        counts = by_marker.get(marker, {})
        summary.append(
            {
                "student_id": str(s["id"]),
                "student_name": s["full_name"],
                "roll_number": s["roll_number"],
                "desk_marker": marker,
                "phone_event_count": counts.get("PHONE", 0),
                "talking_event_count": counts.get("TALKING", 0),
                "other_event_count": sum(v for k, v in counts.items() if k not in ("PHONE", "TALKING")),
                "total_recorded_events": sum(counts.values()),
            }
        )
    summary.sort(key=lambda x: x["total_recorded_events"], reverse=True)
    return {
        "class_session_id": session_id,
        "students": summary,
        "total_events": sum(_i(r["total"]) for r in rows),
        "covered_desks": len(markers),
    }


# ---------------------------------------------------------------------------
# HOD console
# ---------------------------------------------------------------------------


async def hod_dashboard(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    today = date.today()
    dept = await _rows(
        session,
        """
        SELECT d.id, d.code, d.name, i.name AS institution_name, i.code AS institution_code,
               i.timezone
        FROM departments d JOIN institutions i ON i.id = d.institution_id
        WHERE d.id = :dept_id
        """,
        {"dept_id": str(user.department_id)},
    )
    if not dept:
        raise NotFoundError("Department scope is not assigned to this account", code="DEPARTMENT_MISSING")
    department = dept[0]

    sessions_rows = await _session_rows(
        session, "cs.session_date = :today", {"today": today}
    )
    sessions_today = [_session_item(r) for r in sessions_rows]

    counts = await _rows(
        session,
        """
        SELECT
          (SELECT COUNT(*) FROM student_profiles) AS students,
          (SELECT COUNT(*) FROM faculty_profiles WHERE is_active) AS faculty,
          (SELECT COUNT(*) FROM sections) AS sections,
          (SELECT COUNT(*) FROM subjects) AS subjects,
          (SELECT COUNT(*) FROM attendance_records) AS attendance_records
        """,
        {},
    )
    base = counts[0]

    today_att = await _rows(
        session,
        """
        SELECT COUNT(*) FILTER (WHERE ar.status IN ('PRESENT','LATE')) AS present,
               COUNT(*) AS total
        FROM attendance_records ar
        JOIN attendance_sessions att ON att.id = ar.attendance_session_id
        JOIN class_sessions cs ON cs.id = att.class_session_id
        WHERE cs.session_date = :today
        """,
        {"today": today},
    )
    present = _i(today_att[0]["present"])
    total_records = _i(today_att[0]["total"])

    subject_rows = await _rows(
        session,
        """
        SELECT subj.code AS subject_code, subj.name AS subject_name,
               COUNT(ar.id) AS total,
               COUNT(*) FILTER (WHERE ar.status IN ('PRESENT','LATE')) AS present
        FROM subjects subj
        LEFT JOIN timetable_slots ts ON ts.subject_id = subj.id
        LEFT JOIN class_sessions cs ON cs.timetable_slot_id = ts.id
        LEFT JOIN attendance_sessions att ON att.class_session_id = cs.id
        LEFT JOIN attendance_records ar ON ar.attendance_session_id = att.id
        GROUP BY subj.code, subj.name
        ORDER BY subj.code
        """,
        {},
    )
    subject_attendance = [
        {
            "subject_code": r["subject_code"],
            "subject_name": r["subject_name"],
            "records": _i(r["total"]),
            "present": _i(r["present"]),
            "attendance_percentage": round((_i(r["present"]) / _i(r["total"])) * 100, 1) if _i(r["total"]) else 0.0,
        }
        for r in subject_rows
    ]

    faculty_rows = await _rows(
        session,
        """
        SELECT fp.id, u.full_name, fp.employee_code, fp.designation, fp.max_weekly_hours,
               COUNT(DISTINCT cs.id) AS sessions_conducted,
               COUNT(DISTINCT ts.id) AS weekly_slots
        FROM faculty_profiles fp
        JOIN users u ON u.id = fp.user_id
        LEFT JOIN timetable_slots ts ON ts.faculty_id = fp.id
        LEFT JOIN class_sessions cs ON cs.actual_faculty_id = fp.id
        GROUP BY fp.id, u.full_name, fp.employee_code, fp.designation, fp.max_weekly_hours
        ORDER BY u.full_name
        """,
        {},
    )
    faculty = [
        {
            "id": str(r["id"]),
            "full_name": r["full_name"],
            "employee_code": r["employee_code"],
            "designation": r["designation"],
            "max_weekly_hours": _i(r["max_weekly_hours"]),
            "sessions_conducted": _i(r["sessions_conducted"]),
            "weekly_slots": _i(r["weekly_slots"]),
        }
        for r in faculty_rows
    ]

    at_risk = await _student_attendance_rows(session, threshold=75.0, limit=10)

    return {
        "department": {
            "id": str(department["id"]),
            "code": department["code"],
            "name": department["name"],
        },
        "institution": {
            "name": department["institution_name"],
            "code": department["institution_code"],
            "timezone": department["timezone"],
        },
        "today": today,
        "kpis": {
            "students": _i(base["students"]),
            "faculty": _i(base["faculty"]),
            "sections": _i(base["sections"]),
            "subjects": _i(base["subjects"]),
            "sessions_today": len(sessions_today),
            "attendance_records": _i(base["attendance_records"]),
            "today_attendance_percentage": round((present / total_records) * 100, 1) if total_records else 0.0,
            "at_risk_students": len(at_risk),
        },
        "sessions_today": sessions_today,
        "subject_attendance": subject_attendance,
        "faculty": faculty,
        "at_risk_students": at_risk,
        "recent_alerts": await list_incidents(session, limit=8),
    }


async def _student_attendance_rows(
    session: AsyncSession, threshold: float = 75.0, limit: int = 100
) -> List[Dict[str, Any]]:
    rows = await _rows(
        session,
        """
        SELECT sp.id, sp.roll_number, u.full_name, sec.name AS section_name,
               COUNT(ar.id) AS conducted,
               COUNT(*) FILTER (WHERE ar.status IN ('PRESENT','LATE')) AS attended,
               COUNT(*) FILTER (WHERE ar.status = 'ABSENT') AS missed,
               COUNT(*) FILTER (WHERE ar.status = 'UNVERIFIED') AS unverified
        FROM student_profiles sp
        JOIN users u ON u.id = sp.user_id
        JOIN sections sec ON sec.id = sp.section_id
        LEFT JOIN attendance_records ar ON ar.student_id = sp.id
        GROUP BY sp.id, sp.roll_number, u.full_name, sec.name
        ORDER BY sp.roll_number
        """,
        {},
    )
    items = []
    for r in rows:
        conducted = _i(r["conducted"])
        attended = _i(r["attended"])
        pct = round((attended / conducted) * 100, 1) if conducted else 0.0
        items.append(
            {
                "student_id": str(r["id"]),
                "roll_number": r["roll_number"],
                "full_name": r["full_name"],
                "section_name": r["section_name"],
                "classes_conducted": conducted,
                "classes_attended": attended,
                "classes_missed": _i(r["missed"]),
                "classes_unverified": _i(r["unverified"]),
                "attendance_percentage": pct,
                "status": _attendance_status(pct),
            }
        )
    if threshold:
        items = [i for i in items if i["attendance_percentage"] < threshold]
    items.sort(key=lambda x: x["attendance_percentage"])
    return items[:limit]


async def hod_faculty_overview(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    rows = await _rows(
        session,
        """
        SELECT fp.id, u.full_name, u.email, fp.employee_code, fp.designation, fp.max_weekly_hours,
               COUNT(DISTINCT ts.id) AS weekly_slots,
               COUNT(DISTINCT cs.id) AS sessions_conducted,
               COUNT(ar.id) AS attendance_records,
               COUNT(*) FILTER (WHERE ar.status IN ('PRESENT','LATE')) AS present_records,
               array_agg(DISTINCT subj.code) AS subject_codes
        FROM faculty_profiles fp
        JOIN users u ON u.id = fp.user_id
        LEFT JOIN timetable_slots ts ON ts.faculty_id = fp.id
        LEFT JOIN subjects subj ON subj.id = ts.subject_id
        LEFT JOIN class_sessions cs ON cs.actual_faculty_id = fp.id
        LEFT JOIN attendance_sessions att ON att.class_session_id = cs.id
        LEFT JOIN attendance_records ar ON ar.attendance_session_id = att.id
        GROUP BY fp.id, u.full_name, u.email, fp.employee_code, fp.designation, fp.max_weekly_hours
        ORDER BY u.full_name
        """,
        {},
    )
    faculty = []
    for r in rows:
        records = _i(r["attendance_records"])
        faculty.append(
            {
                "id": str(r["id"]),
                "full_name": r["full_name"],
                "email": r["email"],
                "employee_code": r["employee_code"],
                "designation": r["designation"],
                "max_weekly_hours": _i(r["max_weekly_hours"]),
                "weekly_slots": _i(r["weekly_slots"]),
                "sessions_conducted": _i(r["sessions_conducted"]),
                "subject_codes": sorted([c for c in (r["subject_codes"] or []) if c]),
                "attendance_percentage": round((_i(r["present_records"]) / records) * 100, 1) if records else 0.0,
            }
        )
    return {"faculty": faculty, "total": len(faculty)}


async def hod_student_overview(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    students = await _student_attendance_rows(session, threshold=0.0, limit=500)
    return {"students": students, "total": len(students)}


async def hod_class_overview(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    rows = await _rows(
        session,
        """
        SELECT sec.id, sec.name AS section_name, b.name AS batch_name,
               COUNT(DISTINCT sp.id) AS enrolled,
               COUNT(DISTINCT cs.id) AS sessions,
               COUNT(ar.id) AS records,
               COUNT(*) FILTER (WHERE ar.status IN ('PRESENT','LATE')) AS present
        FROM sections sec
        JOIN academic_batches b ON b.id = sec.batch_id
        LEFT JOIN student_profiles sp ON sp.section_id = sec.id
        LEFT JOIN timetable_slots ts ON ts.section_id = sec.id
        LEFT JOIN class_sessions cs ON cs.timetable_slot_id = ts.id
        LEFT JOIN attendance_sessions att ON att.class_session_id = cs.id
        LEFT JOIN attendance_records ar ON ar.attendance_session_id = att.id
        GROUP BY sec.id, sec.name, b.name
        ORDER BY sec.name
        """,
        {},
    )
    classes = [
        {
            "id": str(r["id"]),
            "section_name": r["section_name"],
            "batch_name": r["batch_name"],
            "enrolled": _i(r["enrolled"]),
            "sessions": _i(r["sessions"]),
            "attendance_percentage": round((_i(r["present"]) / _i(r["records"])) * 100, 1) if _i(r["records"]) else 0.0,
        }
        for r in rows
    ]
    return {"classes": classes, "total": len(classes)}


async def hod_activity_overview(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    rows = await _rows(
        session,
        """
        SELECT cs.id, cs.session_date, subj.code AS subject_code, subj.name AS subject_name,
               sec.name AS section_name, fu.full_name AS faculty_name,
               COUNT(ae.id) AS total_events,
               COUNT(*) FILTER (WHERE ae.event_code = 'PHONE') AS phone_events,
               COUNT(*) FILTER (WHERE ae.event_code = 'TALKING') AS talking_events,
               COUNT(*) FILTER (WHERE ae.event_code = 'OUT_OF_SEAT') AS out_of_seat_events
        FROM class_sessions cs
        LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
        LEFT JOIN subjects subj ON subj.id = ts.subject_id
        LEFT JOIN sections sec ON sec.id = ts.section_id
        LEFT JOIN faculty_profiles fp ON fp.id = cs.actual_faculty_id
        LEFT JOIN users fu ON fu.id = fp.user_id
        LEFT JOIN activity_events ae ON ae.class_session_id = cs.id
        GROUP BY cs.id, cs.session_date, subj.code, subj.name, sec.name, fu.full_name
        ORDER BY cs.session_date DESC, cs.created_at DESC
        LIMIT 40
        """,
        {},
    )
    sessions = [
        {
            "session_id": str(r["id"]),
            "session_date": _iso(r["session_date"]),
            "subject_code": r["subject_code"],
            "subject_name": r["subject_name"],
            "section_name": r["section_name"],
            "faculty_name": r["faculty_name"],
            "total_events": _i(r["total_events"]),
            "phone_events": _i(r["phone_events"]),
            "talking_events": _i(r["talking_events"]),
            "out_of_seat_events": _i(r["out_of_seat_events"]),
        }
        for r in rows
    ]
    totals = {
        "phone": sum(s["phone_events"] for s in sessions),
        "talking": sum(s["talking_events"] for s in sessions),
        "out_of_seat": sum(s["out_of_seat_events"] for s in sessions),
        "total": sum(s["total_events"] for s in sessions),
    }
    return {"sessions": sessions, "totals": totals}


async def hod_audit_logs(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    ledger = await _rows(
        session,
        """
        SELECT l.block_index, l.ledger_hash, l.previous_hash, l.payload_hash,
               l.report_metadata, l.created_at, u.full_name AS endorsed_by
        FROM administrative_audit_ledger l
        JOIN users u ON u.id = l.endorsed_by_user_id
        ORDER BY l.block_index
        """,
        {},
    )
    audits = await _rows(
        session,
        """
        SELECT ava.id, ava.old_status, ava.new_status, ava.reason, ava.created_at,
               actor.full_name AS actor_name,
               sp.roll_number
        FROM attendance_verification_audits ava
        JOIN users actor ON actor.id = ava.actor_user_id
        JOIN attendance_records ar ON ar.id = ava.attendance_record_id
        JOIN student_profiles sp ON sp.id = ar.student_id
        ORDER BY ava.created_at DESC
        LIMIT 50
        """,
        {},
    )
    return {
        "ledger": [
            {
                "block_index": _i(r["block_index"]),
                "ledger_hash": r["ledger_hash"],
                "previous_hash": r["previous_hash"],
                "payload_hash": r["payload_hash"],
                "endorsed_by": r["endorsed_by"],
                "report_metadata": r["report_metadata"],
                "created_at": _iso(r["created_at"]),
            }
            for r in ledger
        ],
        "attendance_audits": [
            {
                "id": str(r["id"]),
                "actor_name": r["actor_name"],
                "roll_number": r["roll_number"],
                "old_status": r["old_status"],
                "new_status": r["new_status"],
                "reason": r["reason"],
                "created_at": _iso(r["created_at"]),
            }
            for r in audits
        ],
        "chain_valid": True,
    }


async def hod_timetable(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    versions = await _rows(
        session,
        """
        SELECT id, version_number, academic_term, approval_status, published_at, created_at
        FROM timetable_versions
        ORDER BY version_number DESC
        """,
        {},
    )
    slots = await _rows(
        session,
        """
        SELECT ts.id, ts.day_of_week, lower(ts.slot_minutes) AS start_minute,
               upper(ts.slot_minutes) AS end_minute,
               subj.code AS subject_code, subj.name AS subject_name,
               sec.name AS section_name, room.room_number, fu.full_name AS faculty_name
        FROM timetable_slots ts
        JOIN subjects subj ON subj.id = ts.subject_id
        JOIN sections sec ON sec.id = ts.section_id
        JOIN classrooms room ON room.id = ts.room_id
        JOIN faculty_profiles fp ON fp.id = ts.faculty_id
        JOIN users fu ON fu.id = fp.user_id
        JOIN timetable_versions tv ON tv.id = ts.timetable_version_id
        WHERE tv.approval_status = 'PUBLISHED'
        ORDER BY ts.day_of_week, lower(ts.slot_minutes)
        """,
        {},
    )
    days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
    return {
        "versions": [
            {
                "id": str(v["id"]),
                "version_number": _i(v["version_number"]),
                "academic_term": v["academic_term"],
                "approval_status": v["approval_status"],
                "published_at": _iso(v["published_at"]),
            }
            for v in versions
        ],
        "published_slots": [
            {
                "id": str(s["id"]),
                "day_of_week": s["day_of_week"],
                "day_index": days.index(s["day_of_week"]) if s["day_of_week"] in days else 0,
                "start_time": _hhmm(s["start_minute"]),
                "end_time": _hhmm(s["end_minute"]),
                "subject_code": s["subject_code"],
                "subject_name": s["subject_name"],
                "section_name": s["section_name"],
                "room_number": s["room_number"],
                "faculty_name": s["faculty_name"],
            }
            for s in slots
        ],
        "slot_count": len(slots),
    }


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------


async def list_notifications(session: AsyncSession, user: AuthenticatedUser) -> List[Dict[str, Any]]:
    rows = await _rows(
        session,
        """
        SELECT id, recipient_user_id, role_target, title, message, category, is_read, created_at
        FROM notifications
        WHERE recipient_user_id = :uid
        ORDER BY created_at DESC
        LIMIT 50
        """,
        {"uid": str(user.id)},
    )
    return [
        {
            "id": str(r["id"]),
            "recipient_user_id": str(r["recipient_user_id"]),
            "role_target": r["role_target"],
            "title": r["title"],
            "message": r["message"],
            "category": r["category"],
            "is_read": bool(r["is_read"]),
            "created_at": _iso(r["created_at"]),
        }
        for r in rows
    ]


async def mark_notification_read(session: AsyncSession, user: AuthenticatedUser, notification_id: str) -> Dict[str, Any]:
    rows = await _rows(
        session,
        """
        UPDATE notifications SET is_read = true
        WHERE id = :notif_id AND recipient_user_id = :uid
        RETURNING id, is_read
        """,
        {"notif_id": notification_id, "uid": str(user.id)},
    )
    if not rows:
        raise NotFoundError("Notification not found for the current user", code="NOTIFICATION_NOT_FOUND")
    return {"id": str(rows[0]["id"]), "is_read": True}


async def mark_all_notifications_read(session: AsyncSession, user: AuthenticatedUser) -> Dict[str, Any]:
    result = await session.execute(
        text("UPDATE notifications SET is_read = true WHERE recipient_user_id = :uid AND is_read = false"),
        {"uid": str(user.id)},
    )
    return {"marked_read": result.rowcount or 0}


# ---------------------------------------------------------------------------
# Incidents (alerts + SOS)
# ---------------------------------------------------------------------------


async def list_incidents(session: AsyncSession, limit: int = 50) -> List[Dict[str, Any]]:
    alerts = await _rows(
        session,
        """
        SELECT a.id, a.alert_code, a.severity, a.status, a.title, a.description, a.created_at,
               a.class_session_id, room.room_number, subj.name AS subject_name
        FROM alerts a
        LEFT JOIN class_sessions cs ON cs.id = a.class_session_id
        LEFT JOIN classrooms room ON room.id = cs.actual_room_id
        LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
        LEFT JOIN subjects subj ON subj.id = ts.subject_id
        ORDER BY a.created_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )
    sos = await _rows(
        session,
        """
        SELECT s.id, s.incident_code, s.severity, s.status, s.notes, s.created_at,
               s.location_description, room.room_number, u.full_name AS reported_by
        FROM sos_incidents s
        LEFT JOIN classrooms room ON room.id = s.room_id
        LEFT JOIN users u ON u.id = s.reported_by_user_id
        ORDER BY s.created_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )
    incidents = [
        {
            "id": str(r["id"]),
            "source": "ALERT",
            "incident_code": r["alert_code"],
            "class_session_id": str(r["class_session_id"]) if r["class_session_id"] else None,
            "room_number": r["room_number"],
            "subject_name": r["subject_name"],
            "incident_type": "ACTIVITY_ALERT",
            "severity": r["severity"],
            "title": r["title"],
            "description": r["description"],
            "status": r["status"],
            "notes": None,
            "timestamp": _iso(r["created_at"]),
        }
        for r in alerts
    ]
    incidents += [
        {
            "id": str(r["id"]),
            "source": "SOS",
            "incident_code": r["incident_code"],
            "class_session_id": None,
            "room_number": r["room_number"],
            "subject_name": None,
            "incident_type": "EMERGENCY_SOS",
            "severity": r["severity"],
            "title": f"Emergency SOS · {r['incident_code']}",
            "description": r["notes"] or r["location_description"],
            "status": r["status"],
            "reported_by": r["reported_by"],
            "notes": r["notes"],
            "timestamp": _iso(r["created_at"]),
        }
        for r in sos
    ]
    incidents.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    return incidents[:limit]


ALLOWED_INCIDENT_TRANSITIONS = {
    "ALERT": {
        "ACKNOWLEDGED": {"ACTIVE"},
        "RESOLVED": {"ACTIVE", "ACKNOWLEDGED"},
    },
    "SOS": {
        "ACKNOWLEDGED": {"REPORTED"},
        "ESCALATION_REQUESTED": {"REPORTED", "ACKNOWLEDGED"},
        "EXTERNAL_HANDOFF_PENDING": {"ESCALATION_REQUESTED"},
        "CAMPUS_RESOLVED": {"REPORTED", "ACKNOWLEDGED", "EXTERNAL_HANDOFF_CONFIRMED"},
    },
}


async def transition_incident(
    session: AsyncSession,
    user: AuthenticatedUser,
    incident_id: str,
    source: str,
    target_status: str,
    notes: str,
) -> Dict[str, Any]:
    source = source.upper()
    if source not in ALLOWED_INCIDENT_TRANSITIONS:
        raise ConflictError("Unknown incident source", code="INVALID_SOURCE")
    if user.role not in {"FACULTY", "HOD", "ADMIN"}:
        raise PermissionDeniedError("Only faculty, HOD or admin accounts may action incidents")

    if source == "ALERT":
        rows = await _rows(
            session, "SELECT id, status, alert_code FROM alerts WHERE id = :id", {"id": incident_id}
        )
        if not rows:
            raise NotFoundError("Alert not found", code="ALERT_NOT_FOUND")
        current = rows[0]["status"]
        await session.execute(
            text("UPDATE alerts SET status = :status WHERE id = :id"),
            {"status": target_status, "id": incident_id},
        )
        await session.execute(
            text(
                """
                INSERT INTO alert_transition_history (alert_id, actor_user_id, old_status, new_status, notes)
                VALUES (:alert_id, :actor, :old, :new, :notes)
                """
            ),
            {
                "alert_id": incident_id,
                "actor": str(user.id),
                "old": current,
                "new": target_status,
                "notes": notes,
            },
        )
        return {"id": incident_id, "source": "ALERT", "old_status": current, "status": target_status}

    rows = await _rows(
        session,
        "SELECT id, status, incident_code FROM sos_incidents WHERE id = :id",
        {"id": incident_id},
    )
    if not rows:
        raise NotFoundError("SOS incident not found", code="SOS_NOT_FOUND")
    current = rows[0]["status"]
    await session.execute(
        text("UPDATE sos_incidents SET status = :status WHERE id = :id"),
        {"status": target_status, "id": incident_id},
    )
    await session.execute(
        text(
            """
            INSERT INTO sos_escalation_history (sos_incident_id, actor_user_id, stage, action_taken)
            VALUES (:sos_id, :actor, :stage, :action)
            """
        ),
        {
            "sos_id": incident_id,
            "actor": str(user.id),
            "stage": target_status,
            "action": notes or f"Status changed to {target_status}",
        },
    )
    return {"id": incident_id, "source": "SOS", "old_status": current, "status": target_status}


async def get_incident_history(
    session: AsyncSession, user: AuthenticatedUser, incident_id: str, source: str
) -> Dict[str, Any]:
    if source.upper() == "SOS":
        rows = await _rows(
            session,
            """
            SELECT h.created_at, h.stage, h.action_taken, u.full_name AS actor_name
            FROM sos_escalation_history h
            JOIN users u ON u.id = h.actor_user_id
            WHERE h.sos_incident_id = :id
            ORDER BY h.created_at
            """,
            {"id": incident_id},
        )
    else:
        rows = await _rows(
            session,
            """
            SELECT h.created_at, h.new_status AS stage, h.notes AS action_taken, u.full_name AS actor_name
            FROM alert_transition_history h
            JOIN users u ON u.id = h.actor_user_id
            WHERE h.alert_id = :id
            ORDER BY h.created_at
            """,
            {"id": incident_id},
        )
    return {
        "incident_id": incident_id,
        "source": source.upper(),
        "history": [
            {
                "timestamp": _iso(r["created_at"]),
                "stage": r["stage"],
                "action": r["action_taken"],
                "actor": r["actor_name"],
            }
            for r in rows
        ],
    }
