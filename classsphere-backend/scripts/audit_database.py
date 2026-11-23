"""
Independent Database Audit Script for ClassSphere Phase 6B.
Performs read-only inspection of schema, roles, extensions, RLS, triggers, and seed fixtures.
"""
import json
import psycopg
from psycopg.rows import dict_row

conn_str = "postgresql://postgres:postgres_dev_password@127.0.0.1:5434/classsphere"

audit_data = {}

with psycopg.connect(conn_str, row_factory=dict_row) as conn:
    with conn.cursor() as cur:
        # 1. Version & Server Version
        cur.execute("SELECT version();")
        audit_data["version"] = cur.fetchone()["version"]
        
        cur.execute("SHOW server_version;")
        audit_data["server_version"] = cur.fetchone()["server_version"]
        
        # 2. Installed Extensions
        cur.execute("SELECT extname, extversion FROM pg_extension ORDER BY extname;")
        audit_data["extensions"] = cur.fetchall()
        
        # 3. Roles and Privileges
        cur.execute("""
            SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolbypassrls
            FROM pg_roles
            WHERE rolname IN ('postgres', 'classsphere_migrator', 'classsphere_app')
            ORDER BY rolname;
        """)
        audit_data["roles"] = cur.fetchall()
        
        # 4. Canonical 26 Tables inspection
        canonical_tables = [
            # Domain 1
            "institutions", "departments", "users", "user_roles",
            # Domain 2
            "academic_batches", "sections", "student_profiles", "faculty_profiles",
            # Domain 3
            "classrooms", "subjects", "faculty_subject_allocations",
            # Domain 4
            "timetable_versions", "timetable_slots",
            # Domain 5
            "class_sessions", "attendance_sessions", "attendance_records", "attendance_verification_audits", "attendance_disputes",
            # Domain 6
            "activity_events",
            # Domain 7
            "alerts", "alert_transition_history", "sos_incidents", "sos_escalation_history",
            # Domain 8
            "administrative_audit_ledger", "notifications", "idempotency_records"
        ]
        
        cur.execute("""
            SELECT 
                c.relname as table_name,
                r.rolname as table_owner,
                c.relrowsecurity as rls_enabled,
                c.relforcerowsecurity as force_rls
            FROM pg_class c
            JOIN pg_roles r ON c.relowner = r.oid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'r'
            ORDER BY c.relname;
        """)
        db_tables = {row["table_name"]: row for row in cur.fetchall()}
        
        tables_audit = []
        for t in canonical_tables:
            exists = t in db_tables
            info = db_tables.get(t, {})
            # Row count
            row_count = None
            if exists:
                cur.execute(f"SELECT COUNT(*) as cnt FROM {t};")
                row_count = cur.fetchone()["cnt"]
            
            # Check permissions for classsphere_app
            app_privs = {}
            if exists:
                for priv in ["SELECT", "INSERT", "UPDATE", "DELETE"]:
                    cur.execute("SELECT has_table_privilege('classsphere_app', %s, %s) as has_priv;", (t, priv))
                    app_privs[priv] = cur.fetchone()["has_priv"]
            
            tables_audit.append({
                "table_name": t,
                "exists": exists,
                "owner": info.get("table_owner"),
                "rls_enabled": info.get("rls_enabled"),
                "force_rls": info.get("force_rls"),
                "row_count": row_count,
                "app_privileges": app_privs
            })
        audit_data["tables_audit"] = tables_audit
        
        # Check for any unexpected non-canonical tables
        cur.execute("""
            SELECT c.relname
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname != 'alembic_version'
            ORDER BY c.relname;
        """)
        all_public_tables = [r["relname"] for r in cur.fetchall()]
        unexpected = [t for t in all_public_tables if t not in canonical_tables]
        audit_data["unexpected_tables"] = unexpected
        audit_data["total_canonical_count"] = len(canonical_tables)
        audit_data["existing_canonical_count"] = sum(1 for t in tables_audit if t["exists"])
        
        # 5. Policies
        cur.execute("""
            SELECT 
                tablename,
                policyname,
                permissive,
                roles,
                cmd,
                qual,
                with_check
            FROM pg_policies
            WHERE schemaname = 'public'
            ORDER BY tablename, policyname;
        """)
        audit_data["policies"] = cur.fetchall()
        
        # 6. Triggers
        cur.execute("""
            SELECT 
                event_object_table as table_name,
                trigger_name,
                event_manipulation,
                action_timing,
                action_statement
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            ORDER BY event_object_table, trigger_name;
        """)
        audit_data["triggers"] = cur.fetchall()
        
        # 7. Demo Seed Figures
        cur.execute("""
            SELECT COUNT(*) as cnt 
            FROM student_profiles sp 
            JOIN users u ON sp.user_id = u.id 
            WHERE u.is_demo_fixture = true;
        """)
        unique_students = cur.fetchone()["cnt"]
        
        cur.execute("""
            SELECT sec.name as section_name, COUNT(sp.id) as cnt
            FROM student_profiles sp
            JOIN sections sec ON sp.section_id = sec.id
            GROUP BY sec.name
            ORDER BY sec.name;
        """)
        section_counts = {r["section_name"]: r["cnt"] for r in cur.fetchall()}
        
        cur.execute("SELECT COUNT(*) as cnt FROM timetable_slots;")
        slots_count = cur.fetchone()["cnt"]
        
        cur.execute("SELECT COUNT(*) as cnt FROM class_sessions WHERE is_demo_fixture = true;")
        sessions_count = cur.fetchone()["cnt"]
        
        cur.execute("""
            SELECT status, COUNT(*) as cnt
            FROM attendance_records
            GROUP BY status
            ORDER BY status;
        """)
        att_counts = {r["status"]: r["cnt"] for r in cur.fetchall()}
        total_instances = sum(att_counts.values())
        present_cnt = att_counts.get("PRESENT", 0)
        late_cnt = att_counts.get("LATE", 0)
        unverified_cnt = att_counts.get("UNVERIFIED", 0)
        present_rate = (present_cnt / total_instances * 100.0) if total_instances > 0 else 0.0
        
        cur.execute("""
            SELECT event_code, COUNT(*) as cnt
            FROM activity_events
            WHERE is_demo_fixture = true
            GROUP BY event_code
            ORDER BY event_code;
        """)
        telemetry_counts = {r["event_code"]: r["cnt"] for r in cur.fetchall()}
        total_events = sum(telemetry_counts.values())
        
        audit_data["demo_fixtures"] = {
            "unique_students": unique_students,
            "section_counts": section_counts,
            "slots_count": slots_count,
            "sessions_count": sessions_count,
            "attendance": {
                "total_instances": total_instances,
                "present": present_cnt,
                "late": late_cnt,
                "unverified": unverified_cnt,
                "present_rate_pct": round(present_rate, 1),
                "exact_present_rate": present_rate
            },
            "telemetry": {
                "total_events": total_events,
                "by_type": telemetry_counts
            }
        }
        
        # 8. Dispute Evidence check
        cur.execute("""
            SELECT id, status, student_reason, dispute_evidence_metadata
            FROM attendance_disputes;
        """)
        audit_data["disputes"] = cur.fetchall()
        
        # 9. Audit Ledger Hash Chain Check
        cur.execute("""
            SELECT block_index, previous_hash, payload_hash, ledger_hash, report_metadata
            FROM administrative_audit_ledger
            ORDER BY block_index ASC;
        """)
        audit_data["ledger_blocks"] = cur.fetchall()
        
        # 10. SOS Incident Check
        cur.execute("""
            SELECT id, incident_code, severity, status, external_handoff_at, external_dispatch_ref, external_agency_name
            FROM sos_incidents;
        """)
        audit_data["sos_incidents"] = cur.fetchall()

with open("audit_results.json", "w", encoding="utf-8") as f:
    json.dump(audit_data, f, indent=2, default=str)

print("AUDIT EXECUTION COMPLETE. Written to audit_results.json")
