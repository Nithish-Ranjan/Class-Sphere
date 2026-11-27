"""
ClassSphere Student Service.
Implements business logic for student dashboards, class companion, and attendance analytics
under strict PostgreSQL Row-Level Security (RLS).
"""
from datetime import datetime, date, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select

from app.core.exceptions import NotFoundError, PermissionDeniedError, AppException, ConflictError
from app.schemas.student import (
    StudentDashboardResponse,
    StudentProfileSummary,
    CurrentClassSession,
    OverallAttendance,
    SubjectAttendanceSummary,
    WeeklyActivitySummary,
    WeeklyActivityEventMetric,
    TimetableAgendaItem,
    RecentAttendanceItem,
    StudentClassCompanionResponse,
    CompanionClassDetails,
    StudentSubjectAttendanceResponse,
    SOSIncidentType,
    StudentSOSCreateRequest,
    StudentSOSIncidentResponse,
    StudentAttendanceHistoryItem,
    StudentAttendanceHistoryResponse,
    StudentDisputeCreateRequest,
    StudentDisputeResponse,
    StudentActivityDetailResponse,
    StudentActivityTelemetryItem,
    ComparisonMetricItem,
    StudentActivityComparisonResponse,
    NotificationResponse,
    NotificationListResponse,
    StudentProfileDetailResponse,
)


def minutes_to_time_str(mins: int) -> str:
    """Converts minutes from midnight to a 12-hour formatted time string."""
    hours = mins // 60
    minutes = mins % 60
    period = "AM" if hours < 12 else "PM"
    display_hour = hours % 12
    if display_hour == 0:
        display_hour = 12
    return f"{display_hour:02d}:{minutes:02d} {period}"


def resolve_campus_timezone(tz_name: Optional[str]) -> ZoneInfo:
    """
    Resolves the campus IANA timezone.
    Falls back safely to UTC if timezone is None, empty, or unresolvable.
    """
    if not tz_name or not isinstance(tz_name, str):
        return ZoneInfo("UTC")
    try:
        return ZoneInfo(tz_name.strip())
    except Exception:
        return ZoneInfo("UTC")


def _parse_incident_type_and_notes(raw_notes: Optional[str]) -> Tuple[str, Optional[str]]:
    """
    Parses incident_type and actual student notes from stored metadata tag.
    Fallback to SOMETHING if tag is absent.
    """
    if not raw_notes:
        return "SOMETHING", None
    raw = raw_notes.strip()
    if raw.startswith("[TYPE:FELL]"):
        clean = raw[len("[TYPE:FELL]"):].strip()
        return "FELL", clean if clean else None
    elif raw.startswith("[TYPE:SOMETHING]"):
        clean = raw[len("[TYPE:SOMETHING]"):].strip()
        return "SOMETHING", clean if clean else None
    return "SOMETHING", raw if raw else None


class StudentService:
    """Service handling student module operations and analytics."""

    @staticmethod
    async def get_student_dashboard(
        session: AsyncSession,
        user_id: UUID,
        department_id: Optional[UUID],
        override_now: Optional[datetime] = None,
    ) -> StudentDashboardResponse:
        """
        Retrieves real-time dashboard data for an authenticated student.
        Injects 'app.current_student_profile_id' for strict PostgreSQL RLS enforcement.
        """
        if not department_id:
            raise PermissionDeniedError(
                message="Student user has no assigned department context.",
                code="NO_DEPARTMENT_ASSIGNED",
            )

        # 1. Resolve student profile from user_id under current department
        profile_stmt = text("""
            SELECT sp.id as student_profile_id, sp.roll_number, sp.enrollment_number,
                   sp.academic_status, sp.section_id,
                   s.name as section_name,
                   d.name as department_name,
                   i.timezone as institution_timezone,
                   u.full_name, u.email
            FROM student_profiles sp
            JOIN users u ON u.id = sp.user_id
            JOIN sections s ON s.id = sp.section_id
            JOIN departments d ON d.id = sp.department_id
            JOIN institutions i ON i.id = u.institution_id
            WHERE sp.user_id = :user_id AND sp.department_id = :dept_id
        """)
        profile_res = await session.execute(profile_stmt, {"user_id": str(user_id), "dept_id": str(department_id)})
        profile_row = profile_res.mappings().first()

        if not profile_row:
            raise NotFoundError(
                message="Student profile record not found for the authenticated user.",
                code="STUDENT_PROFILE_NOT_FOUND",
            )

        student_profile_id = profile_row["student_profile_id"]
        section_id = profile_row["section_id"]

        # 2. Inject app.current_student_profile_id into the PostgreSQL transaction for RLS
        await session.execute(
            text("SELECT set_config('app.current_student_profile_id', :stu_id, true)"),
            {"stu_id": str(student_profile_id)},
        )

        student_summary = StudentProfileSummary(
            id=student_profile_id,
            full_name=profile_row["full_name"],
            email=profile_row["email"],
            roll_number=profile_row["roll_number"],
            enrollment_number=profile_row["enrollment_number"],
            section_name=profile_row["section_name"],
            department_name=profile_row["department_name"],
            academic_status=profile_row["academic_status"],
        )

        # 3. Overall Attendance Calculation
        overall_stmt = text("""
            SELECT count(*) as total,
                   count(*) FILTER (WHERE ar.status IN ('PRESENT', 'LATE')) as attended,
                   count(*) FILTER (WHERE ar.status = 'PRESENT') as present,
                   count(*) FILTER (WHERE ar.status = 'LATE') as late,
                   count(*) FILTER (WHERE ar.status = 'ABSENT') as absent
            FROM attendance_records ar
            WHERE ar.student_id = :stu_id
        """)
        overall_res = await session.execute(overall_stmt, {"stu_id": str(student_profile_id)})
        overall_row = overall_res.mappings().first() or {}

        total_sessions = int(overall_row.get("total") or 0)
        attended_sessions = int(overall_row.get("attended") or 0)
        present_count = int(overall_row.get("present") or 0)
        late_count = int(overall_row.get("late") or 0)
        absent_count = int(overall_row.get("absent") or 0)

        percentage = round((attended_sessions / total_sessions) * 100.0, 1) if total_sessions > 0 else 0.0
        is_low = (percentage < 75.0) and (total_sessions > 0)

        overall_attendance = OverallAttendance(
            total_sessions=total_sessions,
            attended_sessions=attended_sessions,
            present_count=present_count,
            late_count=late_count,
            absent_count=absent_count,
            percentage=percentage,
            is_low_attendance=is_low,
        )

        # 4. Subject-Wise Attendance Breakdown
        subject_stmt = text("""
            SELECT sub.id as subject_id, sub.code, sub.name,
                   count(ar.id) as total_sessions,
                   count(ar.id) FILTER (WHERE ar.status IN ('PRESENT', 'LATE')) as attended_sessions
            FROM subjects sub
            LEFT JOIN timetable_slots ts ON ts.subject_id = sub.id AND ts.section_id = :sec_id
            LEFT JOIN class_sessions cs ON cs.timetable_slot_id = ts.id
            LEFT JOIN attendance_sessions att_s ON att_s.class_session_id = cs.id
            LEFT JOIN attendance_records ar ON ar.attendance_session_id = att_s.id AND ar.student_id = :stu_id
            WHERE sub.department_id = :dept_id
            GROUP BY sub.id, sub.code, sub.name
            ORDER BY sub.code ASC
        """)
        subject_res = await session.execute(
            subject_stmt,
            {
                "sec_id": str(section_id),
                "stu_id": str(student_profile_id),
                "dept_id": str(department_id),
            },
        )
        subject_rows = subject_res.mappings().all()

        subject_attendance: List[SubjectAttendanceSummary] = []
        for r in subject_rows:
            sub_total = int(r["total_sessions"] or 0)
            sub_attended = int(r["attended_sessions"] or 0)
            sub_pct = round((sub_attended / sub_total) * 100.0, 1) if sub_total > 0 else 0.0
            subject_attendance.append(
                SubjectAttendanceSummary(
                    subject_id=r["subject_id"],
                    code=r["code"],
                    name=r["name"],
                    total_sessions=sub_total,
                    attended_sessions=sub_attended,
                    percentage=sub_pct,
                    is_low_attendance=(sub_pct < 75.0) and (sub_total > 0),
                )
            )

        # 5. Today's Timetable Schedule & Current Class Session
        campus_tz = resolve_campus_timezone(profile_row.get("institution_timezone"))
        if override_now:
            now_campus = override_now if override_now.tzinfo else override_now.replace(tzinfo=campus_tz)
        else:
            now_campus = datetime.now(campus_tz)

        weekday_map = {
            0: "MONDAY",
            1: "TUESDAY",
            2: "WEDNESDAY",
            3: "THURSDAY",
            4: "FRIDAY",
            5: "SATURDAY",
            6: "SUNDAY",
        }
        current_day_str = weekday_map[now_campus.weekday()]
        current_minutes_today = now_campus.hour * 60 + now_campus.minute
        campus_date = now_campus.date()

        # Fetch timetable slots for this section and day
        timetable_stmt = text("""
            SELECT ts.id as slot_id, lower(ts.slot_minutes) as start_min, upper(ts.slot_minutes) as end_min,
                   sub.code as subject_code, sub.name as subject_name,
                   cr.room_number, cr.building,
                   u_fac.full_name as faculty_name,
                   cs.id as class_session_id, cs.status as session_status
            FROM timetable_slots ts
            JOIN subjects sub ON sub.id = ts.subject_id
            JOIN classrooms cr ON cr.id = ts.room_id
            JOIN faculty_profiles fp ON fp.id = ts.faculty_id
            JOIN users u_fac ON u_fac.id = fp.user_id
            LEFT JOIN class_sessions cs ON cs.timetable_slot_id = ts.id AND cs.session_date = :campus_date
            WHERE ts.section_id = :sec_id AND ts.day_of_week = :day_name
            ORDER BY ts.slot_minutes ASC
        """)
        tt_res = await session.execute(
            timetable_stmt,
            {
                "sec_id": str(section_id),
                "day_name": current_day_str,
                "campus_date": campus_date,
            },
        )
        tt_rows = tt_res.mappings().all()

        today_schedule: List[TimetableAgendaItem] = []
        current_class: Optional[CurrentClassSession] = None
        current_slot_candidate: Optional[Dict[str, Any]] = None

        for slot in tt_rows:
            start_m = int(slot["start_min"])
            end_m = int(slot["end_min"])
            start_str = minutes_to_time_str(start_m)
            end_str = minutes_to_time_str(end_m)

            # Determine slot progression status
            if current_minutes_today < start_m:
                status_str = "Scheduled"
                is_curr = False
            elif start_m <= current_minutes_today < end_m:
                status_str = "Active"
                is_curr = True
                current_slot_candidate = slot
            else:
                status_str = "Completed"
                is_curr = False

            today_schedule.append(
                TimetableAgendaItem(
                    slot_id=slot["slot_id"],
                    time_display=f"{start_str} – {end_str}",
                    start_time=start_str,
                    end_time=end_str,
                    subject_code=slot["subject_code"],
                    subject_name=slot["subject_name"],
                    room=f"{slot['room_number']} ({slot['building']})",
                    faculty_name=slot["faculty_name"],
                    status=status_str,
                    is_current=is_curr,
                )
            )

        # If no active slot found by current time, select next upcoming slot or first slot as focus
        if not current_slot_candidate and tt_rows:
            for slot in tt_rows:
                if int(slot["start_min"]) > current_minutes_today:
                    current_slot_candidate = slot
                    break
            if not current_slot_candidate:
                current_slot_candidate = tt_rows[0]

        if current_slot_candidate:
            start_m = int(current_slot_candidate["start_min"])
            end_m = int(current_slot_candidate["end_min"])
            duration_mins = end_m - start_m

            # Check if attendance taken for this session
            att_taken = False
            class_sess_id = current_slot_candidate.get("class_session_id")
            if class_sess_id:
                check_stmt = text("""
                    SELECT 1 FROM attendance_records ar
                    JOIN attendance_sessions att_s ON att_s.id = ar.attendance_session_id
                    WHERE att_s.class_session_id = :cs_id AND ar.student_id = :stu_id
                """)
                chk_res = await session.execute(
                    check_stmt,
                    {"cs_id": str(class_sess_id), "stu_id": str(student_profile_id)},
                )
                att_taken = chk_res.scalar_one_or_none() is not None

            current_class = CurrentClassSession(
                subject_code=current_slot_candidate["subject_code"],
                subject_name=current_slot_candidate["subject_name"],
                timing=f"{minutes_to_time_str(start_m)} – {minutes_to_time_str(end_m)}",
                duration=f"{duration_mins} Minutes",
                room=f"{current_slot_candidate['room_number']} ({current_slot_candidate['building']})",
                faculty_name=current_slot_candidate["faculty_name"],
                attendance_taken=att_taken,
                status=current_slot_candidate.get("session_status") or "SCHEDULED",
                topic=f"Curricular Module · {current_slot_candidate['subject_name']}",
            )

        # 6. Weekly Observable Activity Telemetry (Phone & Talking Events)
        activity_stmt = text("""
            SELECT event_code,
                   count(*) FILTER (WHERE event_timestamp >= CURRENT_DATE - INTERVAL '7 days') as this_week,
                   count(*) FILTER (WHERE event_timestamp >= CURRENT_DATE - INTERVAL '14 days'
                                      AND event_timestamp < CURRENT_DATE - INTERVAL '7 days') as last_week
            FROM activity_events
            WHERE department_id = :dept_id
              AND event_code IN ('PHONE', 'TALKING')
            GROUP BY event_code
        """)
        act_metric_res = await session.execute(activity_stmt, {"dept_id": str(department_id)})
        metric_rows = {row["event_code"]: row for row in act_metric_res.mappings().all()}

        def format_metric(code: str) -> WeeklyActivityEventMetric:
            row = metric_rows.get(code) or {}
            tw = int(row.get("this_week") or 0)
            lw = int(row.get("last_week") or 0)
            if tw < lw:
                trend = "DECREASED"
            elif tw > lw:
                trend = "INCREASED"
            else:
                trend = "STABLE"
            return WeeklyActivityEventMetric(this_week=tw, last_week=lw, trend=trend)

        weekly_activity = WeeklyActivitySummary(
            phone=format_metric("PHONE"),
            talking=format_metric("TALKING"),
        )

        # 7. Recent Attendance Activity Feed
        recent_stmt = text("""
            SELECT ar.id as record_id, ar.status,
                   cs.session_date,
                   COALESCE(sub.code, 'GEN') as subject_code,
                   COALESCE(sub.name, 'General Session') as subject_name,
                   cr.room_number,
                   u_fac.full_name as faculty_name
            FROM attendance_records ar
            JOIN attendance_sessions att_s ON att_s.id = ar.attendance_session_id
            JOIN class_sessions cs ON cs.id = att_s.class_session_id
            LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
            LEFT JOIN subjects sub ON sub.id = ts.subject_id
            JOIN classrooms cr ON cr.id = cs.actual_room_id
            JOIN faculty_profiles fp ON fp.id = cs.actual_faculty_id
            JOIN users u_fac ON u_fac.id = fp.user_id
            WHERE ar.student_id = :stu_id
            ORDER BY cs.session_date DESC, cs.started_at DESC NULLS LAST
            LIMIT 5
        """)
        recent_res = await session.execute(recent_stmt, {"stu_id": str(student_profile_id)})
        recent_rows = recent_res.mappings().all()

        recent_activity: List[RecentAttendanceItem] = [
            RecentAttendanceItem(
                record_id=r["record_id"],
                subject_code=r["subject_code"],
                subject_name=r["subject_name"],
                session_date=r["session_date"].strftime("%Y-%m-%d") if r["session_date"] else "",
                status=r["status"],
                room=r["room_number"],
                faculty_name=r["faculty_name"],
            )
            for r in recent_rows
        ]

        return StudentDashboardResponse(
            student=student_summary,
            current_class=current_class,
            overall_attendance=overall_attendance,
            subject_attendance=subject_attendance,
            weekly_activity=weekly_activity,
            today_schedule=today_schedule,
            recent_activity=recent_activity,
        )

    @staticmethod
    async def get_class_companion(
        session: AsyncSession,
        user_id: UUID,
        department_id: Optional[UUID],
        override_now: Optional[datetime] = None,
    ) -> StudentClassCompanionResponse:
        """
        Retrieves real-time class companion state for an authenticated student.
        Identifies whether a class is ONGOING, UPCOMING, or NO_CURRENT_CLASS for today.
        Resolves subject, faculty, room, and student attendance status under PostgreSQL RLS.
        """
        if not department_id:
            raise PermissionDeniedError(
                message="Student user has no assigned department context.",
                code="NO_DEPARTMENT_ASSIGNED",
            )

        # 1. Resolve student profile and section
        profile_stmt = text("""
            SELECT sp.id as student_profile_id, sp.section_id,
                   s.name as section_name,
                   d.name as department_name,
                   i.timezone as institution_timezone
            FROM student_profiles sp
            JOIN users u ON u.id = sp.user_id
            JOIN sections s ON s.id = sp.section_id
            JOIN departments d ON d.id = sp.department_id
            JOIN institutions i ON i.id = u.institution_id
            WHERE sp.user_id = :user_id AND sp.department_id = :dept_id
        """)
        profile_res = await session.execute(
            profile_stmt,
            {"user_id": str(user_id), "dept_id": str(department_id)},
        )
        profile_row = profile_res.mappings().first()

        if not profile_row:
            raise NotFoundError(
                message="Student profile record not found for the authenticated user.",
                code="STUDENT_PROFILE_NOT_FOUND",
            )

        student_profile_id = profile_row["student_profile_id"]
        section_id = profile_row["section_id"]
        section_name = profile_row["section_name"]
        department_name = profile_row["department_name"]
        institution_tz = profile_row.get("institution_timezone")

        # 2. Inject app.current_student_profile_id for PostgreSQL RLS
        await session.execute(
            text("SELECT set_config('app.current_student_profile_id', :stu_id, true)"),
            {"stu_id": str(student_profile_id)},
        )

        # 3. Resolve localized institutional date and time
        tz = resolve_campus_timezone(institution_tz)

        if override_now:
            now_local = override_now if override_now.tzinfo else override_now.replace(tzinfo=tz)
        else:
            now_local = datetime.now(tz)

        weekday_map = {
            0: "MONDAY",
            1: "TUESDAY",
            2: "WEDNESDAY",
            3: "THURSDAY",
            4: "FRIDAY",
            5: "SATURDAY",
            6: "SUNDAY",
        }
        current_day_str = weekday_map[now_local.weekday()]
        current_minutes_today = now_local.hour * 60 + now_local.minute
        current_time_display = minutes_to_time_str(current_minutes_today)

        # 4. Fetch published timetable slots for today
        tt_stmt = text("""
            SELECT ts.id as slot_id, lower(ts.slot_minutes) as start_min, upper(ts.slot_minutes) as end_min,
                   sub.code as subject_code, sub.name as subject_name,
                   COALESCE(cr.room_number, 'Unassigned') as room_number,
                   COALESCE(cr.building, 'Main Academic Block') as building,
                   COALESCE(u_fac.full_name, 'Faculty Unassigned') as faculty_name,
                   cs.id as class_session_id
            FROM timetable_slots ts
            JOIN timetable_versions tv ON tv.id = ts.timetable_version_id
            JOIN subjects sub ON sub.id = ts.subject_id
            LEFT JOIN classrooms cr ON cr.id = ts.room_id
            LEFT JOIN faculty_profiles fp ON fp.id = ts.faculty_id
            LEFT JOIN users u_fac ON u_fac.id = fp.user_id
            LEFT JOIN class_sessions cs ON cs.timetable_slot_id = ts.id AND cs.session_date = :today_date
            WHERE ts.section_id = :sec_id
              AND ts.day_of_week = :day_name
              AND tv.approval_status = 'PUBLISHED'
            ORDER BY ts.slot_minutes ASC
        """)
        tt_res = await session.execute(
            tt_stmt,
            {
                "sec_id": str(section_id),
                "day_name": current_day_str,
                "today_date": now_local.date(),
            },
        )
        tt_rows = tt_res.mappings().all()

        # 5. Class state determination
        # ONGOING: start_min <= current_minutes_today < end_min
        # UPCOMING: first slot where start_min > current_minutes_today
        # NO_CURRENT_CLASS: all slots finished or no slots today
        selected_slot: Optional[Dict[str, Any]] = None
        class_state = "NO_CURRENT_CLASS"

        for slot in tt_rows:
            start_m = int(slot["start_min"])
            end_m = int(slot["end_min"])
            if start_m <= current_minutes_today < end_m:
                class_state = "ONGOING"
                selected_slot = slot
                break

        if not selected_slot:
            for slot in tt_rows:
                start_m = int(slot["start_min"])
                if start_m > current_minutes_today:
                    class_state = "UPCOMING"
                    selected_slot = slot
                    break

        class_details: Optional[CompanionClassDetails] = None
        if selected_slot:
            start_m = int(selected_slot["start_min"])
            end_m = int(selected_slot["end_min"])
            duration_mins = end_m - start_m

            # Check attendance status for student
            attendance_taken = False
            my_attendance_status: Optional[str] = None
            class_sess_id = selected_slot["class_session_id"]

            if class_sess_id:
                att_stmt = text("""
                    SELECT ar.status
                    FROM attendance_records ar
                    JOIN attendance_sessions att_s ON att_s.id = ar.attendance_session_id
                    WHERE att_s.class_session_id = :cs_id AND ar.student_id = :stu_id
                """)
                att_res = await session.execute(
                    att_stmt,
                    {"cs_id": str(class_sess_id), "stu_id": str(student_profile_id)},
                )
                att_row = att_res.mappings().first()
                if att_row:
                    attendance_taken = True
                    my_attendance_status = att_row["status"]

            class_details = CompanionClassDetails(
                slot_id=selected_slot["slot_id"],
                class_session_id=class_sess_id,
                subject_code=selected_slot["subject_code"],
                subject_name=selected_slot["subject_name"],
                faculty_name=selected_slot["faculty_name"],
                room_number=selected_slot["room_number"],
                building=selected_slot["building"],
                timing=f"{minutes_to_time_str(start_m)} – {minutes_to_time_str(end_m)}",
                start_time=minutes_to_time_str(start_m),
                end_time=minutes_to_time_str(end_m),
                duration=f"{duration_mins} Minutes",
                session_date=now_local.strftime("%A, %d %B %Y"),
                topic=f"Curricular Module · {selected_slot['subject_name']}",
                attendance_taken=attendance_taken,
                my_attendance_status=my_attendance_status,
            )

        return StudentClassCompanionResponse(
            class_state=class_state,
            current_time_display=current_time_display,
            class_details=class_details,
            section_name=section_name,
            department_name=department_name,
            institution_timezone=institution_tz,
        )

    @staticmethod
    async def get_subject_wise_attendance(
        session: AsyncSession,
        user_id: UUID,
        department_id: Optional[UUID],
    ) -> List[StudentSubjectAttendanceResponse]:
        """
        Retrieves section-specific subject attendance analytics for an authenticated student.
        Enforces transaction-local RLS and distinguishes attended, absent, and pending sessions.
        """
        if not department_id:
            raise PermissionDeniedError(
                message="Student user has no assigned department context.",
                code="NO_DEPARTMENT_ASSIGNED",
            )

        # 1. Resolve student profile and section mapping
        profile_stmt = text("""
            SELECT sp.id as student_profile_id, sp.section_id
            FROM student_profiles sp
            WHERE sp.user_id = :user_id AND sp.department_id = :dept_id
        """)
        profile_res = await session.execute(
            profile_stmt,
            {"user_id": str(user_id), "dept_id": str(department_id)},
        )
        profile_row = profile_res.mappings().first()

        if not profile_row:
            raise NotFoundError(
                message="Student profile record not found for the authenticated user.",
                code="STUDENT_PROFILE_NOT_FOUND",
            )

        student_profile_id = profile_row["student_profile_id"]
        section_id = profile_row["section_id"]

        # 2. Inject app.current_student_profile_id for PostgreSQL RLS
        await session.execute(
            text("SELECT set_config('app.current_student_profile_id', :stu_id, true)"),
            {"stu_id": str(student_profile_id)},
        )

        # 3. Subject-wise aggregation query
        # Preserves section assignment via published timetable, allocations, or conducted sessions.
        # Excludes SCHEDULED and CANCELLED sessions.
        # Counts IN_PROGRESS, unfinalized attendance, unverified records, and missing records as pending.
        query_stmt = text("""
            WITH assigned_subjects AS (
                SELECT DISTINCT ts.subject_id
                FROM timetable_slots ts
                JOIN timetable_versions tv ON tv.id = ts.timetable_version_id
                WHERE ts.section_id = :sec_id
                  AND tv.approval_status = 'PUBLISHED'
                
                UNION
                
                SELECT DISTINCT fsa.subject_id
                FROM faculty_subject_allocations fsa
                WHERE fsa.section_id = :sec_id

                UNION

                SELECT DISTINCT ts2.subject_id
                FROM class_sessions cs2
                JOIN timetable_slots ts2 ON ts2.id = cs2.timetable_slot_id
                WHERE ts2.section_id = :sec_id
            )
            SELECT 
                sub.id AS subject_id,
                sub.code AS subject_code,
                sub.name AS subject_name,
                
                -- 1. Total finalized conducted sessions
                COUNT(DISTINCT cs.id) FILTER (
                    WHERE cs.status = 'COMPLETED' 
                      AND att_s.is_finalized = TRUE
                ) AS total_sessions,
                
                -- 2. Attended sessions (PRESENT or LATE) in finalized sessions
                COUNT(DISTINCT cs.id) FILTER (
                    WHERE cs.status = 'COMPLETED' 
                      AND att_s.is_finalized = TRUE 
                      AND ar.status IN ('PRESENT', 'LATE')
                ) AS attended_sessions,
                
                -- 3. Explicitly marked ABSENT in finalized sessions
                COUNT(DISTINCT cs.id) FILTER (
                    WHERE cs.status = 'COMPLETED' 
                      AND att_s.is_finalized = TRUE 
                      AND ar.status = 'ABSENT'
                ) AS absent_sessions,
                
                -- 4. Pending sessions:
                --    Case A: Class underway (IN_PROGRESS)
                --    Case B: Completed class with missing or unfinalized attendance session
                --    Case C: Completed & finalized class with UNVERIFIED record or missing student record
                COUNT(DISTINCT cs.id) FILTER (
                    WHERE (cs.status = 'IN_PROGRESS')
                       OR (cs.status = 'COMPLETED' AND (att_s.id IS NULL OR att_s.is_finalized = FALSE))
                       OR (cs.status = 'COMPLETED' AND att_s.is_finalized = TRUE AND (ar.status = 'UNVERIFIED' OR ar.id IS NULL))
                ) AS pending_sessions

            FROM assigned_subjects asub
            JOIN subjects sub ON sub.id = asub.subject_id
            LEFT JOIN timetable_slots ts 
                ON ts.subject_id = sub.id 
               AND ts.section_id = :sec_id
            LEFT JOIN class_sessions cs 
                ON cs.timetable_slot_id = ts.id 
               AND cs.status != 'CANCELLED'
            LEFT JOIN attendance_sessions att_s 
                ON att_s.class_session_id = cs.id
            LEFT JOIN attendance_records ar 
                ON ar.attendance_session_id = att_s.id 
               AND ar.student_id = :stu_id
            WHERE sub.department_id = :dept_id
            GROUP BY sub.id, sub.code, sub.name
            ORDER BY sub.code ASC;
        """)

        res = await session.execute(
            query_stmt,
            {
                "sec_id": str(section_id),
                "stu_id": str(student_profile_id),
                "dept_id": str(department_id),
            },
        )
        rows = res.mappings().all()

        results: List[StudentSubjectAttendanceResponse] = []
        for r in rows:
            tot = int(r["total_sessions"] or 0)
            att = int(r["attended_sessions"] or 0)
            ab = int(r["absent_sessions"] or 0)
            pen = int(r["pending_sessions"] or 0)
            pct = round((att / tot) * 100.0, 1) if tot > 0 else 0.0
            is_low = (pct < 75.0) and (tot > 0)

            results.append(
                StudentSubjectAttendanceResponse(
                    subject_id=r["subject_id"],
                    subject_code=r["subject_code"],
                    subject_name=r["subject_name"],
                    total_sessions=tot,
                    attended_sessions=att,
                    absent_sessions=ab,
                    pending_sessions=pen,
                    attendance_percentage=pct,
                    is_low_attendance=is_low,
                )
            )

        return results

    @staticmethod
    async def create_sos_incident(
        session: AsyncSession,
        user_id: UUID,
        department_id: Optional[UUID],
        request_data: StudentSOSCreateRequest,
        institution_id: Optional[UUID] = None,
    ) -> StudentSOSIncidentResponse:
        """
        Records an emergency SOS incident reported by an authenticated student.
        Atomically creates the SOSIncident and initial SOSEscalationHistory audit row.
        Derives identity strictly from server-side authenticated context and validates room references.
        """
        # 1. Resolve institution_id and department_id
        if not institution_id or not department_id:
            u_stmt = text("SELECT institution_id, department_id FROM users WHERE id = :uid")
            u_res = await session.execute(u_stmt, {"uid": str(user_id)})
            u_row = u_res.mappings().first()
            if not u_row:
                raise NotFoundError("Authenticated user record not found", code="USER_NOT_FOUND")
            if not institution_id:
                institution_id = u_row["institution_id"]
            if not department_id:
                department_id = u_row["department_id"]

        if not department_id:
            sp_stmt = text("SELECT department_id FROM student_profiles WHERE user_id = :uid")
            sp_res = await session.execute(sp_stmt, {"uid": str(user_id)})
            sp_row = sp_res.mappings().first()
            if sp_row and sp_row["department_id"]:
                department_id = sp_row["department_id"]

        if not department_id:
            raise PermissionDeniedError(
                message="Student user has no assigned department context.",
                code="NO_DEPARTMENT_ASSIGNED",
            )

        # 2. Set tenant context transaction-locally
        await session.execute(
            text("SELECT set_config('app.current_tenant_id', :inst_id, true)"),
            {"inst_id": str(institution_id)},
        )

        # 3. Validate room_id if provided
        if request_data.room_id is not None:
            room_stmt = text("""
                SELECT c.id
                FROM classrooms c
                JOIN departments d ON d.id = c.department_id
                WHERE c.id = :room_id AND c.department_id = :dept_id AND d.institution_id = :inst_id
            """)
            room_res = await session.execute(
                room_stmt,
                {
                    "room_id": str(request_data.room_id),
                    "dept_id": str(department_id),
                    "inst_id": str(institution_id),
                },
            )
            if not room_res.first():
                raise AppException(
                    message="Referenced room does not belong to authorized department",
                    code="INVALID_ROOM_REFERENCE",
                    status_code=400,
                )

        # 4. Compute severity and metadata tag
        severity = "CRITICAL" if request_data.incident_type == SOSIncidentType.FELL else "HIGH"
        tag = f"[TYPE:{request_data.incident_type.value}]"
        stored_notes = f"{tag} {request_data.notes.strip()}" if request_data.notes and request_data.notes.strip() else tag

        # 5. Generate unique human-readable incident code
        year = datetime.now(timezone.utc).year
        incident_code = f"SOS-{year}-{uuid.uuid4().hex[:8].upper()}"
        incident_id = uuid.uuid4()

        # 6. Insert into sos_incidents
        insert_incident_stmt = text("""
            INSERT INTO sos_incidents (
                id, institution_id, department_id, room_id,
                reported_by_user_id, incident_code, severity, status,
                location_description, notes
            ) VALUES (
                :id, :institution_id, :department_id, :room_id,
                :reported_by_user_id, :incident_code, :severity, 'REPORTED',
                :location_description, :notes
            )
            RETURNING id, incident_code, severity, status, room_id,
                      location_description, notes, created_at;
        """)
        inc_res = await session.execute(
            insert_incident_stmt,
            {
                "id": str(incident_id),
                "institution_id": str(institution_id),
                "department_id": str(department_id),
                "room_id": str(request_data.room_id) if request_data.room_id else None,
                "reported_by_user_id": str(user_id),
                "incident_code": incident_code,
                "severity": severity,
                "location_description": request_data.location_description,
                "notes": stored_notes,
            },
        )
        row = inc_res.mappings().first()

        # 7. Insert initial escalation audit entry into sos_escalation_history atomically
        escalation_stmt = text("""
            INSERT INTO sos_escalation_history (
                id, sos_incident_id, actor_user_id, stage, action_taken
            ) VALUES (
                :id, :sos_incident_id, :actor_user_id, :stage, :action_taken
            );
        """)
        await session.execute(
            escalation_stmt,
            {
                "id": str(uuid.uuid4()),
                "sos_incident_id": str(incident_id),
                "actor_user_id": str(user_id),
                "stage": "INITIAL_REPORT",
                "action_taken": f"Emergency SOS incident {incident_code} reported by student.",
            },
        )

        # 8. Atomically insert in-app notification within the same transaction
        notif_id = uuid.uuid4()
        now_utc = datetime.now(timezone.utc)
        notif_stmt = text("""
            INSERT INTO notifications (
                id, recipient_user_id, role_target, category, title, message, is_read, created_at
            ) VALUES (
                :id, :user_id, 'STUDENT', 'INCIDENT',
                'Emergency SOS Reported',
                :msg, false, :now
            );
        """)
        await session.execute(
            notif_stmt,
            {
                "id": str(notif_id),
                "user_id": str(user_id),
                "msg": f"Emergency SOS incident {incident_code} ({severity}) has been logged for {request_data.location_description}. Campus safety desk notified.",
                "now": now_utc,
            },
        )

        inc_type, clean_notes = _parse_incident_type_and_notes(row["notes"])

        return StudentSOSIncidentResponse(
            id=row["id"],
            incident_code=row["incident_code"],
            incident_type=inc_type,
            severity=row["severity"],
            status=row["status"],
            room_id=row["room_id"],
            location_description=row["location_description"],
            notes=clean_notes,
            reported_at=row["created_at"],
        )

    @staticmethod
    async def get_active_sos_incidents(
        session: AsyncSession,
        user_id: UUID,
        department_id: Optional[UUID],
        limit: int = 20,
    ) -> List[StudentSOSIncidentResponse]:
        """
        Retrieves the authenticated student's own active/recent SOS incidents.
        Enforces strict student ownership (reported_by_user_id = user_id) alongside RLS tenant isolation.
        """
        query_stmt = text("""
            SELECT id, incident_code, severity, status, room_id,
                   location_description, notes, created_at
            FROM sos_incidents
            WHERE reported_by_user_id = :user_id
            ORDER BY created_at DESC
            LIMIT :limit;
        """)
        res = await session.execute(
            query_stmt,
            {
                "user_id": str(user_id),
                "limit": limit,
            },
        )
        rows = res.mappings().all()

        results: List[StudentSOSIncidentResponse] = []
        for r in rows:
            inc_type, clean_notes = _parse_incident_type_and_notes(r["notes"])
            results.append(
                StudentSOSIncidentResponse(
                    id=r["id"],
                    incident_code=r["incident_code"],
                    incident_type=inc_type,
                    severity=r["severity"],
                    status=r["status"],
                    room_id=r["room_id"],
                    location_description=r["location_description"],
                    notes=clean_notes,
                    reported_at=r["created_at"],
                )
            )
        return results

    async def get_attendance_history(
        self,
        session: AsyncSession,
        user_id: UUID,
        department_id: UUID,
        subject_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> StudentAttendanceHistoryResponse:
        """
        Retrieves paginated, filterable historical attendance records for the authenticated student.
        Enforces strict tenant isolation, student ownership, and PostgreSQL Row-Level Security.
        """
        # 1. Parameter validations
        if start_date and end_date and start_date > end_date:
            raise AppException(
                message="start_date cannot be after end_date.",
                code="INVALID_DATE_RANGE",
                status_code=400,
            )

        status_filter = None
        if status is not None:
            clean_status = status.strip().upper()
            if clean_status not in ("PRESENT", "LATE", "ABSENT", "UNVERIFIED"):
                raise AppException(
                    message=f"Invalid status filter '{status}'. Must be one of PRESENT, LATE, ABSENT, UNVERIFIED.",
                    code="INVALID_STATUS_FILTER",
                    status_code=400,
                )
            status_filter = clean_status

        if page < 1:
            raise AppException(
                message="Page must be greater than or equal to 1.",
                code="INVALID_PAGINATION",
                status_code=400,
            )

        if limit < 1 or limit > 100:
            raise AppException(
                message="Limit must be between 1 and 100.",
                code="INVALID_PAGINATION",
                status_code=400,
            )

        # 2. Resolve student profile
        from app.models.cohorts import StudentProfile

        profile_stmt = select(StudentProfile).where(StudentProfile.user_id == user_id)
        res = await session.execute(profile_stmt)
        profile = res.scalars().first()
        if not profile:
            raise NotFoundError(
                message="Student profile not found for authenticated user",
                code="PROFILE_NOT_FOUND",
            )

        # 3. Inject app.current_student_profile_id for PostgreSQL RLS
        await session.execute(
            text("SELECT set_config('app.current_student_profile_id', :stu_id, true)"),
            {"stu_id": str(profile.id)},
        )

        # 4. Build dynamic query clauses
        where_clauses = [
            "ar.student_id = :stu_id",
            "att_s.department_id = :dept_id",
            "cs.status != 'CANCELLED'",
        ]
        params: Dict[str, Any] = {
            "stu_id": str(profile.id),
            "dept_id": str(department_id),
        }

        if subject_id:
            where_clauses.append("ts.subject_id = :subject_id")
            params["subject_id"] = str(subject_id)

        if start_date:
            where_clauses.append("cs.session_date >= :start_date")
            params["start_date"] = start_date

        if end_date:
            where_clauses.append("cs.session_date <= :end_date")
            params["end_date"] = end_date

        if status_filter:
            where_clauses.append("ar.status = :status_filter")
            params["status_filter"] = status_filter

        where_sql = " AND ".join(where_clauses)

        # 5. Count matching records
        count_query = text(f"""
            SELECT COUNT(ar.id) as total_count
            FROM attendance_records ar
            JOIN attendance_sessions att_s ON att_s.id = ar.attendance_session_id
            JOIN class_sessions cs ON cs.id = att_s.class_session_id
            LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
            LEFT JOIN subjects sub ON sub.id = ts.subject_id
            WHERE {where_sql}
        """)
        count_res = await session.execute(count_query, params)
        total_records = int(count_res.scalar_one_or_none() or 0)

        records: List[StudentAttendanceHistoryItem] = []
        if total_records > 0:
            offset = (page - 1) * limit
            data_params = {**params, "limit": limit, "offset": offset}

            data_query = text(f"""
                SELECT 
                    ar.id AS record_id,
                    cs.id AS session_id,
                    cs.session_date AS session_date,
                    sub.id AS subject_id,
                    sub.code AS subject_code,
                    sub.name AS subject_name,
                    fac_u.full_name AS faculty_name,
                    room.room_number AS room_number,
                    lower(ts.slot_minutes) AS start_min,
                    upper(ts.slot_minutes) AS end_min,
                    cs.started_at AS started_at,
                    cs.ended_at AS ended_at,
                    ar.status AS status,
                    ar.confidence_score AS confidence_score,
                    ar.manual_override AS manual_override,
                    att_s.is_finalized AS is_finalized,
                    disp.id AS dispute_id,
                    disp.status AS dispute_status
                FROM attendance_records ar
                JOIN attendance_sessions att_s ON att_s.id = ar.attendance_session_id
                JOIN class_sessions cs ON cs.id = att_s.class_session_id
                LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
                LEFT JOIN subjects sub ON sub.id = ts.subject_id
                LEFT JOIN faculty_profiles fac_p ON fac_p.id = cs.actual_faculty_id
                LEFT JOIN users fac_u ON fac_u.id = fac_p.user_id
                LEFT JOIN classrooms room ON room.id = cs.actual_room_id
                LEFT JOIN attendance_disputes disp ON disp.attendance_record_id = ar.id
                WHERE {where_sql}
                ORDER BY cs.session_date DESC, cs.id DESC, ar.id ASC
                LIMIT :limit OFFSET :offset
            """)

            data_res = await session.execute(data_query, data_params)
            rows = data_res.mappings().all()

            for r in rows:
                start_min = r["start_min"]
                end_min = r["end_min"]
                if start_min is not None and end_min is not None:
                    start_time_str = minutes_to_time_str(start_min)
                    end_time_str = minutes_to_time_str(end_min)
                elif r["started_at"] is not None:
                    start_time_str = r["started_at"].strftime("%I:%M %p")
                    end_time_str = r["ended_at"].strftime("%I:%M %p") if r["ended_at"] else None
                else:
                    start_time_str = None
                    end_time_str = None

                rec_status = r["status"]
                disp_id = r["dispute_id"]
                can_dispute = (
                    disp_id is None
                    and rec_status in ("ABSENT", "LATE", "UNVERIFIED")
                    and (r["is_finalized"] is True or r["is_finalized"] is None)
                )

                records.append(
                    StudentAttendanceHistoryItem(
                        record_id=r["record_id"],
                        session_id=r["session_id"],
                        session_date=r["session_date"].isoformat() if hasattr(r["session_date"], "isoformat") else str(r["session_date"]),
                        subject_id=r["subject_id"],
                        subject_code=r["subject_code"],
                        subject_name=r["subject_name"],
                        faculty_name=r["faculty_name"],
                        room_number=r["room_number"],
                        start_time=start_time_str,
                        end_time=end_time_str,
                        status=rec_status,
                        confidence_score=float(r["confidence_score"]) if r["confidence_score"] is not None else None,
                        manual_override=bool(r["manual_override"]),
                        can_dispute=can_dispute,
                        dispute_id=disp_id,
                        dispute_status=r["dispute_status"],
                    )
                )

        return StudentAttendanceHistoryResponse(
            total_records=total_records,
            page=page,
            limit=limit,
            records=records,
        )

    @staticmethod
    async def create_dispute(
        session: AsyncSession,
        user_id: UUID,
        department_id: Optional[UUID],
        request_data: StudentDisputeCreateRequest,
    ) -> StudentDisputeResponse:
        """
        Creates an attendance dispute for an eligible attendance record.
        Enforces tenant isolation, student ownership, record eligibility,
        and single-active-dispute constraints.
        """
        import json

        if not department_id:
            raise PermissionDeniedError(
                message="Student user has no assigned department context.",
                code="NO_DEPARTMENT_ASSIGNED",
            )

        # 1. Resolve student profile
        profile_stmt = text("""
            SELECT id FROM student_profiles
            WHERE user_id = :user_id AND department_id = :dept_id
        """)
        p_res = await session.execute(profile_stmt, {"user_id": str(user_id), "dept_id": str(department_id)})
        p_row = p_res.mappings().first()
        if not p_row:
            raise NotFoundError(
                message="Student profile not found for the authenticated user.",
                code="STUDENT_PROFILE_NOT_FOUND",
            )
        student_profile_id = p_row["id"]

        # 2. Inject RLS
        await session.execute(
            text("SELECT set_config('app.current_student_profile_id', :stu_id, true)"),
            {"stu_id": str(student_profile_id)},
        )

        # 3. Query attendance record with joined session and subject details
        rec_stmt = text("""
            SELECT ar.id, ar.student_id, ar.status,
                   att_s.id as attendance_session_id, att_s.is_finalized,
                   cs.session_date,
                   COALESCE(sub.code, 'GEN') as subject_code,
                   COALESCE(sub.name, 'General Session') as subject_name
            FROM attendance_records ar
            JOIN attendance_sessions att_s ON att_s.id = ar.attendance_session_id
            JOIN class_sessions cs ON cs.id = att_s.class_session_id
            LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
            LEFT JOIN subjects sub ON sub.id = ts.subject_id
            WHERE ar.id = :rec_id
        """)
        rec_res = await session.execute(rec_stmt, {"rec_id": str(request_data.attendance_record_id)})
        rec_row = rec_res.mappings().first()

        if not rec_row:
            raise NotFoundError(
                message="Attendance record not found.",
                code="ATTENDANCE_RECORD_NOT_FOUND",
            )

        if str(rec_row["student_id"]) != str(student_profile_id):
            raise PermissionDeniedError(
                message="Cannot dispute an attendance record that does not belong to you.",
                code="RECORD_NOT_OWNED",
            )

        if rec_row["status"] == "PRESENT":
            raise AppException(
                message="Attendance records marked PRESENT cannot be disputed.",
                code="CANNOT_DISPUTE_PRESENT",
                status_code=400,
            )

        if rec_row["is_finalized"] is False:
            raise AppException(
                message="Cannot dispute an attendance record for a session that has not been finalized.",
                code="SESSION_NOT_FINALIZED",
                status_code=400,
            )

        # 4. Check for existing dispute
        existing_stmt = text("""
            SELECT id, status FROM attendance_disputes
            WHERE attendance_record_id = :rec_id
        """)
        ex_res = await session.execute(existing_stmt, {"rec_id": str(request_data.attendance_record_id)})
        ex_row = ex_res.mappings().first()
        if ex_row:
            raise ConflictError(
                message=f"A dispute has already been submitted for this record (current status: {ex_row['status']}).",
                code="DISPUTE_ALREADY_EXISTS",
            )

        dispute_id = uuid.uuid4()
        now_dt = datetime.now(timezone.utc)

        insert_dispute_stmt = text("""
            INSERT INTO attendance_disputes (
                id, department_id, attendance_record_id, student_id,
                status, student_reason, dispute_evidence_metadata,
                created_at, updated_at
            )
            VALUES (
                :id, :dept_id, :rec_id, :stu_id,
                'SUBMITTED', :reason, CAST(:metadata AS jsonb),
                :now, :now
            )
        """)
        await session.execute(
            insert_dispute_stmt,
            {
                "id": str(dispute_id),
                "dept_id": str(department_id),
                "rec_id": str(request_data.attendance_record_id),
                "stu_id": str(student_profile_id),
                "reason": request_data.student_reason,
                "metadata": json.dumps(request_data.evidence_metadata) if request_data.evidence_metadata else None,
                "now": now_dt,
            },
        )

        # 5. Automatically create notification
        notif_id = uuid.uuid4()
        notif_stmt = text("""
            INSERT INTO notifications (
                id, recipient_user_id, role_target, category, title, message, is_read, created_at
            )
            VALUES (
                :id, :user_id, 'STUDENT', 'ATTENDANCE',
                'Attendance Dispute Filed',
                :msg, false, :now
            )
        """)
        sub_name = rec_row["subject_name"]
        sess_date = rec_row["session_date"].isoformat() if hasattr(rec_row["session_date"], "isoformat") else str(rec_row["session_date"])
        notif_msg = f"Your attendance dispute for {sub_name} ({sess_date}) has been submitted and is pending faculty review."
        await session.execute(
            notif_stmt,
            {
                "id": str(notif_id),
                "user_id": str(user_id),
                "msg": notif_msg,
                "now": now_dt,
            },
        )

        await session.commit()

        return StudentDisputeResponse(
            id=dispute_id,
            department_id=department_id,
            attendance_record_id=request_data.attendance_record_id,
            student_id=student_profile_id,
            status="SUBMITTED",
            student_reason=request_data.student_reason,
            resolution_notes=None,
            dispute_evidence_metadata=request_data.evidence_metadata,
            created_at=now_dt,
            resolved_at=None,
            session_date=sess_date,
            subject_code=rec_row["subject_code"],
            subject_name=rec_row["subject_name"],
            original_status=rec_row["status"],
        )

    @staticmethod
    async def get_student_disputes(
        session: AsyncSession,
        user_id: UUID,
        department_id: Optional[UUID],
        limit: int = 50,
    ) -> List[StudentDisputeResponse]:
        """
        Retrieves all attendance disputes submitted by the authenticated student.
        """
        if not department_id:
            raise PermissionDeniedError(
                message="Student user has no assigned department context.",
                code="NO_DEPARTMENT_ASSIGNED",
            )

        profile_stmt = text("""
            SELECT id FROM student_profiles
            WHERE user_id = :user_id AND department_id = :dept_id
        """)
        p_res = await session.execute(profile_stmt, {"user_id": str(user_id), "dept_id": str(department_id)})
        p_row = p_res.mappings().first()
        if not p_row:
            raise NotFoundError(
                message="Student profile not found.",
                code="STUDENT_PROFILE_NOT_FOUND",
            )
        student_profile_id = p_row["id"]

        await session.execute(
            text("SELECT set_config('app.current_student_profile_id', :stu_id, true)"),
            {"stu_id": str(student_profile_id)},
        )

        query = text("""
            SELECT ad.id, ad.department_id, ad.attendance_record_id, ad.student_id,
                   ad.status, ad.student_reason, ad.resolution_notes,
                   ad.dispute_evidence_metadata, ad.created_at, ad.resolved_at,
                   cs.session_date,
                   COALESCE(sub.code, 'GEN') as subject_code,
                   COALESCE(sub.name, 'General Session') as subject_name,
                   ar.status as original_status
            FROM attendance_disputes ad
            JOIN attendance_records ar ON ar.id = ad.attendance_record_id
            JOIN attendance_sessions att_s ON att_s.id = ar.attendance_session_id
            JOIN class_sessions cs ON cs.id = att_s.class_session_id
            LEFT JOIN timetable_slots ts ON ts.id = cs.timetable_slot_id
            LEFT JOIN subjects sub ON sub.id = ts.subject_id
            WHERE ad.student_id = :stu_id
            ORDER BY ad.created_at DESC
            LIMIT :limit
        """)
        res = await session.execute(query, {"stu_id": str(student_profile_id), "limit": limit})
        rows = res.mappings().all()

        disputes = []
        for r in rows:
            sess_date = r["session_date"].isoformat() if hasattr(r["session_date"], "isoformat") else str(r["session_date"])
            disputes.append(
                StudentDisputeResponse(
                    id=r["id"],
                    department_id=r["department_id"],
                    attendance_record_id=r["attendance_record_id"],
                    student_id=r["student_id"],
                    status=r["status"],
                    student_reason=r["student_reason"],
                    resolution_notes=r["resolution_notes"],
                    dispute_evidence_metadata=r["dispute_evidence_metadata"],
                    created_at=r["created_at"],
                    resolved_at=r["resolved_at"],
                    session_date=sess_date,
                    subject_code=r["subject_code"],
                    subject_name=r["subject_name"],
                    original_status=r["original_status"],
                )
            )
        return disputes

    @staticmethod
    async def get_student_activity(
        session: AsyncSession,
        user_id: UUID,
        department_id: Optional[UUID],
    ) -> StudentActivityDetailResponse:
        """
        Retrieves observable classroom event counters matching CampusPulse Blueprint Page 6.
        Adheres strictly to 'EVENTS ONLY · NO SCORES · NO LABELS'.
        """
        if not department_id:
            raise PermissionDeniedError(
                message="Student user has no assigned department context.",
                code="NO_DEPARTMENT_ASSIGNED",
            )

        profile_stmt = text("""
            SELECT sp.id, sp.roll_number, u.full_name, s.name as section_name
            FROM student_profiles sp
            JOIN users u ON u.id = sp.user_id
            JOIN sections s ON s.id = sp.section_id
            WHERE sp.user_id = :user_id AND sp.department_id = :dept_id
        """)
        p_res = await session.execute(profile_stmt, {"user_id": str(user_id), "dept_id": str(department_id)})
        p_row = p_res.mappings().first()
        if not p_row:
            raise NotFoundError(
                message="Student profile not found.",
                code="STUDENT_PROFILE_NOT_FOUND",
            )

        events_stmt = text("""
            SELECT event_code, count(*) as cnt
            FROM activity_events
            WHERE department_id = :dept_id
              AND event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY event_code
        """)
        ev_res = await session.execute(events_stmt, {"dept_id": str(department_id)})
        ev_rows = {r["event_code"]: int(r["cnt"]) for r in ev_res.mappings().all()}

        phone_cnt = ev_rows.get("PHONE", 0)
        talking_cnt = ev_rows.get("TALKING", 0)
        head_down_cnt = ev_rows.get("HEAD_DOWN", 0)
        out_of_seat_cnt = ev_rows.get("OUT_OF_SEAT", 0)
        total = phone_cnt + talking_cnt + head_down_cnt + out_of_seat_cnt

        rec_events_stmt = text("""
            SELECT event_code, event_timestamp, location_marker
            FROM activity_events
            WHERE department_id = :dept_id
            ORDER BY event_timestamp DESC
            LIMIT 10
        """)
        rec_ev_res = await session.execute(rec_events_stmt, {"dept_id": str(department_id)})
        recent_items = [
            StudentActivityTelemetryItem(
                event_code=r["event_code"],
                event_timestamp=r["event_timestamp"].isoformat() if hasattr(r["event_timestamp"], "isoformat") else str(r["event_timestamp"]),
                location_marker=r["location_marker"],
            )
            for r in rec_ev_res.mappings().all()
        ]

        class_totals = {
            "phone": phone_cnt,
            "talking": talking_cnt,
            "head_down": head_down_cnt,
            "out_of_seat": out_of_seat_cnt,
            "total": total,
        }

        return StudentActivityDetailResponse(
            student_name=p_row["full_name"],
            student_id=p_row["roll_number"],
            session_context=f"Section {p_row['section_name']} Telemetry",
            phone_count=phone_cnt,
            talking_count=talking_cnt,
            head_down_count=head_down_cnt,
            out_of_seat_count=out_of_seat_cnt,
            total_events=total,
            class_totals=class_totals,
            recent_events=recent_items,
        )

    @staticmethod
    async def get_student_activity_comparison(
        session: AsyncSession,
        user_id: UUID,
        department_id: Optional[UUID],
    ) -> StudentActivityComparisonResponse:
        """
        Retrieves temporal comparison of observable activity telemetry across consecutive weeks
        matching Blueprint Page 7.
        """
        if not department_id:
            raise PermissionDeniedError(
                message="Student user has no assigned department context.",
                code="NO_DEPARTMENT_ASSIGNED",
            )

        cmp_stmt = text("""
            SELECT event_code,
                   count(*) FILTER (WHERE event_timestamp >= CURRENT_DATE - INTERVAL '7 days') as this_week,
                   count(*) FILTER (WHERE event_timestamp >= CURRENT_DATE - INTERVAL '14 days'
                                      AND event_timestamp < CURRENT_DATE - INTERVAL '7 days') as last_week
            FROM activity_events
            WHERE department_id = :dept_id
            GROUP BY event_code
        """)
        cmp_res = await session.execute(cmp_stmt, {"dept_id": str(department_id)})
        cmp_rows = {r["event_code"]: r for r in cmp_res.mappings().all()}

        def build_metric(code: str) -> ComparisonMetricItem:
            row = cmp_rows.get(code) or {}
            tw = int(row.get("this_week") or 0)
            lw = int(row.get("last_week") or 0)
            if tw < lw:
                status = "DECREASED"
            elif tw > lw:
                status = "INCREASED"
            else:
                status = "STABLE"
            return ComparisonMetricItem(last_week=lw, this_week=tw, status=status)

        return StudentActivityComparisonResponse(
            phone=build_metric("PHONE"),
            talking=build_metric("TALKING"),
            head_down=build_metric("HEAD_DOWN"),
            out_of_seat=build_metric("OUT_OF_SEAT"),
            last_week_period="Previous 7 Days",
            this_week_period="Current 7 Days",
        )

    @staticmethod
    async def get_student_notifications(
        session: AsyncSession,
        user_id: UUID,
        limit: int = 50,
    ) -> NotificationListResponse:
        """
        Retrieves notifications for the authenticated student user.
        """
        stmt = text("""
            SELECT id, recipient_user_id, category, title, message, is_read, created_at
            FROM notifications
            WHERE recipient_user_id = :user_id
            ORDER BY created_at DESC
            LIMIT :limit
        """)
        res = await session.execute(stmt, {"user_id": str(user_id), "limit": limit})
        rows = res.mappings().all()

        notifications = []
        unread_count = 0
        for r in rows:
            if not r["is_read"]:
                unread_count += 1
            notifications.append(
                NotificationResponse(
                    id=r["id"],
                    recipient_user_id=r["recipient_user_id"],
                    category=r["category"],
                    title=r["title"],
                    message=r["message"],
                    is_read=r["is_read"],
                    created_at=r["created_at"],
                )
            )

        return NotificationListResponse(
            unread_count=unread_count,
            total_count=len(notifications),
            notifications=notifications,
        )

    @staticmethod
    async def mark_notification_read(
        session: AsyncSession,
        user_id: UUID,
        notification_id: UUID,
    ) -> NotificationResponse:
        """
        Marks a specific notification as read.
        """
        fetch_stmt = text("""
            SELECT id, recipient_user_id, category, title, message, is_read, created_at
            FROM notifications
            WHERE id = :notif_id AND recipient_user_id = :user_id
        """)
        res = await session.execute(fetch_stmt, {"notif_id": str(notification_id), "user_id": str(user_id)})
        row = res.mappings().first()
        if not row:
            raise NotFoundError(
                message="Notification not found.",
                code="NOTIFICATION_NOT_FOUND",
            )

        update_stmt = text("""
            UPDATE notifications
            SET is_read = true
            WHERE id = :notif_id
        """)
        await session.execute(update_stmt, {"notif_id": str(notification_id)})
        await session.commit()

        return NotificationResponse(
            id=row["id"],
            recipient_user_id=row["recipient_user_id"],
            category=row["category"],
            title=row["title"],
            message=row["message"],
            is_read=True,
            created_at=row["created_at"],
        )

    @staticmethod
    async def get_student_profile(
        session: AsyncSession,
        user_id: UUID,
        department_id: Optional[UUID],
    ) -> StudentProfileDetailResponse:
        """
        Retrieves detailed academic profile information for the authenticated student.
        """
        if not department_id:
            raise PermissionDeniedError(
                message="Student user has no assigned department context.",
                code="NO_DEPARTMENT_ASSIGNED",
            )

        stmt = text("""
            SELECT sp.id as student_id, sp.user_id, sp.roll_number, sp.enrollment_number,
                   sp.academic_status,
                   u.full_name, u.email,
                   s.name as section_name,
                   ab.name as batch_name,
                   d.name as department_name
            FROM student_profiles sp
            JOIN users u ON u.id = sp.user_id
            JOIN sections s ON s.id = sp.section_id
            JOIN academic_batches ab ON ab.id = s.batch_id
            JOIN departments d ON d.id = sp.department_id
            WHERE sp.user_id = :user_id AND sp.department_id = :dept_id
        """)
        res = await session.execute(stmt, {"user_id": str(user_id), "dept_id": str(department_id)})
        row = res.mappings().first()
        if not row:
            raise NotFoundError(
                message="Student profile not found.",
                code="STUDENT_PROFILE_NOT_FOUND",
            )

        att_stmt = text("""
            SELECT count(*) as total,
                   count(*) FILTER (WHERE status IN ('PRESENT', 'LATE')) as attended
            FROM attendance_records
            WHERE student_id = :stu_id
        """)
        att_res = await session.execute(att_stmt, {"stu_id": str(row["student_id"])})
        att_row = att_res.mappings().first() or {}
        tot = int(att_row.get("total") or 0)
        att = int(att_row.get("attended") or 0)
        pct = round((att / tot) * 100.0, 1) if tot > 0 else 0.0

        return StudentProfileDetailResponse(
            student_id=row["student_id"],
            user_id=row["user_id"],
            full_name=row["full_name"],
            email=row["email"],
            roll_number=row["roll_number"],
            enrollment_number=row["enrollment_number"],
            batch_name=row["batch_name"],
            section_name=row["section_name"],
            department_name=row["department_name"],
            academic_status=row["academic_status"],
            total_attendance_percentage=pct,
        )



student_service = StudentService()
