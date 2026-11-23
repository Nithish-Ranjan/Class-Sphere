"""
Test Suite 08: Administrative Audit Ledger & Cryptographic Chain Integrity.
Verifies SHA-256 sequential block hashing, advisory lock serialization,
and SQL privilege denial of UPDATE and DELETE for classsphere_app.

Test Isolation: Uses dedicated INST-TEST / TEST-DEPT.
Guarantees INST-DEMO genesis block remains completely untouched.
"""
import uuid
import hashlib
import json
import pytest
import psycopg
from psycopg.errors import InsufficientPrivilege

def compute_block_hash(prev_hash: str, payload_hash: str, block_idx: int) -> str:
    raw = f"{prev_hash}|{payload_hash}|{block_idx}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def test_audit_ledger_sequential_hash_chain(migrator_conn, test_tenant):
    """Appends consecutive ledger blocks under advisory lock and verifies SHA-256 chain integrity."""
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]

    with migrator_conn.cursor() as cur:
        # Acquire transactional advisory lock for this department
        lock_id = hash(f"audit_ledger_{t_dept_id}") & 0x7FFFFFFFFFFFFFFF
        cur.execute("SELECT pg_advisory_xact_lock(%s);", (lock_id,))

        # Create Genesis block for TEST-DEPT
        genesis_prev = "0000000000000000000000000000000000000000000000000000000000000000"
        genesis_payload = {"event": "Genesis Test Block", "term": "Fall 2026"}
        genesis_p_hash = hashlib.sha256(json.dumps(genesis_payload, sort_keys=True).encode("utf-8")).hexdigest()
        genesis_ledger_hash = compute_block_hash(genesis_prev, genesis_p_hash, 1)

        cur.execute("""
            INSERT INTO administrative_audit_ledger (
                department_id, endorsed_by_user_id, block_index,
                previous_hash, payload_hash, ledger_hash, report_metadata
            ) VALUES (
                %s, %s, 1, %s, %s, %s, %s
            );
        """, (t_dept_id, user_id, genesis_prev, genesis_p_hash, genesis_ledger_hash, json.dumps(genesis_payload)))

        # Append Block 2
        p2 = {"event": "Weekly Attendance Endorsement", "term": "Fall 2026", "endorser": "Test Engineer"}
        p2_hash = hashlib.sha256(json.dumps(p2, sort_keys=True).encode("utf-8")).hexdigest()
        block_2_hash = compute_block_hash(genesis_ledger_hash, p2_hash, 2)

        cur.execute("""
            INSERT INTO administrative_audit_ledger (
                department_id, endorsed_by_user_id, block_index,
                previous_hash, payload_hash, ledger_hash, report_metadata
            ) VALUES (
                %s, %s, 2, %s, %s, %s, %s
            );
        """, (t_dept_id, user_id, genesis_ledger_hash, p2_hash, block_2_hash, json.dumps(p2)))

        # Append Block 3
        p3 = {"event": "Classroom Capacity Audit", "verified_rooms": 2}
        p3_hash = hashlib.sha256(json.dumps(p3, sort_keys=True).encode("utf-8")).hexdigest()
        block_3_hash = compute_block_hash(block_2_hash, p3_hash, 3)

        cur.execute("""
            INSERT INTO administrative_audit_ledger (
                department_id, endorsed_by_user_id, block_index,
                previous_hash, payload_hash, ledger_hash, report_metadata
            ) VALUES (
                %s, %s, 3, %s, %s, %s, %s
            );
        """, (t_dept_id, user_id, block_2_hash, p3_hash, block_3_hash, json.dumps(p3)))

        # Verify chain integrity
        cur.execute("""
            SELECT block_index, previous_hash, payload_hash, ledger_hash
            FROM administrative_audit_ledger
            WHERE department_id = %s
            ORDER BY block_index ASC;
        """, (t_dept_id,))
        blocks = cur.fetchall()
        assert len(blocks) == 3
        for i in range(1, len(blocks)):
            prior = blocks[i - 1]
            curr = blocks[i]
            assert curr["previous_hash"] == prior["ledger_hash"], f"Broken hash chain between block {prior['block_index']} and {curr['block_index']}!"
            expected_hash = compute_block_hash(curr["previous_hash"], curr["payload_hash"], curr["block_index"])
            assert curr["ledger_hash"] == expected_hash, f"Hash mismatch at block {curr['block_index']}!"

        print(f"Verified cryptographic hash chain across {len(blocks)} consecutive audit ledger blocks.")

def test_application_role_denied_update_on_audit_ledger(app_conn, test_tenant):
    """Application role classsphere_app is denied UPDATE on administrative_audit_ledger."""
    t_inst_id = test_tenant["institution_id"]
    t_dept_id = test_tenant["department_id"]

    with app_conn.cursor() as cur:
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(t_inst_id),))
        cur.execute("SELECT set_config('app.current_department_id', %s, true);", (str(t_dept_id),))
        cur.execute("SELECT set_config('app.current_user_role', 'HOD', true);")

        with pytest.raises(InsufficientPrivilege) as excinfo:
            cur.execute("""
                UPDATE administrative_audit_ledger
                SET previous_hash = 'tampered_hash'
                WHERE department_id = %s;
            """, (str(t_dept_id),))
        assert "permission denied" in str(excinfo.value)
        assert excinfo.value.sqlstate == "42501"
        print("Verified privilege restriction: UPDATE denied on administrative_audit_ledger (SQLSTATE 42501).")

def test_application_role_denied_delete_on_audit_ledger(app_conn, test_tenant):
    """Application role classsphere_app is denied DELETE on administrative_audit_ledger."""
    t_inst_id = test_tenant["institution_id"]
    t_dept_id = test_tenant["department_id"]

    with app_conn.cursor() as cur:
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(t_inst_id),))
        cur.execute("SELECT set_config('app.current_department_id', %s, true);", (str(t_dept_id),))
        cur.execute("SELECT set_config('app.current_user_role', 'HOD', true);")

        with pytest.raises(InsufficientPrivilege) as excinfo:
            cur.execute("""
                DELETE FROM administrative_audit_ledger
                WHERE department_id = %s;
            """, (str(t_dept_id),))
        assert "permission denied" in str(excinfo.value)
        assert excinfo.value.sqlstate == "42501"
        print("Verified privilege restriction: DELETE denied on administrative_audit_ledger (SQLSTATE 42501).")

import threading
from psycopg.rows import dict_row
from app.core.config import settings

def get_new_migrator_connection():
    conn_str = f"host={settings.POSTGRES_SERVER} port={settings.POSTGRES_PORT} dbname={settings.POSTGRES_DB} user={settings.MIGRATOR_USER} password={settings.MIGRATOR_PASSWORD}"
    return psycopg.connect(conn_str, autocommit=False, row_factory=dict_row)

def verify_audit_ledger_chain(blocks: list) -> bool:
    """Verifies cryptographic linkage of an audit ledger block sequence."""
    if not blocks:
        return True
    first = blocks[0]
    expected_genesis_prev = "0000000000000000000000000000000000000000000000000000000000000000"
    if first["previous_hash"] != expected_genesis_prev:
        raise ValueError(f"Genesis block has invalid previous_hash: {first['previous_hash']}")
    if first["ledger_hash"] != compute_block_hash(first["previous_hash"], first["payload_hash"], first["block_index"]):
        raise ValueError(f"Genesis block hash mismatch at index {first['block_index']}")

    for i in range(1, len(blocks)):
        prior = blocks[i - 1]
        curr = blocks[i]
        if curr["previous_hash"] != prior["ledger_hash"]:
            raise ValueError(f"Broken hash link between block {prior['block_index']} and {curr['block_index']}")
        expected_hash = compute_block_hash(curr["previous_hash"], curr["payload_hash"], curr["block_index"])
        if curr["ledger_hash"] != expected_hash:
            raise ValueError(f"Tamper detected: calculated hash {expected_hash} != stored {curr['ledger_hash']} at block {curr['block_index']}")
    return True

def test_concurrent_independent_writers_hash_chain(test_tenant):
    """
    Test A: Concurrent independent writers appending to audit ledger using separate connections.
    Uses pg_advisory_xact_lock to serialize writes.
    Asserts: all transactions commit; all blocks form a strictly sequential unbroken hash chain.
    """
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]

    events = [
        {"event": "Periodic Attendance Audit", "actor": "Auditor 1"},
        {"event": "Faculty Workload Endorsement", "actor": "Auditor 2"},
        {"event": "Laboratory Resource Certification", "actor": "Auditor 3"},
    ]

    barrier = threading.Barrier(len(events))
    errors = []

    def writer_worker(idx, payload):
        conn = get_new_migrator_connection()
        try:
            barrier.wait()
            with conn.transaction():
                with conn.cursor() as cur:
                    # 1. Acquire transactional advisory lock for this department
                    cur.execute("SELECT pg_advisory_xact_lock(hashtext('audit_ledger_' || %s::text));", (str(t_dept_id),))

                    # 2. Query current chain head
                    cur.execute("""
                        SELECT block_index, ledger_hash
                        FROM administrative_audit_ledger
                        WHERE department_id = %s
                        ORDER BY block_index DESC
                        LIMIT 1;
                    """, (t_dept_id,))
                    head = cur.fetchone()

                    if head is None:
                        next_idx = 1
                        prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"
                    else:
                        next_idx = head["block_index"] + 1
                        prev_hash = head["ledger_hash"]

                    p_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
                    l_hash = compute_block_hash(prev_hash, p_hash, next_idx)

                    # 3. Append block
                    cur.execute("""
                        INSERT INTO administrative_audit_ledger (
                            id, department_id, endorsed_by_user_id, block_index,
                            previous_hash, payload_hash, ledger_hash, report_metadata
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s
                        );
                    """, (uuid.uuid4(), t_dept_id, user_id, next_idx, prev_hash, p_hash, l_hash, json.dumps(payload)))
        except Exception as e:
            errors.append((idx, e))
        finally:
            conn.close()

    threads = [threading.Thread(target=writer_worker, args=(i, ev)) for i, ev in enumerate(events)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors, f"Errors in concurrent writers: {errors}"

    # Verify that all blocks form a strictly unbroken sequential chain
    check_conn = get_new_migrator_connection()
    with check_conn.cursor() as cur:
        cur.execute("""
            SELECT block_index, previous_hash, payload_hash, ledger_hash, report_metadata
            FROM administrative_audit_ledger
            WHERE department_id = %s
            ORDER BY block_index ASC;
        """, (t_dept_id,))
        blocks = cur.fetchall()
        assert len(blocks) >= 3
        # Verify complete chain
        assert verify_audit_ledger_chain(blocks) is True
    check_conn.close()
    print(f"Verified concurrent independent writers: {len(blocks)} blocks successfully linked under advisory lock.")

def test_hash_recomputation_verification(test_tenant):
    """
    Test B: Comprehensive cryptographic recomputation of all stored audit ledger blocks.
    Asserts: sha256(previous_hash || payload_hash || block_index) matches ledger_hash exactly.
    """
    t_dept_id = test_tenant["department_id"]
    conn = get_new_migrator_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT block_index, previous_hash, payload_hash, ledger_hash, report_metadata
                FROM administrative_audit_ledger
                WHERE department_id = %s
                ORDER BY block_index ASC;
            """, (t_dept_id,))
            blocks = cur.fetchall()
            assert len(blocks) > 0, "Ledger must contain blocks to verify"

            for b in blocks:
                # 1. Recompute payload hash from report_metadata
                recomputed_payload_hash = hashlib.sha256(json.dumps(b["report_metadata"], sort_keys=True).encode("utf-8")).hexdigest()
                assert b["payload_hash"] == recomputed_payload_hash, f"Payload hash mismatch at block {b['block_index']}"

                # 2. Recompute block ledger hash
                expected_hash = compute_block_hash(b["previous_hash"], b["payload_hash"], b["block_index"])
                assert b["ledger_hash"] == expected_hash, f"Block hash mismatch at block {b['block_index']}"

            # 3. Verify linkage across whole chain
            assert verify_audit_ledger_chain(blocks) is True
        print(f"Verified hash recomputation: all {len(blocks)} blocks verified cryptographically.")
    finally:
        conn.close()

def test_failed_write_rollback_preserves_chain(test_tenant):
    """
    Test C: Simulated transaction failure during write rolls back cleanly without breaking the chain.
    Subsequent successful write links to the last committed valid head.
    """
    t_dept_id = test_tenant["department_id"]
    user_id = test_tenant["faculty_user_id"]
    conn = get_new_migrator_connection()
    try:
        # Phase 1: Failing transaction that rolls back
        try:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute("SELECT pg_advisory_xact_lock(hashtext('audit_ledger_' || %s::text));", (str(t_dept_id),))
                    cur.execute("SELECT block_index, ledger_hash FROM administrative_audit_ledger WHERE department_id = %s ORDER BY block_index DESC LIMIT 1;", (t_dept_id,))
                    head = cur.fetchone()
                    next_idx = head["block_index"] + 1
                    prev_hash = head["ledger_hash"]

                    payload = {"event": "Will Fail", "attempt": 1}
                    p_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
                    l_hash = compute_block_hash(prev_hash, p_hash, next_idx)

                    cur.execute("""
                        INSERT INTO administrative_audit_ledger (
                            id, department_id, endorsed_by_user_id, block_index,
                            previous_hash, payload_hash, ledger_hash, report_metadata
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s
                        );
                    """, (uuid.uuid4(), t_dept_id, user_id, next_idx, prev_hash, p_hash, l_hash, json.dumps(payload)))
                    raise RuntimeError("Simulated transaction failure mid-write")
        except RuntimeError:
            pass  # Expected rollback

        # Phase 2: Next valid write succeeds
        with conn.transaction():
            with conn.cursor() as cur:
                cur.execute("SELECT pg_advisory_xact_lock(hashtext('audit_ledger_' || %s::text));", (str(t_dept_id),))
                cur.execute("SELECT block_index, ledger_hash FROM administrative_audit_ledger WHERE department_id = %s ORDER BY block_index DESC LIMIT 1;", (t_dept_id,))
                head_after_rollback = cur.fetchone()
                assert head_after_rollback["block_index"] == head["block_index"], "Rolled back block index leaked!"
                assert head_after_rollback["ledger_hash"] == head["ledger_hash"], "Rolled back hash leaked!"

                next_idx = head_after_rollback["block_index"] + 1
                prev_hash = head_after_rollback["ledger_hash"]
                payload_ok = {"event": "Successful Subsequent Write", "attempt": 2}
                p_hash_ok = hashlib.sha256(json.dumps(payload_ok, sort_keys=True).encode("utf-8")).hexdigest()
                l_hash_ok = compute_block_hash(prev_hash, p_hash_ok, next_idx)

                cur.execute("""
                    INSERT INTO administrative_audit_ledger (
                        id, department_id, endorsed_by_user_id, block_index,
                        previous_hash, payload_hash, ledger_hash, report_metadata
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s
                    );
                """, (uuid.uuid4(), t_dept_id, user_id, next_idx, prev_hash, p_hash_ok, l_hash_ok, json.dumps(payload_ok)))

        # Phase 3: Verify the entire chain is valid and contiguous
        with conn.cursor() as cur:
            cur.execute("""
                SELECT block_index, previous_hash, payload_hash, ledger_hash, report_metadata
                FROM administrative_audit_ledger
                WHERE department_id = %s
                ORDER BY block_index ASC;
            """, (t_dept_id,))
            blocks = cur.fetchall()
            assert verify_audit_ledger_chain(blocks) is True

        print("Verified failed write rollback: no broken links, subsequent write linked seamlessly.")
    finally:
        conn.close()

def test_tamper_detection_demonstration(test_tenant):
    """
    Test D: Demonstrates that tampering with any block's payload or hash is immediately detected.
    Performs tamper simulation exclusively on test tenant records.
    """
    t_dept_id = test_tenant["department_id"]
    conn = get_new_migrator_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT block_index, previous_hash, payload_hash, ledger_hash, report_metadata
                FROM administrative_audit_ledger
                WHERE department_id = %s
                ORDER BY block_index ASC;
            """, (t_dept_id,))
            blocks = [dict(r) for r in cur.fetchall()]
            assert len(blocks) >= 2, "Need at least 2 blocks to demonstrate tamper detection"

        # Tamper with block 2's payload_hash in memory
        tampered_blocks = [dict(b) for b in blocks]
        tampered_blocks[1]["payload_hash"] = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

        with pytest.raises(ValueError) as excinfo:
            verify_audit_ledger_chain(tampered_blocks)
        assert "Tamper detected" in str(excinfo.value)
        print(f"Verified tamper detection (payload): caught with error '{excinfo.value}'.")

        # Tamper with block 2's previous_hash in memory
        tampered_blocks_2 = [dict(b) for b in blocks]
        tampered_blocks_2[1]["previous_hash"] = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

        with pytest.raises(ValueError) as excinfo:
            verify_audit_ledger_chain(tampered_blocks_2)
        assert "Broken hash link" in str(excinfo.value)
        print(f"Verified tamper detection (previous_hash): caught with error '{excinfo.value}'.")
    finally:
        conn.close()
