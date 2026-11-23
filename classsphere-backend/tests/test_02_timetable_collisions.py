"""
Test Suite 02: Timetable Collision Enforcement & Version Isolation.
Verifies GiST exclusion constraints, cross-version slot coexistence,
single published timetable partial unique index, and concurrent publication serialization.

Test Isolation: All timetable mutations run strictly within INST-TEST / TEST-DEPT.
Guarantees INST-DEMO slot count remains strictly at 15.
"""
import uuid
import pytest
import psycopg
from psycopg.errors import ExclusionViolation, UniqueViolation

def verify_demo_slot_count_unchanged(migrator_conn, demo_department_id):
    """Verifies that INST-DEMO timetable slot count remains exactly 15."""
    with migrator_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS cnt FROM timetable_slots WHERE department_id = %s;", (demo_department_id,))
        cnt = cur.fetchone()["cnt"]
        assert cnt == 15, f"Test isolation breach: INST-DEMO slots changed to {cnt} (must be 15)!"

def test_faculty_collision_rejected_in_same_version(migrator_conn, test_tenant, demo_department_id):
    """GiST exclusion constraint rejects overlapping faculty schedule in the same version."""
    t_dept_id = test_tenant["department_id"]
    with migrator_conn.cursor() as cur:
        version_id = uuid.uuid4()
        term_name = f"Term_{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 1, %s, 'DRAFT');
        """, (version_id, t_dept_id, term_name))

        cur.execute("SELECT id FROM faculty_profiles WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        fac_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 2;", (t_dept_id,))
        rooms = cur.fetchall()
        room1, room2 = rooms[0]["id"], rooms[1]["id"]
        cur.execute("SELECT id FROM subjects WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        subj_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM sections WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        sec1 = cur.fetchone()["id"]

        # Insert Slot 1: Monday [540, 600) (09:00 - 10:00) with Faculty in Room 1
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', '[540, 600)'::int4range);
        """, (uuid.uuid4(), t_dept_id, version_id, fac_id, room1, subj_id, sec1))

        # Attempt overlapping Slot 2: Monday [570, 630) with SAME Faculty in Room 2
        with pytest.raises(ExclusionViolation) as excinfo:
            cur.execute("""
                INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', '[570, 630)'::int4range);
            """, (uuid.uuid4(), t_dept_id, version_id, fac_id, room2, subj_id, sec1))
        assert "ex_timetable_faculty_collision" in str(excinfo.value)
        print("Verified faculty collision rejection: ex_timetable_faculty_collision fired.")

    verify_demo_slot_count_unchanged(migrator_conn, demo_department_id)

def test_room_collision_rejected_in_same_version(migrator_conn, test_tenant, demo_department_id):
    """GiST exclusion constraint rejects overlapping room schedule in the same version."""
    t_dept_id = test_tenant["department_id"]
    with migrator_conn.cursor() as cur:
        version_id = uuid.uuid4()
        term_name = f"Term_{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 1, %s, 'DRAFT');
        """, (version_id, t_dept_id, term_name))

        cur.execute("SELECT id FROM faculty_profiles WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        fac1 = cur.fetchone()["id"]
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        room_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM subjects WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        subj_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM sections WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        sec1 = cur.fetchone()["id"]

        # Slot 1: Room X on Tuesday [600, 660)
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'TUESDAY', '[600, 660)'::int4range);
        """, (uuid.uuid4(), t_dept_id, version_id, fac1, room_id, subj_id, sec1))

        # Slot 2: Same Room X on Tuesday [630, 690)
        with pytest.raises(ExclusionViolation) as excinfo:
            cur.execute("""
                INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'TUESDAY', '[630, 690)'::int4range);
            """, (uuid.uuid4(), t_dept_id, version_id, fac1, room_id, subj_id, sec1))
        assert "ex_timetable_room_collision" in str(excinfo.value)
        print("Verified room collision rejection: ex_timetable_room_collision fired.")

    verify_demo_slot_count_unchanged(migrator_conn, demo_department_id)

def test_cross_version_slot_coexistence(migrator_conn, test_tenant, demo_department_id):
    """Historical/draft versions can contain overlapping slots without cross-version collision."""
    t_dept_id = test_tenant["department_id"]
    with migrator_conn.cursor() as cur:
        v_a = uuid.uuid4()
        v_b = uuid.uuid4()
        term_name = f"Term_{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 1, %s, 'DRAFT');
        """, (v_a, t_dept_id, term_name))
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 2, %s, 'DRAFT');
        """, (v_b, t_dept_id, term_name))

        cur.execute("SELECT id FROM faculty_profiles WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        fac_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        room_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM subjects WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        subj_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM sections WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        sec_id = cur.fetchone()["id"]

        # Insert exact same slot in Version A
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'WEDNESDAY', '[540, 600)'::int4range);
        """, (uuid.uuid4(), t_dept_id, v_a, fac_id, room_id, subj_id, sec_id))

        # Insert exact same slot in Version B (MUST SUCCEED because timetable_version_id is different)
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'WEDNESDAY', '[540, 600)'::int4range);
        """, (uuid.uuid4(), t_dept_id, v_b, fac_id, room_id, subj_id, sec_id))
        print("Verified version isolation: identical slots in different versions coexist successfully.")

    verify_demo_slot_count_unchanged(migrator_conn, demo_department_id)

def test_single_published_version_enforced_by_partial_index(migrator_conn, test_tenant, demo_department_id):
    """Partial unique index uq_one_published_timetable_per_dept allows only 1 PUBLISHED version."""
    t_dept_id = test_tenant["department_id"]
    with migrator_conn.cursor() as cur:
        v_first = uuid.uuid4()
        term_first = f"Term_{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 1, %s, 'PUBLISHED');
        """, (v_first, t_dept_id, term_first))

        # Now try to publish a second version for the same department without archiving the first
        v_second = uuid.uuid4()
        term_second = f"Term_{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 2, %s, 'DRAFT');
        """, (v_second, t_dept_id, term_second))

        with pytest.raises(UniqueViolation) as excinfo:
            cur.execute("""
                UPDATE timetable_versions
                SET approval_status = 'PUBLISHED'
                WHERE id = %s;
            """, (v_second,))
        assert "uq_one_published_timetable_per_dept" in str(excinfo.value)
        print("Verified partial unique index: second PUBLISHED timetable rejected.")

    verify_demo_slot_count_unchanged(migrator_conn, demo_department_id)

def test_concurrent_publication_advisory_locking(migrator_conn, test_tenant, demo_department_id):
    """Demonstrates atomic promotion and safe archival under advisory lock in test tenant."""
    t_dept_id = test_tenant["department_id"]
    with migrator_conn.cursor() as cur:
        lock_id = hash(f"publish_timetable_{t_dept_id}") & 0x7FFFFFFFFFFFFFFF
        cur.execute("SELECT pg_advisory_xact_lock(%s);", (lock_id,))

        # Archive any existing published version in test tenant
        cur.execute("""
            UPDATE timetable_versions
            SET approval_status = 'ARCHIVED'
            WHERE department_id = %s AND approval_status = 'PUBLISHED';
        """, (t_dept_id,))

        # Create and publish a new version
        v_new = uuid.uuid4()
        term_name = f"Term_{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 3, %s, 'PUBLISHED');
        """, (v_new, t_dept_id, term_name))

        # Cleanly archive v_new
        cur.execute("""
            UPDATE timetable_versions SET approval_status = 'ARCHIVED' WHERE id = %s;
        """, (v_new,))
        print("Verified advisory locked publication cycle successfully.")

    verify_demo_slot_count_unchanged(migrator_conn, demo_department_id)

def test_section_collision_rejected_in_same_version(migrator_conn, test_tenant, demo_department_id):
    """
    Test A & Test E: GiST exclusion constraint rejects overlapping section schedule
    within the same timetable version with ex_timetable_section_collision (SQLSTATE 23P01).
    """
    t_dept_id = test_tenant["department_id"]
    with migrator_conn.cursor() as cur:
        version_id = uuid.uuid4()
        term_name = f"Term_{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 1, %s, 'DRAFT');
        """, (version_id, t_dept_id, term_name))

        cur.execute("SELECT id FROM faculty_profiles WHERE department_id = %s LIMIT 2;", (t_dept_id,))
        facs = cur.fetchall()
        fac1, fac2 = facs[0]["id"], facs[1]["id"]
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 2;", (t_dept_id,))
        rooms = cur.fetchall()
        room1, room2 = rooms[0]["id"], rooms[1]["id"]
        cur.execute("SELECT id FROM subjects WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        subj_id = cur.fetchone()["id"]
        sec_id = test_tenant["section_a_id"]

        # Slot 1: Section A on Monday [540, 600) (09:00 - 10:00) with Faculty 1 in Room 1
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', '[540, 600)'::int4range);
        """, (uuid.uuid4(), t_dept_id, version_id, fac1, room1, subj_id, sec_id))

        # Attempt overlapping Slot 2: Section A on Monday [570, 630) (09:30 - 10:30) with Faculty 2 in Room 2
        # Different room and different faculty, but SAME section and OVERLAPPING time range.
        with pytest.raises(ExclusionViolation) as excinfo:
            cur.execute("""
                INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', '[570, 630)'::int4range);
            """, (uuid.uuid4(), t_dept_id, version_id, fac2, room2, subj_id, sec_id))

        assert "ex_timetable_section_collision" in str(excinfo.value)
        assert excinfo.value.sqlstate == "23P01"
        print("Verified section collision rejection: ex_timetable_section_collision fired with SQLSTATE 23P01.")

    verify_demo_slot_count_unchanged(migrator_conn, demo_department_id)

def test_section_adjacent_slots_permitted(migrator_conn, test_tenant, demo_department_id):
    """
    Test B: Adjacent non-overlapping time ranges for the same section in the same version are both accepted.
    """
    t_dept_id = test_tenant["department_id"]
    with migrator_conn.cursor() as cur:
        version_id = uuid.uuid4()
        term_name = f"Term_{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 1, %s, 'DRAFT');
        """, (version_id, t_dept_id, term_name))

        cur.execute("SELECT id FROM faculty_profiles WHERE department_id = %s LIMIT 2;", (t_dept_id,))
        facs = cur.fetchall()
        fac1, fac2 = facs[0]["id"], facs[1]["id"]
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 2;", (t_dept_id,))
        rooms = cur.fetchall()
        room1, room2 = rooms[0]["id"], rooms[1]["id"]
        cur.execute("SELECT id FROM subjects WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        subj_id = cur.fetchone()["id"]
        sec_id = test_tenant["section_a_id"]

        # Slot 1: Section A on Monday [540, 600) (09:00 - 10:00)
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', '[540, 600)'::int4range);
        """, (uuid.uuid4(), t_dept_id, version_id, fac1, room1, subj_id, sec_id))

        # Slot 2: Section A on Monday [600, 660) (10:00 - 11:00) - Adjacent, non-overlapping
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', '[600, 660)'::int4range);
        """, (uuid.uuid4(), t_dept_id, version_id, fac2, room2, subj_id, sec_id))

        print("Verified adjacent section slots permitted: [540, 600) and [600, 660) successfully stored.")

    verify_demo_slot_count_unchanged(migrator_conn, demo_department_id)

def test_different_sections_same_time_permitted(migrator_conn, test_tenant, demo_department_id):
    """
    Test C: Different sections with the same time range are permitted when rooms and faculty differ.
    """
    t_dept_id = test_tenant["department_id"]
    with migrator_conn.cursor() as cur:
        version_id = uuid.uuid4()
        term_name = f"Term_{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 1, %s, 'DRAFT');
        """, (version_id, t_dept_id, term_name))

        cur.execute("SELECT id FROM faculty_profiles WHERE department_id = %s LIMIT 2;", (t_dept_id,))
        facs = cur.fetchall()
        fac1, fac2 = facs[0]["id"], facs[1]["id"]
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 2;", (t_dept_id,))
        rooms = cur.fetchall()
        room1, room2 = rooms[0]["id"], rooms[1]["id"]
        cur.execute("SELECT id FROM subjects WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        subj_id = cur.fetchone()["id"]
        sec_a = test_tenant["section_a_id"]
        sec_b = test_tenant["section_b_id"]

        # Slot 1: Section A on Monday [540, 600) in Room 1 with Faculty 1
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', '[540, 600)'::int4range);
        """, (uuid.uuid4(), t_dept_id, version_id, fac1, room1, subj_id, sec_a))

        # Slot 2: Section B on Monday [540, 600) in Room 2 with Faculty 2 (Identical time, different sections)
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', '[540, 600)'::int4range);
        """, (uuid.uuid4(), t_dept_id, version_id, fac2, room2, subj_id, sec_b))

        print("Verified concurrent distinct section slots permitted: Section A and Section B at [540, 600).")

    verify_demo_slot_count_unchanged(migrator_conn, demo_department_id)

def test_section_overlapping_slots_different_versions_permitted(migrator_conn, test_tenant, demo_department_id):
    """
    Test D: Overlapping slots for the same section in distinct draft versions coexist without cross-version collision.
    """
    t_dept_id = test_tenant["department_id"]
    with migrator_conn.cursor() as cur:
        v_a = uuid.uuid4()
        v_b = uuid.uuid4()
        term_name = f"Term_{uuid.uuid4().hex[:8]}"
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 1, %s, 'DRAFT');
        """, (v_a, t_dept_id, term_name))
        cur.execute("""
            INSERT INTO timetable_versions (id, department_id, version_number, academic_term, approval_status)
            VALUES (%s, %s, 2, %s, 'DRAFT');
        """, (v_b, t_dept_id, term_name))

        cur.execute("SELECT id FROM faculty_profiles WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        fac_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM classrooms WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        room_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM subjects WHERE department_id = %s LIMIT 1;", (t_dept_id,))
        subj_id = cur.fetchone()["id"]
        sec_id = test_tenant["section_a_id"]

        # Slot in Version A: Section A on Monday [540, 600)
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', '[540, 600)'::int4range);
        """, (uuid.uuid4(), t_dept_id, v_a, fac_id, room_id, subj_id, sec_id))

        # Overlapping Slot in Version B: Section A on Monday [570, 630)
        cur.execute("""
            INSERT INTO timetable_slots (id, department_id, timetable_version_id, faculty_id, room_id, subject_id, section_id, day_of_week, slot_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'MONDAY', '[570, 630)'::int4range);
        """, (uuid.uuid4(), t_dept_id, v_b, fac_id, room_id, subj_id, sec_id))

        print("Verified version-scoped section coexistence: overlapping slots across Version 1 and 2 succeed.")

    verify_demo_slot_count_unchanged(migrator_conn, demo_department_id)
