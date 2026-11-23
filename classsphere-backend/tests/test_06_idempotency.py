"""
Test Suite 06: Idempotent Mutation Engine & Replay Guarantees.
Verifies composite uniqueness, payload fingerprinting, deterministic replay,
mismatched payload rejection, and 24-hour TTL cleanup.

Test Isolation: Uses dedicated INST-TEST / TEST-DEPT.
"""
import uuid
import hashlib
import json
from datetime import datetime, timezone, timedelta
import pytest
import psycopg
from psycopg.errors import UniqueViolation

def compute_payload_hash(payload: dict, route: str) -> str:
    canonical_json = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(f"{canonical_json}|{route}".encode("utf-8")).hexdigest()

def test_idempotent_retry_and_replay(migrator_conn, test_tenant):
    """Presenting the same key and payload replays stored response deterministically."""
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]

    with migrator_conn.cursor() as cur:
        idem_key = f"key_{uuid.uuid4()}"
        operation = "finalize_attendance_session"
        payload = {"session_id": str(uuid.uuid4()), "present_count": 42, "late_count": 3}
        p_hash = compute_payload_hash(payload, "/api/attendance/finalize")

        # 1. Acquire PENDING reservation
        rec_id = uuid.uuid4()
        expires = datetime.now(timezone.utc) + timedelta(hours=24)
        cur.execute("""
            INSERT INTO idempotency_records (
                id, department_id, user_id, operation_name, idempotency_key,
                payload_hash, status, expires_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, 'PENDING', %s
            );
        """, (rec_id, t_dept_id, user_id, operation, idem_key, p_hash, expires))

        # 2. Simulate business execution and promote to COMPLETED with stored HTTP response
        resp_body = {"status": "SUCCESS", "message": "Roll-call finalized", "finalized_records": 45}
        cur.execute("""
            UPDATE idempotency_records
            SET status = 'COMPLETED',
                response_code = 200,
                response_body = %s,
                response_headers = '{\"Content-Type\": \"application/json\", \"X-Idempotency-Replay\": \"true\"}'::jsonb
            WHERE id = %s;
        """, (json.dumps(resp_body), rec_id))

        # 3. Simulate retry with SAME key and SAME payload: query database record
        cur.execute("""
            SELECT status, payload_hash, response_code, response_body, response_headers
            FROM idempotency_records
            WHERE department_id = %s AND user_id = %s AND operation_name = %s AND idempotency_key = %s;
        """, (t_dept_id, user_id, operation, idem_key))
        stored = cur.fetchone()
        assert stored["status"] == "COMPLETED"
        assert stored["payload_hash"] == p_hash
        assert stored["response_code"] == 200
        assert stored["response_body"]["status"] == "SUCCESS"
        assert stored["response_headers"]["X-Idempotency-Replay"] == "true"
        print("Verified: Idempotent retry returns stored response with deterministic replay.")

def test_idempotency_key_reuse_with_mismatched_payload_fails(migrator_conn, test_tenant):
    """Reusing same key with differing payload is rejected as a collision / mismatch."""
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]

    with migrator_conn.cursor() as cur:
        idem_key = f"key_{uuid.uuid4()}"
        operation = "publish_timetable"
        payload_a = {"version_id": str(uuid.uuid4()), "term": "Fall 2026"}
        payload_b = {"version_id": str(uuid.uuid4()), "term": "Spring 2027"}

        hash_a = compute_payload_hash(payload_a, "/api/timetable/publish")
        hash_b = compute_payload_hash(payload_b, "/api/timetable/publish")
        assert hash_a != hash_b

        expires = datetime.now(timezone.utc) + timedelta(hours=24)
        cur.execute("""
            INSERT INTO idempotency_records (
                department_id, user_id, operation_name, idempotency_key,
                payload_hash, status, expires_at
            ) VALUES (
                %s, %s, %s, %s, %s, 'COMPLETED', %s
            );
        """, (t_dept_id, user_id, operation, idem_key, hash_a, expires))

        # Attempt to insert same key with different payload (unique constraint blocks collision)
        with pytest.raises(UniqueViolation) as excinfo:
            cur.execute("""
                INSERT INTO idempotency_records (
                    department_id, user_id, operation_name, idempotency_key,
                    payload_hash, status, expires_at
                ) VALUES (
                    %s, %s, %s, %s, %s, 'PENDING', %s
                );
            """, (t_dept_id, user_id, operation, idem_key, hash_b, expires))
        assert "uq_idempotency_scope" in str(excinfo.value)
        print("Verified: Idempotency key reuse with mismatched payload rejected by uq_idempotency_scope.")

def test_expired_idempotency_key_cleanup(migrator_conn, test_tenant):
    """Expired idempotency keys past 24h retention window are purged by maintenance query."""
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]

    with migrator_conn.cursor() as cur:
        expired_key = f"key_expired_{uuid.uuid4()}"
        payload = {"data": "test_expired"}
        p_hash = compute_payload_hash(payload, "/api/test")
        past_expiration = datetime.now(timezone.utc) - timedelta(hours=2)

        cur.execute("""
            INSERT INTO idempotency_records (
                department_id, user_id, operation_name, idempotency_key,
                payload_hash, status, expires_at
            ) VALUES (
                %s, %s, 'expired_op', %s, %s, 'COMPLETED', %s
            );
        """, (t_dept_id, user_id, expired_key, p_hash, past_expiration))

        # Execute 24-hour cleanup job
        cur.execute("""
            DELETE FROM idempotency_records
            WHERE expires_at < CURRENT_TIMESTAMP;
        """)
        deleted_count = cur.rowcount
        assert deleted_count >= 1

        # Confirm expired record no longer exists
        cur.execute("""
            SELECT id FROM idempotency_records
            WHERE department_id = %s AND idempotency_key = %s;
        """, (t_dept_id, expired_key))
        assert cur.fetchone() is None
        print(f"Verified: 24h TTL cleanup removed {deleted_count} expired idempotency records.")

import threading
import time
from psycopg.rows import dict_row
from app.core.config import settings

def get_new_db_connection():
    conn_str = f"host={settings.POSTGRES_SERVER} port={settings.POSTGRES_PORT} dbname={settings.POSTGRES_DB} user={settings.MIGRATOR_USER} password={settings.MIGRATOR_PASSWORD}"
    return psycopg.connect(conn_str, autocommit=False, row_factory=dict_row)

def test_concurrent_identical_requests(test_tenant):
    """
    Test A: Multiple concurrent requests with identical idempotency key and payload.
    Uses separate PostgreSQL connections.
    Asserts: exactly 1 business mutation commits; others receive replay response; no duplicate records.
    """
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]
    idem_key = f"concurrent_key_{uuid.uuid4()}"
    op_name = "create_test_subject"
    payload = {"code_suffix": uuid.uuid4().hex[:6], "name": "Distributed Systems Testing"}
    p_hash = compute_payload_hash(payload, f"/api/{op_name}")
    subject_code = f"SUB_{payload['code_suffix']}"

    results = []
    errors = []
    barrier = threading.Barrier(2)

    def worker(worker_id):
        conn = get_new_db_connection()
        try:
            barrier.wait()
            # Step 1: Try reservation
            reserved = False
            rec_id = uuid.uuid4()
            expires = datetime.now(timezone.utc) + timedelta(hours=24)
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO idempotency_records (
                            id, department_id, user_id, operation_name, idempotency_key,
                            payload_hash, status, expires_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, 'PENDING', %s
                        );
                    """, (rec_id, t_dept_id, user_id, op_name, idem_key, p_hash, expires))
                conn.commit()
                reserved = True
            except UniqueViolation:
                conn.rollback()
                reserved = False

            if reserved:
                # Execute business mutation
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO subjects (id, department_id, code, name, credits)
                        VALUES (%s, %s, %s, %s, 3);
                    """, (uuid.uuid4(), t_dept_id, subject_code, payload["name"]))
                    resp_body = {"status": "CREATED", "subject_code": subject_code}
                    cur.execute("""
                        UPDATE idempotency_records
                        SET status = 'COMPLETED',
                            response_code = 201,
                            response_body = %s,
                            response_headers = '{"X-Idempotency-Replay": "false"}'::jsonb
                        WHERE id = %s;
                    """, (json.dumps(resp_body), rec_id))
                conn.commit()
                results.append({"worker": worker_id, "action": "MUTATED", "response": resp_body, "is_replay": False})
            else:
                # Wait for the primary worker to complete, then read replay
                cached = None
                for _ in range(20):
                    time.sleep(0.05)
                    with conn.cursor() as cur:
                        cur.execute("""
                            SELECT status, response_body
                            FROM idempotency_records
                            WHERE department_id = %s AND user_id = %s AND operation_name = %s AND idempotency_key = %s;
                        """, (t_dept_id, user_id, op_name, idem_key))
                        row = cur.fetchone()
                        if row and row["status"] == "COMPLETED":
                            cached = row["response_body"]
                            break
                conn.commit()
                results.append({"worker": worker_id, "action": "REPLAYED", "response": cached, "is_replay": True})
        except Exception as e:
            errors.append((worker_id, e))
        finally:
            conn.close()

    t1 = threading.Thread(target=worker, args=(1,))
    t2 = threading.Thread(target=worker, args=(2,))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert not errors, f"Errors in concurrent workers: {errors}"
    assert len(results) == 2
    actions = [r["action"] for r in results]
    assert "MUTATED" in actions
    assert "REPLAYED" in actions

    # Verify only ONE business mutation exists in database
    conn_check = get_new_db_connection()
    with conn_check.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS cnt FROM subjects WHERE department_id = %s AND code = %s;", (t_dept_id, subject_code))
        cnt = cur.fetchone()["cnt"]
        assert cnt == 1, f"Duplicate business mutations detected! Count={cnt}"
    conn_check.close()
    print("Verified concurrent identical requests: exactly 1 mutation executed, other replayed cached response.")

def test_concurrent_same_key_different_payload_fails(test_tenant):
    """
    Test B: Submitting concurrent requests using the same key with different payloads.
    Asserts: key cannot be reused for a different payload; conflict/mismatch rejected.
    """
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]
    idem_key = f"key_mismatch_{uuid.uuid4()}"
    op_name = "test_operation"
    payload_a = {"param": "value_alpha"}
    payload_b = {"param": "value_beta"}
    hash_a = compute_payload_hash(payload_a, f"/api/{op_name}")
    hash_b = compute_payload_hash(payload_b, f"/api/{op_name}")
    assert hash_a != hash_b

    conn_a = get_new_db_connection()
    conn_b = get_new_db_connection()
    try:
        # Worker A reserves key with payload_a
        expires = datetime.now(timezone.utc) + timedelta(hours=24)
        with conn_a.cursor() as cur:
            cur.execute("""
                INSERT INTO idempotency_records (
                    id, department_id, user_id, operation_name, idempotency_key,
                    payload_hash, status, expires_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 'COMPLETED', %s
                );
            """, (uuid.uuid4(), t_dept_id, user_id, op_name, idem_key, hash_a, expires))
        conn_a.commit()

        # Worker B attempts same key with different payload_b
        with pytest.raises(UniqueViolation) as excinfo:
            with conn_b.cursor() as cur:
                cur.execute("""
                    INSERT INTO idempotency_records (
                        id, department_id, user_id, operation_name, idempotency_key,
                        payload_hash, status, expires_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, 'PENDING', %s
                    );
                """, (uuid.uuid4(), t_dept_id, user_id, op_name, idem_key, hash_b, expires))
            conn_b.commit()
        assert "uq_idempotency_scope" in str(excinfo.value)

        # Worker B inspects existing record and detects payload hash mismatch
        conn_b.rollback()
        with conn_b.cursor() as cur:
            cur.execute("""
                SELECT payload_hash FROM idempotency_records
                WHERE department_id = %s AND user_id = %s AND operation_name = %s AND idempotency_key = %s;
            """, (t_dept_id, user_id, op_name, idem_key))
            existing_hash = cur.fetchone()["payload_hash"]
            assert existing_hash == hash_a
            assert existing_hash != hash_b, "Mismatch must be detected between payload_b and stored hash!"
        print("Verified concurrent same key different payload: rejected by uq_idempotency_scope and hash mismatch detected.")
    finally:
        conn_a.close()
        conn_b.close()

def test_atomic_business_mutation_and_completion(test_tenant):
    """
    Test C: Simulates a failure between the business mutation and idempotency completion.
    Asserts:
    1. Business mutation and idempotency record commit atomically.
    2. If transaction rolls back, neither a partial business mutation nor a false completed response remains.
    3. A retry can safely recover and complete cleanly.
    """
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]
    idem_key = f"key_atomic_{uuid.uuid4()}"
    op_name = "atomic_course_registration"
    payload = {"code": f"ATM_{uuid.uuid4().hex[:6]}", "name": "Atomic Transaction Principles"}
    p_hash = compute_payload_hash(payload, f"/api/{op_name}")
    subject_code = payload["code"]
    expires = datetime.now(timezone.utc) + timedelta(hours=24)

    conn = get_new_db_connection()
    try:
        # Phase 1: Simulate crash/rollback inside the transaction
        try:
            with conn.transaction():
                with conn.cursor() as cur:
                    # 1. Insert reservation
                    cur.execute("""
                        INSERT INTO idempotency_records (
                            id, department_id, user_id, operation_name, idempotency_key,
                            payload_hash, status, expires_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, 'PENDING', %s
                        );
                    """, (uuid.uuid4(), t_dept_id, user_id, op_name, idem_key, p_hash, expires))

                    # 2. Execute business mutation
                    cur.execute("""
                        INSERT INTO subjects (id, department_id, code, name, credits)
                        VALUES (%s, %s, %s, %s, 4);
                    """, (uuid.uuid4(), t_dept_id, subject_code, payload["name"]))

                    # 3. Simulate mid-flight failure (e.g. power loss or unhandled error before commit)
                    raise RuntimeError("Simulated mid-flight crash before transaction commit")
        except RuntimeError:
            pass  # Expected simulated error

        # Verify atomic rollback: neither the subject nor the idempotency record exists
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS cnt FROM subjects WHERE department_id = %s AND code = %s;", (t_dept_id, subject_code))
            assert cur.fetchone()["cnt"] == 0, "Partial business mutation survived rollback!"

            cur.execute("SELECT COUNT(*) AS cnt FROM idempotency_records WHERE department_id = %s AND idempotency_key = %s;", (t_dept_id, idem_key))
            assert cur.fetchone()["cnt"] == 0, "Partial idempotency record survived rollback!"

        # Phase 2: Safe retry executes and commits atomically
        with conn.transaction():
            with conn.cursor() as cur:
                rec_id = uuid.uuid4()
                cur.execute("""
                    INSERT INTO idempotency_records (
                        id, department_id, user_id, operation_name, idempotency_key,
                        payload_hash, status, expires_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, 'PENDING', %s
                    );
                """, (rec_id, t_dept_id, user_id, op_name, idem_key, p_hash, expires))

                cur.execute("""
                    INSERT INTO subjects (id, department_id, code, name, credits)
                    VALUES (%s, %s, %s, %s, 4);
                """, (uuid.uuid4(), t_dept_id, subject_code, payload["name"]))

                cur.execute("""
                    UPDATE idempotency_records
                    SET status = 'COMPLETED',
                        response_code = 200,
                        response_body = '{"status": "SUCCESS"}'::jsonb
                    WHERE id = %s;
                """, (rec_id,))

        # Verify retry committed both business record and completed idempotency record
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS cnt FROM subjects WHERE department_id = %s AND code = %s;", (t_dept_id, subject_code))
            assert cur.fetchone()["cnt"] == 1, "Subject record missing after retry!"

            cur.execute("SELECT status FROM idempotency_records WHERE department_id = %s AND idempotency_key = %s;", (t_dept_id, idem_key))
            row = cur.fetchone()
            assert row is not None
            assert row["status"] == "COMPLETED"

        print("Verified atomic business mutation and completion: rollback leaves zero state, retry completes cleanly.")
    finally:
        conn.close()

def test_concurrent_reservation_uniqueness(test_tenant):
    """
    Test D: Simultaneous reservations from two independent database connections.
    Asserts: exactly one reservation succeeds and the other encounters UniqueViolation on uq_idempotency_scope.
    """
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]
    idem_key = f"key_simul_{uuid.uuid4()}"
    op_name = "simultaneous_reservation"
    payload = {"test": "concurrency"}
    p_hash = compute_payload_hash(payload, f"/api/{op_name}")
    expires = datetime.now(timezone.utc) + timedelta(hours=24)

    barrier = threading.Barrier(2)
    outcomes = []

    def attempt_reservation(worker_id):
        conn = get_new_db_connection()
        try:
            barrier.wait()
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO idempotency_records (
                        id, department_id, user_id, operation_name, idempotency_key,
                        payload_hash, status, expires_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, 'PENDING', %s
                    );
                """, (uuid.uuid4(), t_dept_id, user_id, op_name, idem_key, p_hash, expires))
            conn.commit()
            outcomes.append((worker_id, "SUCCESS"))
        except UniqueViolation:
            conn.rollback()
            outcomes.append((worker_id, "UNIQUE_VIOLATION"))
        finally:
            conn.close()

    t1 = threading.Thread(target=attempt_reservation, args=(1,))
    t2 = threading.Thread(target=attempt_reservation, args=(2,))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert len(outcomes) == 2
    status_list = [o[1] for o in outcomes]
    assert "SUCCESS" in status_list
    assert "UNIQUE_VIOLATION" in status_list
    print("Verified concurrent reservation uniqueness: 1 won reservation, 1 received UniqueViolation.")

def test_stale_pending_recovery(test_tenant):
    """
    Test E (Part 2): Stale PENDING records past safety window (e.g. crashed worker) do not permanently block retries.
    Asserts: maintenance/recovery query unlocks stale PENDING keys so retries succeed.
    """
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]
    idem_key = f"key_stale_{uuid.uuid4()}"
    op_name = "stale_pending_op"
    payload = {"info": "stale_data"}
    p_hash = compute_payload_hash(payload, f"/api/{op_name}")
    expires = datetime.now(timezone.utc) + timedelta(hours=24)

    conn = get_new_db_connection()
    try:
        # Step 1: Insert a stale PENDING record whose created_at was 10 minutes ago
        with conn.cursor() as cur:
            stale_id = uuid.uuid4()
            cur.execute("""
                INSERT INTO idempotency_records (
                    id, department_id, user_id, operation_name, idempotency_key,
                    payload_hash, status, created_at, expires_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 'PENDING', CURRENT_TIMESTAMP - INTERVAL '10 minutes', %s
                );
            """, (stale_id, t_dept_id, user_id, op_name, idem_key, p_hash, expires))
        conn.commit()

        # Step 2: Attempting to insert immediately would fail with UniqueViolation
        with pytest.raises(UniqueViolation):
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO idempotency_records (
                        id, department_id, user_id, operation_name, idempotency_key,
                        payload_hash, status, expires_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, 'PENDING', %s
                    );
                """, (uuid.uuid4(), t_dept_id, user_id, op_name, idem_key, p_hash, expires))
            conn.commit()
        conn.rollback()

        # Step 3: Run stale PENDING recovery (purges PENDING records older than 5 minutes)
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM idempotency_records
                WHERE status = 'PENDING'
                  AND created_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes';
            """)
            recovered_count = cur.rowcount
            assert recovered_count >= 1
        conn.commit()

        # Step 4: Now the retry succeeds and completes
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO idempotency_records (
                    id, department_id, user_id, operation_name, idempotency_key,
                    payload_hash, status, expires_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 'COMPLETED', %s
                );
            """, (uuid.uuid4(), t_dept_id, user_id, op_name, idem_key, p_hash, expires))
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("""
                SELECT status FROM idempotency_records
                WHERE department_id = %s AND idempotency_key = %s;
            """, (t_dept_id, idem_key))
            assert cur.fetchone()["status"] == "COMPLETED"

        print("Verified stale PENDING recovery: unblocks key and allows subsequent valid attempt to complete.")
    finally:
        conn.close()
