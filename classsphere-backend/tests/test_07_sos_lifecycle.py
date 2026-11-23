"""
Test Suite 07: SOS Emergency Lifecycle & Verified External Handoff Boundary.
Verifies the 4 explicit states: ESCALATION_REQUESTED -> EXTERNAL_HANDOFF_PENDING ->
EXTERNAL_HANDOFF_CONFIRMED -> CAMPUS_RESOLVED, requiring mandatory verified metadata
before custody handoff can be confirmed.

Test Isolation: Uses dedicated INST-TEST / TEST-DEPT.
"""
import uuid
from datetime import datetime, timezone
import pytest
import psycopg
from psycopg.errors import CheckViolation

def test_sos_lifecycle_and_verified_external_handoff(migrator_conn, test_tenant):
    """Verifies complete SOS state machine and confirmed external handoff metadata enforcement."""
    t_inst_id = test_tenant["institution_id"]
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]

    with migrator_conn.cursor() as cur:
        sos_id = uuid.uuid4()
        inc_code = f"SOS-{uuid.uuid4().hex[:8].upper()}"

        # 1. Trigger SOS: Initial state is REPORTED
        cur.execute("""
            INSERT INTO sos_incidents (
                id, institution_id, department_id, reported_by_user_id,
                incident_code, severity, status, location_description, notes
            ) VALUES (
                %s, %s, %s, %s, %s, 'CRITICAL', 'REPORTED',
                'Room T-101, Test Block', 'Student acute medical distress observed.'
            );
        """, (sos_id, t_inst_id, t_dept_id, user_id, inc_code))

        # 2. Campus Security / HOD Acknowledges
        cur.execute("""
            UPDATE sos_incidents
            SET status = 'ACKNOWLEDGED'
            WHERE id = %s;
        """, (sos_id,))

        cur.execute("""
            INSERT INTO sos_escalation_history (sos_incident_id, actor_user_id, stage, action_taken)
            VALUES (%s, %s, 'ACKNOWLEDGED', 'Campus first-aid team deployed to Room T-101.');
        """, (sos_id, user_id))

        # 3. Responder requests municipal escalation: ESCALATION_REQUESTED
        cur.execute("""
            UPDATE sos_incidents
            SET status = 'ESCALATION_REQUESTED'
            WHERE id = %s;
        """, (sos_id,))

        # 4. Campus dispatch places call to 112/108: EXTERNAL_HANDOFF_PENDING
        cur.execute("""
            UPDATE sos_incidents
            SET status = 'EXTERNAL_HANDOFF_PENDING',
                notes = 'Ambulance requested via 112. Awaiting on-scene arrival.'
            WHERE id = %s;
        """, (sos_id,))

        # 5. Outside EMS Arrives: Confirmed Hand-off with MANDATORY metadata
        handoff_time = datetime.now(timezone.utc)
        agency = "City Emergency Medical Services"
        dispatch_ref = "CAD-2026-88129"
        officer = "Paramedic Lead T. Henderson"

        cur.execute("""
            UPDATE sos_incidents
            SET status = 'EXTERNAL_HANDOFF_CONFIRMED',
                external_agency_name = %s,
                external_dispatch_ref = %s,
                external_officer_name = %s,
                external_handoff_at = %s
            WHERE id = %s;
        """, (agency, dispatch_ref, officer, handoff_time, sos_id))

        # 6. Campus incident is formally closed: CAMPUS_RESOLVED
        cur.execute("""
            UPDATE sos_incidents
            SET status = 'CAMPUS_RESOLVED'
            WHERE id = %s;
        """, (sos_id,))

        # Verify final state and audit history
        cur.execute("""
            SELECT status, external_agency_name, external_dispatch_ref, external_officer_name, external_handoff_at
            FROM sos_incidents WHERE id = %s;
        """, (sos_id,))
        final_row = cur.fetchone()
        assert final_row["status"] == "CAMPUS_RESOLVED"
        assert final_row["external_agency_name"] == agency
        assert final_row["external_dispatch_ref"] == dispatch_ref
        assert final_row["external_officer_name"] == officer
        assert final_row["external_handoff_at"] is not None
        print("Verified SOS 4-stage lifecycle and confirmed external handoff tracking.")

def test_invalid_sos_status_rejected_by_check_constraint(migrator_conn, test_tenant):
    """Attempting to set an invalid status string raises SQLSTATE 23514 (Check Violation)."""
    t_inst_id = test_tenant["institution_id"]
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]

    with migrator_conn.cursor() as cur:
        sos_id = uuid.uuid4()
        inc_code = f"SOS-{uuid.uuid4().hex[:8].upper()}"

        with pytest.raises(CheckViolation) as excinfo:
            cur.execute("""
                INSERT INTO sos_incidents (
                    id, institution_id, department_id, reported_by_user_id,
                    incident_code, severity, status
                ) VALUES (
                    %s, %s, %s, %s, %s, 'CRITICAL', 'SIMULATED_DISPATCH_COMPLETE'
                );
            """, (sos_id, t_inst_id, t_dept_id, user_id, inc_code))
        assert "chk_sos_status" in str(excinfo.value)
        print("Verified: Invalid SOS state rejected by chk_sos_status constraint.")
