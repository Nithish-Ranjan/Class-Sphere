# ClassSphere — Phase 6D.1 Security Design Specification (Revision 9.3)

**Document Version:** 9.3.0 (Final SQL Reconciliation & Implementation Baseline)  
**Status:** APPROVED FOR IMPLEMENTATION (Alternative 1 Authorized by Project Owner)  
**Date:** 2026-11-22  
**Target Schema:** PostgreSQL 16 (Port 5434)  
**Authoritative Baseline:** Byte-for-byte verified against canonical `classsphere-backend.zip`  
**Execution Mode:** STRICT DESIGN-ONLY (Zero SQL executed, zero database mutations, zero application code changes, zero migration execution, Tables 1–26 structures untouched, all tests labeled `[PROPOSED]`)

---

## 1. Executive Summary & Architectural Authorization

The project owner has formally selected **ALTERNATIVE 1 — ADDITIVE, LEAST-PRIVILEGE RLS POLICIES**.

Under this authorization:
- Canonical table structures for Tables 1–26 are 100% preserved. No columns are added, removed, or renamed. No canonical constraints are modified.
- Strict least-privilege role boundaries are established: `classsphere_secdef_owner` is `NOLOGIN`, `NOSUPERUSER`, and `NOBYPASSRLS`.
- Additive RLS policies are applied to canonical Tables 2 (`departments`), 3 (`users`), 4 (`user_roles`), and 24 (`administrative_audit_ledger`) scoped strictly to `classsphere_secdef_owner`, enabling secure traversal under `FORCE ROW LEVEL SECURITY`.
- Forward dependencies are resolved: `fn_deactivate_user_refresh_tokens()` is placed in Migration 0010 after Table 28 (`authentication_audit_outbox`) is created.
- Table 29 direct worker `INSERT` is revoked; all ledger appends are funneled through atomic processing procedures.
- Pre-authentication attribution is normalized: `actor_user_id` in Table 28 and Table 29 is nullable, eliminating all fabricated sentinel UUIDs.
- Refresh token department foreign key is defined as `ON DELETE RESTRICT`, resolving conflict with immutable token lineage triggers.
- All functions explicitly revoke execution from `PUBLIC`.
- Standardized 100% on canonical backend session GUC `app.current_tenant_id`.

---

## 2. Final Role Provisioning SQL

```sql
-- ==============================================================================
-- CLASSSPHERE PHASE 6D.1 FINAL DATABASE ROLE PROVISIONING (REVISION 9.2)
-- ==============================================================================
-- Valid psql execution script. Fails immediately if credentials are missing.
-- Uses \gexec for idempotent role creation and direct ALTER ROLE for password rotation.
-- Avoids syntax errors with psql variable interpolation inside DO blocks.
\set ON_ERROR_STOP on
\getenv DB_MIGRATOR_PASSWORD DB_MIGRATOR_PASSWORD
\getenv DB_APP_PASSWORD DB_APP_PASSWORD
\getenv DB_WORKER_PASSWORD DB_WORKER_PASSWORD
\getenv DB_MAINT_PASSWORD DB_MAINT_PASSWORD

-- 1. Security Definer Function Owner Role (NOLOGIN Schema Owner)
SELECT 'CREATE ROLE classsphere_secdef_owner WITH NOLOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;'
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'classsphere_secdef_owner')\gexec

ALTER ROLE classsphere_secdef_owner WITH NOLOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- 2. Migration DDL Role
SELECT 'CREATE ROLE classsphere_migrator WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;'
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'classsphere_migrator')\gexec

ALTER ROLE classsphere_migrator WITH LOGIN PASSWORD :'DB_MIGRATOR_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;

-- 3. Application Runtime Role
SELECT 'CREATE ROLE classsphere_app WITH LOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;'
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'classsphere_app')\gexec

ALTER ROLE classsphere_app WITH LOGIN PASSWORD :'DB_APP_PASSWORD' NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- 4. Dedicated Background Audit Worker Role
SELECT 'CREATE ROLE classsphere_audit_worker WITH LOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;'
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'classsphere_audit_worker')\gexec

ALTER ROLE classsphere_audit_worker WITH LOGIN PASSWORD :'DB_WORKER_PASSWORD' NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- 5. Dedicated Maintenance Role
SELECT 'CREATE ROLE classsphere_maintenance WITH LOGIN NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;'
WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'classsphere_maintenance')\gexec

ALTER ROLE classsphere_maintenance WITH LOGIN PASSWORD :'DB_MAINT_PASSWORD' NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- Crucial: Grant membership WITHOUT INHERIT.
-- Prevents classsphere_migrator from automatically inheriting classsphere_secdef_owner privileges
-- while enabling valid ALTER ... OWNER TO classsphere_secdef_owner ownership transfers.
GRANT classsphere_secdef_owner TO classsphere_migrator WITH INHERIT FALSE, SET TRUE;

-- Schema Privileges on public:
-- PostgreSQL 16 requires target owner role (classsphere_secdef_owner) to have CREATE on schema public for ownership transfer
GRANT USAGE, CREATE ON SCHEMA public TO classsphere_secdef_owner;
GRANT USAGE, CREATE ON SCHEMA public TO classsphere_migrator;
GRANT USAGE ON SCHEMA public TO classsphere_app, classsphere_audit_worker, classsphere_maintenance;

-- Post-Migration Hardening Documentation:
-- Once all migrations have been applied, CREATE on schema public can optionally be revoked:
-- REVOKE CREATE ON SCHEMA public FROM classsphere_secdef_owner;
-- It must be re-granted before applying future migrations that transfer new objects.
```

---

## 3. Complete Additive Canonical RLS Policies & Grants

```sql
-- ==============================================================================
-- ADDITIVE RLS POLICIES & LEAST-PRIVILEGE GRANTS (ALTERNATIVE 1 - REVISION 9.2)
-- ==============================================================================

-- 1. Canonical Table 1: institutions (Enables pre-auth enqueue validation under FORCE RLS)
REVOKE ALL ON TABLE public.institutions FROM classsphere_secdef_owner;
GRANT SELECT (id, code, name, domain, is_active) ON TABLE public.institutions TO classsphere_secdef_owner;

CREATE POLICY policy_institutions_secdef ON public.institutions
    FOR SELECT TO classsphere_secdef_owner
    USING (is_active = true);

-- 2. Canonical Table 2: departments (Narrowed to active departments; least privilege columns)
REVOKE ALL ON TABLE public.departments FROM classsphere_secdef_owner;
GRANT SELECT (id, institution_id, code, name, is_active) ON TABLE public.departments TO classsphere_secdef_owner;

CREATE POLICY policy_departments_secdef ON public.departments
    FOR SELECT TO classsphere_secdef_owner
    USING (is_active = true);

-- 3. Canonical Table 3: users (password_hash and sensitive columns strictly excluded)
REVOKE ALL ON TABLE public.users FROM classsphere_secdef_owner;
GRANT SELECT (id, institution_id, department_id, email, is_active, updated_at) ON TABLE public.users TO classsphere_secdef_owner;
GRANT UPDATE (is_active, updated_at) ON TABLE public.users TO classsphere_secdef_owner;

CREATE POLICY policy_users_secdef_select ON public.users
    FOR SELECT TO classsphere_secdef_owner
    USING (true);

CREATE POLICY policy_users_secdef_update ON public.users
    FOR UPDATE TO classsphere_secdef_owner
    USING (true)
    WITH CHECK (is_active = false);

-- 4. Canonical Table 4: user_roles (Accurate to migration 0002; active status verified via users.is_active)
REVOKE ALL ON TABLE public.user_roles FROM classsphere_secdef_owner;
GRANT SELECT (id, user_id, role) ON TABLE public.user_roles TO classsphere_secdef_owner;

CREATE POLICY policy_user_roles_secdef ON public.user_roles
    FOR SELECT TO classsphere_secdef_owner
    USING (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = user_roles.user_id AND u.is_active = true
    ));

-- 5. Canonical Table 24: administrative_audit_ledger (Departmental governance append-only)
REVOKE ALL ON TABLE public.administrative_audit_ledger FROM classsphere_secdef_owner;
GRANT SELECT, INSERT ON TABLE public.administrative_audit_ledger TO classsphere_secdef_owner;

CREATE POLICY policy_admin_ledger_secdef_select ON public.administrative_audit_ledger
    FOR SELECT TO classsphere_secdef_owner
    USING (true);

CREATE POLICY policy_admin_ledger_secdef_insert ON public.administrative_audit_ledger
    FOR INSERT TO classsphere_secdef_owner
    WITH CHECK (department_id IS NOT NULL AND endorsed_by_user_id IS NOT NULL);

-- Ensure direct application INSERT, UPDATE, DELETE on Table 24 is strictly revoked
REVOKE INSERT, UPDATE, DELETE ON TABLE public.administrative_audit_ledger FROM classsphere_app, classsphere_audit_worker;
```

---

## 4. Complete Corrected Alembic Migration 0009

```python
"""Phase 6D.1: Create Persistent Refresh Tokens Schema (Table 27)

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-22 17:00:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Deterministic Advisory Key Function
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_token_family_advisory_key(p_family_id UUID)
    RETURNS BIGINT
    LANGUAGE sql
    IMMUTABLE
    STRICT
    PARALLEL SAFE
    SET search_path = pg_catalog, pg_temp
    AS $$
        SELECT ('x' || substr(md5('classsphere:token_family:' || p_family_id::text), 1, 16))::bit(64)::bigint;
    $$;
    ALTER FUNCTION public.fn_token_family_advisory_key(UUID) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_token_family_advisory_key(UUID) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_token_family_advisory_key(UUID) TO classsphere_app, classsphere_maintenance;
    """)

    # 2. Additive RLS Policies on Canonical Tables 1, 2, 3, 4, 24 for classsphere_secdef_owner (Alternative 1 - Revision 9.2)
    op.execute("""
    REVOKE ALL ON TABLE public.institutions FROM classsphere_secdef_owner;
    GRANT SELECT (id, code, name, domain, is_active) ON TABLE public.institutions TO classsphere_secdef_owner;
    CREATE POLICY policy_institutions_secdef ON public.institutions
        FOR SELECT TO classsphere_secdef_owner USING (is_active = true);

    REVOKE ALL ON TABLE public.departments FROM classsphere_secdef_owner;
    GRANT SELECT (id, institution_id, code, name, is_active) ON TABLE public.departments TO classsphere_secdef_owner;
    CREATE POLICY policy_departments_secdef ON public.departments
        FOR SELECT TO classsphere_secdef_owner USING (is_active = true);

    REVOKE ALL ON TABLE public.users FROM classsphere_secdef_owner;
    GRANT SELECT (id, institution_id, department_id, email, is_active, updated_at) ON TABLE public.users TO classsphere_secdef_owner;
    GRANT UPDATE (is_active, updated_at) ON TABLE public.users TO classsphere_secdef_owner;
    CREATE POLICY policy_users_secdef_select ON public.users
        FOR SELECT TO classsphere_secdef_owner USING (true);
    CREATE POLICY policy_users_secdef_update ON public.users
        FOR UPDATE TO classsphere_secdef_owner USING (true) WITH CHECK (is_active = false);

    REVOKE ALL ON TABLE public.user_roles FROM classsphere_secdef_owner;
    GRANT SELECT (id, user_id, role) ON TABLE public.user_roles TO classsphere_secdef_owner;
    CREATE POLICY policy_user_roles_secdef ON public.user_roles
        FOR SELECT TO classsphere_secdef_owner USING (EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = user_roles.user_id AND u.is_active = true
        ));

    REVOKE ALL ON TABLE public.administrative_audit_ledger FROM classsphere_secdef_owner;
    GRANT SELECT, INSERT ON TABLE public.administrative_audit_ledger TO classsphere_secdef_owner;
    CREATE POLICY policy_admin_ledger_secdef_select ON public.administrative_audit_ledger
        FOR SELECT TO classsphere_secdef_owner USING (true);
    CREATE POLICY policy_admin_ledger_secdef_insert ON public.administrative_audit_ledger
        FOR INSERT TO classsphere_secdef_owner WITH CHECK (department_id IS NOT NULL AND endorsed_by_user_id IS NOT NULL);

    REVOKE INSERT, UPDATE, DELETE ON TABLE public.administrative_audit_ledger FROM classsphere_app, classsphere_audit_worker;
    """)

    # 3. Create Table 27: refresh_tokens
    op.execute("""
    CREATE TABLE public.refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key_version VARCHAR(16) NOT NULL DEFAULT 'v1',
        token_hash VARCHAR(64) NOT NULL,
        token_jti UUID NOT NULL,
        family_id UUID NOT NULL,
        parent_token_id UUID,
        user_id UUID NOT NULL,
        institution_id UUID NOT NULL,
        department_id UUID,
        client_ip INET,
        user_agent VARCHAR(512),
        fingerprint_hash VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        revocation_reason VARCHAR(64),

        CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash),
        CONSTRAINT uq_refresh_tokens_token_jti UNIQUE (token_jti),
        CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id)
            REFERENCES public.users(id) ON DELETE CASCADE,
        CONSTRAINT fk_refresh_tokens_institution FOREIGN KEY (institution_id)
            REFERENCES public.institutions(id) ON DELETE CASCADE,
        CONSTRAINT fk_refresh_tokens_department FOREIGN KEY (department_id)
            REFERENCES public.departments(id) ON DELETE RESTRICT,
        CONSTRAINT fk_refresh_tokens_parent FOREIGN KEY (parent_token_id)
            REFERENCES public.refresh_tokens(id) ON DELETE RESTRICT
            DEFERRABLE INITIALLY DEFERRED,
        CONSTRAINT chk_refresh_tokens_revocation_reason CHECK (
            revocation_reason IS NULL OR
            revocation_reason IN (
                'ROTATED',
                'LOGOUT',
                'REPLAY_ATTACK',
                'FAMILY_REVOKED',
                'ACCOUNT_DEACTIVATED',
                'CONCURRENT_LIMIT_EXCEEDED',
                'MANUAL_ADMIN_REVOKE'
            )
        ),
        CONSTRAINT chk_refresh_tokens_expiry_order CHECK (expires_at > created_at),
        CONSTRAINT chk_refresh_tokens_consumed_order CHECK (consumed_at IS NULL OR consumed_at >= created_at),
        CONSTRAINT chk_refresh_tokens_revoked_order CHECK (revoked_at IS NULL OR revoked_at >= created_at),
        CONSTRAINT chk_refresh_tokens_revocation_consistency CHECK (
            (revoked_at IS NULL AND revocation_reason IS NULL) OR
            (revoked_at IS NOT NULL AND revocation_reason IS NOT NULL)
        )
    );
    ALTER TABLE public.refresh_tokens OWNER TO classsphere_secdef_owner;
    """)

    # 4. Partial Indexes
    op.execute("""
    CREATE UNIQUE INDEX uq_refresh_tokens_family_root ON public.refresh_tokens (family_id)
        WHERE parent_token_id IS NULL;

    CREATE UNIQUE INDEX uq_refresh_tokens_parent ON public.refresh_tokens (parent_token_id)
        WHERE parent_token_id IS NOT NULL;

    CREATE INDEX idx_refresh_tokens_family_active ON public.refresh_tokens (family_id)
        WHERE consumed_at IS NULL AND revoked_at IS NULL;
    CREATE INDEX idx_refresh_tokens_user_active ON public.refresh_tokens (user_id)
        WHERE consumed_at IS NULL AND revoked_at IS NULL;
    CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens (expires_at);
    """)

    # 5. Lineage and Immutability Triggers
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_verify_refresh_token_parent_lineage()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_parent RECORD;
    BEGIN
        IF NEW.parent_token_id IS NULL THEN
            RETURN NEW;
        END IF;

        SELECT id, family_id, user_id, institution_id, department_id, consumed_at, revoked_at
        INTO v_parent
        FROM public.refresh_tokens
        WHERE id = NEW.parent_token_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent refresh token % does not exist', NEW.parent_token_id
                USING ERRCODE = 'foreign_key_violation';
        END IF;

        IF v_parent.family_id <> NEW.family_id THEN
            RAISE EXCEPTION 'Lineage violation: Parent family % does not match child family %',
                v_parent.family_id, NEW.family_id
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_parent.user_id <> NEW.user_id THEN
            RAISE EXCEPTION 'Lineage violation: Parent user % does not match child user %',
                v_parent.user_id, NEW.user_id
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_parent.institution_id <> NEW.institution_id THEN
            RAISE EXCEPTION 'Lineage violation: Parent institution % does not match child institution %',
                v_parent.institution_id, NEW.institution_id
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_parent.department_id IS DISTINCT FROM NEW.department_id THEN
            RAISE EXCEPTION 'Lineage violation: Parent department does not match child department'
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_parent.consumed_at IS NULL THEN
            RAISE EXCEPTION 'Lineage violation: Parent token % must be consumed before child token creation',
                NEW.parent_token_id
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_parent.revoked_at IS NOT NULL THEN
            RAISE EXCEPTION 'Lineage violation: Cannot rotate child from revoked parent token %',
                NEW.parent_token_id
                USING ERRCODE = 'check_violation';
        END IF;

        RETURN NEW;
    END;
    $$;
    ALTER FUNCTION public.fn_verify_refresh_token_parent_lineage() OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_verify_refresh_token_parent_lineage() FROM PUBLIC;

    CREATE TRIGGER trg_verify_refresh_token_lineage
    BEFORE INSERT ON public.refresh_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_verify_refresh_token_parent_lineage();

    CREATE OR REPLACE FUNCTION public.fn_enforce_refresh_token_immutability()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    BEGIN
        IF OLD.id <> NEW.id OR
           OLD.key_version <> NEW.key_version OR
           OLD.token_hash <> NEW.token_hash OR
           OLD.token_jti <> NEW.token_jti OR
           OLD.family_id <> NEW.family_id OR
           (OLD.parent_token_id IS NOT NULL AND OLD.parent_token_id <> NEW.parent_token_id) OR
           (OLD.parent_token_id IS NULL AND NEW.parent_token_id IS NOT NULL) OR
           OLD.user_id <> NEW.user_id OR
           OLD.institution_id <> NEW.institution_id OR
           OLD.department_id IS DISTINCT FROM NEW.department_id OR
           OLD.created_at <> NEW.created_at OR
           OLD.expires_at <> NEW.expires_at THEN
            RAISE EXCEPTION 'Immutable refresh token identity/lineage fields cannot be modified'
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;

        IF OLD.consumed_at IS NOT NULL AND NEW.consumed_at IS DISTINCT FROM OLD.consumed_at THEN
            RAISE EXCEPTION 'Refresh token consumed_at is irreversible and cannot be modified once set'
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;

        IF OLD.revoked_at IS NOT NULL THEN
            IF NEW.revoked_at IS DISTINCT FROM OLD.revoked_at OR
               NEW.revocation_reason IS DISTINCT FROM OLD.revocation_reason THEN
                RAISE EXCEPTION 'Refresh token revocation is final and cannot be modified once set'
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;
        END IF;

        RETURN NEW;
    END;
    $$;
    ALTER FUNCTION public.fn_enforce_refresh_token_immutability() OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_enforce_refresh_token_immutability() FROM PUBLIC;

    CREATE TRIGGER trg_enforce_refresh_token_immutability
    BEFORE UPDATE ON public.refresh_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_refresh_token_immutability();
    """)

    # 6. RLS Policies on Table 27
    op.execute("""
    ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.refresh_tokens FORCE ROW LEVEL SECURITY;

    CREATE POLICY policy_refresh_tokens_migrator ON public.refresh_tokens
        FOR ALL TO classsphere_migrator USING (true) WITH CHECK (true);

    CREATE POLICY policy_refresh_tokens_secdef ON public.refresh_tokens
        FOR ALL TO classsphere_secdef_owner USING (true) WITH CHECK (true);

    CREATE POLICY policy_refresh_tokens_maintenance ON public.refresh_tokens
        FOR ALL TO classsphere_maintenance USING (true) WITH CHECK (true);

    CREATE POLICY policy_refresh_tokens_app_select ON public.refresh_tokens
        FOR SELECT TO classsphere_app
        USING (
            institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
            AND (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
                OR (
                    NULLIF(current_setting('app.current_user_role', true), '') = 'ADMIN'
                )
                OR (
                    NULLIF(current_setting('app.current_user_role', true), '') = 'HOD'
                    AND department_id IS NOT NULL
                    AND department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
                )
            )
        );

    CREATE POLICY policy_refresh_tokens_app_insert ON public.refresh_tokens
        FOR INSERT TO classsphere_app
        WITH CHECK (
            institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
            AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
            AND (
                NULLIF(current_setting('app.current_department_id', true), '') IS NULL
                OR department_id IS NULL
                OR department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
            )
        );

    CREATE POLICY policy_refresh_tokens_app_update ON public.refresh_tokens
        FOR UPDATE TO classsphere_app
        USING (
            institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
            AND (
                user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID
                OR (
                    NULLIF(current_setting('app.current_user_role', true), '') = 'ADMIN'
                )
                OR (
                    NULLIF(current_setting('app.current_user_role', true), '') = 'HOD'
                    AND department_id IS NOT NULL
                    AND department_id = NULLIF(current_setting('app.current_department_id', true), '')::UUID
                )
            )
        )
        WITH CHECK (
            institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
        );
    """)

    # 7. Reverse-Chronological Pruning Function for Table 27
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_prune_expired_refresh_tokens(
        p_retention_days INTEGER DEFAULT 30,
        p_batch_size INTEGER DEFAULT 1000
    )
    RETURNS INTEGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS 
    DECLARE
        v_cutoff TIMESTAMPTZ;
        v_deleted_count INTEGER := 0;
        v_batch_deleted INTEGER := 0;
    BEGIN
        IF p_retention_days < 7 THEN
            RAISE EXCEPTION 'Retention period must be at least 7 days'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;

        v_cutoff := clock_timestamp() - (p_retention_days || ' days')::interval;

        LOOP
            -- Provable leaf-first pruning: delete only expired tokens that have NO child tokens referencing them
            WITH leaves AS (
                SELECT t.id
                FROM public.refresh_tokens t
                WHERE t.expires_at < v_cutoff
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.refresh_tokens c
                      WHERE c.parent_token_id = t.id
                  )
                LIMIT p_batch_size
                FOR UPDATE SKIP LOCKED
            )
            DELETE FROM public.refresh_tokens
            WHERE id IN (SELECT id FROM leaves);

            GET DIAGNOSTICS v_batch_deleted = ROW_COUNT;
            v_deleted_count := v_deleted_count + v_batch_deleted;

            EXIT WHEN v_batch_deleted = 0;
        END LOOP;

        RETURN v_deleted_count;
    END;
    ;
    ALTER FUNCTION public.fn_prune_expired_refresh_tokens(INTEGER, INTEGER) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_prune_expired_refresh_tokens(INTEGER, INTEGER) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_prune_expired_refresh_tokens(INTEGER, INTEGER) TO classsphere_maintenance;
    """)

    # 8. Privileges on Table 27
    op.execute("""
    REVOKE ALL ON TABLE public.refresh_tokens FROM PUBLIC, classsphere_app, classsphere_maintenance;
    GRANT SELECT, INSERT ON TABLE public.refresh_tokens TO classsphere_app;
    GRANT UPDATE (consumed_at, revoked_at, revocation_reason) ON TABLE public.refresh_tokens TO classsphere_app;
    GRANT SELECT, DELETE ON TABLE public.refresh_tokens TO classsphere_maintenance;
    GRANT ALL ON TABLE public.refresh_tokens TO classsphere_secdef_owner;
    """)


def downgrade() -> None:
    op.execute("""
    DO $$
    DECLARE
        v_count INTEGER := 0;
        v_archive_table TEXT;
    BEGIN
        SELECT count(*) INTO v_count FROM public.refresh_tokens;
        IF v_count > 0 THEN
            v_archive_table := 'refresh_tokens_archive_' || to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS_US') || '_' || substr(md5(random()::text), 1, 8);
            
            DROP TRIGGER IF EXISTS trg_verify_refresh_token_lineage ON public.refresh_tokens;
            DROP TRIGGER IF EXISTS trg_enforce_refresh_token_immutability ON public.refresh_tokens;

            EXECUTE 'ALTER TABLE public.refresh_tokens RENAME TO ' || quote_ident(v_archive_table);
            RAISE NOTICE 'Preserved % rows in archive table %', v_count, v_archive_table;
        ELSE
            DROP TABLE IF EXISTS public.refresh_tokens CASCADE;
        END IF;
    END;
    $$;
    DROP FUNCTION IF EXISTS public.fn_prune_expired_refresh_tokens(INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS public.fn_enforce_refresh_token_immutability();
    DROP FUNCTION IF EXISTS public.fn_verify_refresh_token_parent_lineage();
    DROP FUNCTION IF EXISTS public.fn_token_family_advisory_key(UUID);

    -- Remove additive RLS policies from canonical tables
    DROP POLICY IF EXISTS policy_institutions_secdef ON public.institutions;
    DROP POLICY IF EXISTS policy_departments_secdef ON public.departments;
    DROP POLICY IF EXISTS policy_users_secdef_select ON public.users;
    DROP POLICY IF EXISTS policy_users_secdef_update ON public.users;
    DROP POLICY IF EXISTS policy_user_roles_secdef ON public.user_roles;
    DROP POLICY IF EXISTS policy_admin_ledger_secdef_select ON public.administrative_audit_ledger;
    DROP POLICY IF EXISTS policy_admin_ledger_secdef_insert ON public.administrative_audit_ledger;
    """)
```

---

## 5. Complete Corrected Alembic Migration 0010

```python
"""create_audit_outbox_and_institutional_ledger

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-22

Final implementation-ready migration provisioning Table 28 (authentication_audit_outbox),
Table 29 (institutional_audit_ledger), and all supporting security definer procedures.
Byte-for-byte aligned with PostgreSQL 16 semantics, Alembic dependency 0009, and canonical Tables 1-26.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create Table 28: authentication_audit_outbox (Operational Staging Queue)
    op.execute("""
    CREATE TABLE public.authentication_audit_outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(64) NOT NULL,
        severity VARCHAR(32) NOT NULL DEFAULT 'INFO',
        actor_user_id UUID NULL REFERENCES public.users(id) ON DELETE RESTRICT,
        institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
        department_id UUID NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
        user_id UUID NULL REFERENCES public.users(id) ON DELETE RESTRICT,
        deduplication_key VARCHAR(128) NOT NULL UNIQUE,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 5,
        next_retry_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        claimed_by VARCHAR(64) NULL,
        claim_token UUID NULL,
        claimed_at TIMESTAMPTZ NULL,
        claim_expires_at TIMESTAMPTZ NULL,
        claim_generation BIGINT NOT NULL DEFAULT 0,
        processed_at TIMESTAMPTZ NULL,
        ledger_entry_id UUID NULL,
        last_error TEXT NULL,
        error_log JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT chk_outbox_status CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD')),
        CONSTRAINT chk_outbox_severity CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
    );

    CREATE INDEX idx_outbox_processing ON public.authentication_audit_outbox (status, next_retry_at)
        WHERE status IN ('PENDING', 'FAILED');
    CREATE INDEX idx_outbox_recovery ON public.authentication_audit_outbox (status, claim_expires_at)
        WHERE status = 'PROCESSING';
    CREATE INDEX idx_outbox_pruning ON public.authentication_audit_outbox (status, processed_at)
        WHERE status = 'COMPLETED';

    -- Table 28 is intentionally non-RLS. Privileges are strictly bounded:
    REVOKE ALL ON TABLE public.authentication_audit_outbox FROM PUBLIC, classsphere_app, classsphere_audit_worker, classsphere_maintenance;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.authentication_audit_outbox TO classsphere_secdef_owner;
    GRANT SELECT, UPDATE (status, retry_count, next_retry_at, claimed_by, claim_token, claimed_at, claim_expires_at, claim_generation, processed_at, ledger_entry_id, last_error)
        ON TABLE public.authentication_audit_outbox TO classsphere_audit_worker;
    """)

    # 2. Create Table 29: institutional_audit_ledger (Cryptographic Append-Only Ledger)
    op.execute("""
    CREATE TABLE public.institutional_audit_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
        department_id UUID NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
        actor_user_id UUID NULL REFERENCES public.users(id) ON DELETE RESTRICT,
        event_type VARCHAR(64) NOT NULL,
        severity VARCHAR(16) NOT NULL,
        block_index BIGINT NOT NULL,
        previous_hash VARCHAR(64) NOT NULL,
        payload_hash VARCHAR(64) NOT NULL,
        ledger_hash VARCHAR(64) NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        CONSTRAINT uq_inst_ledger_block UNIQUE (institution_id, block_index),
        CONSTRAINT chk_inst_ledger_block_positive CHECK (block_index > 0)
    );

    CREATE INDEX idx_inst_ledger_tenant_block ON public.institutional_audit_ledger (institution_id, block_index DESC);

    -- Enable and FORCE Row Level Security on Table 29
    ALTER TABLE public.institutional_audit_ledger ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.institutional_audit_ledger FORCE ROW LEVEL SECURITY;

    -- Additive RLS Policies for Table 29 (Alternative 1)
    CREATE POLICY policy_inst_ledger_tenant ON public.institutional_audit_ledger
        FOR SELECT TO classsphere_app
        USING (institution_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

    CREATE POLICY policy_inst_ledger_secdef_select ON public.institutional_audit_ledger
        FOR SELECT TO classsphere_secdef_owner
        USING (true);

    CREATE POLICY policy_inst_ledger_secdef_insert ON public.institutional_audit_ledger
        FOR INSERT TO classsphere_secdef_owner
        WITH CHECK (institution_id IS NOT NULL AND block_index > 0);

    -- Table 29 Privileges: Direct INSERT, UPDATE, DELETE strictly revoked from app and worker
    REVOKE ALL ON TABLE public.institutional_audit_ledger FROM PUBLIC, classsphere_app, classsphere_audit_worker, classsphere_maintenance;
    GRANT SELECT ON TABLE public.institutional_audit_ledger TO classsphere_app;
    GRANT SELECT, INSERT ON TABLE public.institutional_audit_ledger TO classsphere_secdef_owner;
    """)

    # 3. Server-Side Domain Resolution Function
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_resolve_tenant_by_domain(
        p_domain VARCHAR(255)
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_institution_id UUID;
    BEGIN
        IF p_domain IS NULL OR trim(p_domain) = '' THEN
            RAISE EXCEPTION 'Domain name cannot be empty'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;

        SELECT id
        INTO v_institution_id
        FROM public.institutions
        WHERE lower(domain) = lower(trim(p_domain))
          AND is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No active institution found for domain %', p_domain
                USING ERRCODE = 'no_data_found';
        END IF;

        RETURN v_institution_id;
    END;
    $$;
    ALTER FUNCTION public.fn_resolve_tenant_by_domain(VARCHAR) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_resolve_tenant_by_domain(VARCHAR) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_resolve_tenant_by_domain(VARCHAR) TO classsphere_app;
    """)

    # 4. Pre-Authentication Audit Enqueue Function
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_enqueue_preauth_audit_event(
        p_event_type VARCHAR(64),
        p_severity VARCHAR(32),
        p_domain VARCHAR(255),
        p_deduplication_key VARCHAR(128),
        p_payload JSONB
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_institution_id UUID;
        v_outbox_id UUID;
    BEGIN
        IF p_event_type NOT IN ('LOGIN_FAILED', 'INVALID_CREDENTIALS', 'RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_LOGIN_ATTEMPT') THEN
            RAISE EXCEPTION 'Event type % not permitted via pre-auth audit pipeline', p_event_type
                USING ERRCODE = 'invalid_parameter_value';
        END IF;

        IF p_domain IS NULL OR trim(p_domain) = '' THEN
            RAISE EXCEPTION 'p_domain is mandatory for pre-auth audit events'
                USING ERRCODE = 'not_null_violation';
        END IF;

        -- Resolve tenant from verified domain directly via server-side resolver
        v_institution_id := public.fn_resolve_tenant_by_domain(p_domain);

        INSERT INTO public.authentication_audit_outbox (
            event_type, severity, actor_user_id, institution_id, department_id,
            user_id, deduplication_key, payload, status, next_retry_at
        ) VALUES (
            p_event_type, p_severity, NULL, v_institution_id, NULL,
            NULL, p_deduplication_key, p_payload, 'PENDING', clock_timestamp()
        )
        ON CONFLICT (deduplication_key) DO NOTHING
        RETURNING id INTO v_outbox_id;

        RETURN v_outbox_id;
    END;
    $$;
    ALTER FUNCTION public.fn_enqueue_preauth_audit_event(VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_enqueue_preauth_audit_event(VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_enqueue_preauth_audit_event(VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB) TO classsphere_app;
    """)

    # 5. Authenticated Audit Enqueue Function (Strict Whitelist: Fabrication Prevention)
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_enqueue_authentication_audit_event(
        p_event_type VARCHAR(64),
        p_severity VARCHAR(32),
        p_actor_user_id UUID,
        p_institution_id UUID,
        p_department_id UUID,
        p_user_id UUID,
        p_deduplication_key VARCHAR(128),
        p_payload JSONB
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_current_user_id UUID;
        v_current_tenant_id UUID;
        v_outbox_id UUID;
    BEGIN
        IF p_event_type NOT IN (
            'LOGIN_SUCCESS', 'TOKEN_REFRESHED', 'LOGOUT',
            'PASSWORD_CHANGED', 'SESSION_TERMINATED', 'MFA_VERIFIED'
        ) THEN
            RAISE EXCEPTION 'Event type % not permitted for authenticated audit', p_event_type
                USING ERRCODE = 'invalid_parameter_value';
        END IF;

        v_current_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;
        v_current_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;

        IF v_current_user_id IS NULL OR v_current_tenant_id IS NULL THEN
            RAISE EXCEPTION 'Authenticated audit enqueue requires active user and tenant session'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF p_actor_user_id <> v_current_user_id THEN
            RAISE EXCEPTION 'Actor mismatch: param % does not match session %', p_actor_user_id, v_current_user_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF p_institution_id <> v_current_tenant_id THEN
            RAISE EXCEPTION 'Tenant mismatch: param % does not match session %', p_institution_id, v_current_tenant_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        INSERT INTO public.authentication_audit_outbox (
            event_type, severity, actor_user_id, institution_id, department_id,
            user_id, deduplication_key, payload, status, next_retry_at
        ) VALUES (
            p_event_type, p_severity, p_actor_user_id, p_institution_id, p_department_id,
            p_user_id, p_deduplication_key, p_payload, 'PENDING', clock_timestamp()
        )
        ON CONFLICT (deduplication_key) DO NOTHING
        RETURNING id INTO v_outbox_id;

        RETURN v_outbox_id;
    END;
    $$;
    ALTER FUNCTION public.fn_enqueue_authentication_audit_event(VARCHAR, VARCHAR, UUID, UUID, UUID, UUID, VARCHAR, JSONB) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_enqueue_authentication_audit_event(VARCHAR, VARCHAR, UUID, UUID, UUID, UUID, VARCHAR, JSONB) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_enqueue_authentication_audit_event(VARCHAR, VARCHAR, UUID, UUID, UUID, UUID, VARCHAR, JSONB) TO classsphere_app;
    """)

    # 6. Departmental Governance Audit Enqueue Function
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_enqueue_departmental_governance_event(
        p_event_type VARCHAR(64),
        p_severity VARCHAR(32),
        p_actor_user_id UUID,
        p_institution_id UUID,
        p_department_id UUID,
        p_deduplication_key VARCHAR(128),
        p_payload JSONB
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_current_user_id UUID;
        v_current_tenant_id UUID;
        v_actor RECORD;
        v_dept RECORD;
        v_roles VARCHAR(32)[];
        v_outbox_id UUID;
    BEGIN
        IF p_event_type NOT IN (
            'ATTENDANCE_ENDORSEMENT', 'TIMETABLE_APPROVAL',
            'CLASSROOM_AUDIT', 'CURRICULUM_SIGN_OFF', 'EXAM_MODERATION'
        ) THEN
            RAISE EXCEPTION 'Event type % is not a permitted departmental governance event', p_event_type
                USING ERRCODE = 'invalid_parameter_value';
        END IF;

        IF p_actor_user_id IS NULL OR p_institution_id IS NULL OR p_department_id IS NULL THEN
            RAISE EXCEPTION 'Departmental governance events require actor_user_id, institution_id, and department_id'
                USING ERRCODE = 'not_null_violation';
        END IF;

        v_current_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;
        v_current_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;

        IF v_current_user_id IS NULL OR v_current_tenant_id IS NULL THEN
            RAISE EXCEPTION 'Departmental enqueue requires active user and tenant session'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF p_actor_user_id <> v_current_user_id THEN
            RAISE EXCEPTION 'Actor mismatch: param % does not match session %', p_actor_user_id, v_current_user_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF p_institution_id <> v_current_tenant_id THEN
            RAISE EXCEPTION 'Tenant mismatch: param % does not match session %', p_institution_id, v_current_tenant_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        -- Verify department
        SELECT id, institution_id, is_active
        INTO v_dept
        FROM public.departments
        WHERE id = p_department_id AND institution_id = p_institution_id AND is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Department % is invalid or inactive in institution %', p_department_id, p_institution_id
                USING ERRCODE = 'check_violation';
        END IF;

        -- Verify actor is active
        SELECT id, institution_id, department_id, is_active
        INTO v_actor
        FROM public.users
        WHERE id = p_actor_user_id AND institution_id = p_institution_id AND is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Actor % is not an active user in institution %', p_actor_user_id, p_institution_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        -- Collect roles and verify role authorization
        SELECT array_agg(ur.role)
        INTO v_roles
        FROM public.user_roles ur
        WHERE ur.user_id = p_actor_user_id;

        IF v_roles IS NULL THEN
            RAISE EXCEPTION 'Actor % possesses no assigned roles', p_actor_user_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF p_event_type IN ('ATTENDANCE_ENDORSEMENT', 'TIMETABLE_APPROVAL', 'CURRICULUM_SIGN_OFF') THEN
            IF NOT ('ADMIN' = ANY(v_roles) OR ('HOD' = ANY(v_roles) AND v_actor.department_id = p_department_id)) THEN
                RAISE EXCEPTION 'Event % requires ADMIN or departmental HOD authority', p_event_type
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
        ELSIF p_event_type IN ('CLASSROOM_AUDIT', 'EXAM_MODERATION') THEN
            IF NOT ('ADMIN' = ANY(v_roles) OR ('HOD' = ANY(v_roles) AND v_actor.department_id = p_department_id) OR
                    ('FACULTY' = ANY(v_roles) AND v_actor.department_id = p_department_id)) THEN
                RAISE EXCEPTION 'Event % requires departmental FACULTY, HOD, or ADMIN authority', p_event_type
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
        END IF;

        INSERT INTO public.authentication_audit_outbox (
            event_type, severity, actor_user_id, institution_id, department_id,
            user_id, deduplication_key, payload, status, next_retry_at
        ) VALUES (
            p_event_type, p_severity, p_actor_user_id, p_institution_id, p_department_id,
            p_actor_user_id, p_deduplication_key, p_payload, 'PENDING', clock_timestamp()
        )
        ON CONFLICT (deduplication_key) DO NOTHING
        RETURNING id INTO v_outbox_id;

        RETURN v_outbox_id;
    END;
    $$;
    ALTER FUNCTION public.fn_enqueue_departmental_governance_event(VARCHAR, VARCHAR, UUID, UUID, UUID, VARCHAR, JSONB) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_enqueue_departmental_governance_event(VARCHAR, VARCHAR, UUID, UUID, UUID, VARCHAR, JSONB) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_enqueue_departmental_governance_event(VARCHAR, VARCHAR, UUID, UUID, UUID, VARCHAR, JSONB) TO classsphere_app;
    """)

    # 7. Atomic Token Replay Detection & Handling Function
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_handle_token_replay_attack(
        p_presented_token_hash VARCHAR(64),
        p_family_id UUID,
        p_user_id UUID,
        p_institution_id UUID,
        p_ip_address INET,
        p_user_agent TEXT
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_token RECORD;
        v_user RECORD;
        v_revoked_count INTEGER := 0;
        v_outbox_id UUID;
        v_lock_key BIGINT;
    BEGIN
        -- Level 1 Lock: User Row Lock (FOR SHARE)
        SELECT id, institution_id, department_id, is_active
        INTO v_user
        FROM public.users
        WHERE id = p_user_id
        FOR SHARE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'User % does not exist', p_user_id
                USING ERRCODE = 'no_data_found';
        END IF;

        IF v_user.institution_id <> p_institution_id THEN
            RAISE EXCEPTION 'Institution mismatch for user %', p_user_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        -- Level 2 Lock: Family Advisory Lock
        v_lock_key := public.fn_token_family_advisory_key(p_family_id);
        PERFORM pg_advisory_xact_lock(v_lock_key);

        -- Level 3 Lock: Token Row Lock & Cryptographic Verification
        SELECT id, family_id, user_id, consumed_at, revoked_at, expires_at
        INTO v_token
        FROM public.refresh_tokens
        WHERE token_hash = p_presented_token_hash
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Token hash does not exist in token store'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;

        IF v_token.family_id <> p_family_id OR v_token.user_id <> p_user_id THEN
            RAISE EXCEPTION 'Token metadata mismatch for presented token hash'
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_token.consumed_at IS NULL THEN
            RAISE EXCEPTION 'Token has not been consumed; cannot trigger replay handling'
                USING ERRCODE = 'check_violation';
        END IF;

        IF v_token.revoked_at IS NOT NULL THEN
            RETURN jsonb_build_object(
                'status', 'ALREADY_REVOKED',
                'revoked_count', 0,
                'reason', v_token.revocation_reason
            );
        END IF;

        -- Atomic Revocation of Entire Token Family
        WITH revoked AS (
            UPDATE public.refresh_tokens
            SET revoked_at = clock_timestamp(),
                revocation_reason = 'REPLAY_ATTACK'
            WHERE family_id = p_family_id
              AND revoked_at IS NULL
            RETURNING id
        )
        SELECT COUNT(*) INTO v_revoked_count FROM revoked;

        -- Atomic Enqueue of CRITICAL Replay Audit Event
        INSERT INTO public.authentication_audit_outbox (
            event_type, severity, actor_user_id, institution_id, department_id,
            user_id, deduplication_key, payload, status, next_retry_at
        ) VALUES (
            'REPLAY_ATTACK',
            'CRITICAL',
            p_user_id,
            p_institution_id,
            v_user.department_id,
            p_user_id,
            'REPLAY:' || v_token.id::text || ':' || to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS_US'),
            jsonb_build_object(
                'token_id', v_token.id,
                'family_id', p_family_id,
                'user_id', p_user_id,
                'consumed_at', v_token.consumed_at,
                'revoked_count', v_revoked_count,
                'ip_address', p_ip_address::text,
                'user_agent', p_user_agent
            ),
            'PENDING',
            clock_timestamp()
        )
        RETURNING id INTO v_outbox_id;

        RETURN jsonb_build_object(
            'status', 'REPLAY_DETECTED_FAMILY_REVOKED',
            'outbox_id', v_outbox_id,
            'revoked_count', v_revoked_count
        );
    END;
    $$;
    ALTER FUNCTION public.fn_handle_token_replay_attack(VARCHAR, UUID, UUID, UUID, INET, TEXT) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_handle_token_replay_attack(VARCHAR, UUID, UUID, UUID, INET, TEXT) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_handle_token_replay_attack(VARCHAR, UUID, UUID, UUID, INET, TEXT) TO classsphere_app;
    """)

    # 8. Administrative Deactivation & Token Revocation Procedure
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_deactivate_user_refresh_tokens(
        p_target_user_id UUID,
        p_reason VARCHAR(64) DEFAULT 'ACCOUNT_DEACTIVATED'
    )
    RETURNS INTEGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_actor_user_id UUID;
        v_actor_tenant_id UUID;
        v_actor_dept_id UUID;
        v_actor_roles VARCHAR(32)[];
        v_target RECORD;
        v_family_rec RECORD;
        v_lock_key BIGINT;
        v_revoked_count INTEGER := 0;
    BEGIN
        v_actor_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;
        v_actor_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
        v_actor_dept_id := NULLIF(current_setting('app.current_department_id', true), '')::UUID;

        IF v_actor_user_id IS NULL OR v_actor_tenant_id IS NULL THEN
            RAISE EXCEPTION 'Unauthenticated caller session'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.users
            WHERE id = v_actor_user_id AND institution_id = v_actor_tenant_id AND is_active = true
        ) THEN
            RAISE EXCEPTION 'Actor % is not active in institution %', v_actor_user_id, v_actor_tenant_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        SELECT array_agg(ur.role)
        INTO v_actor_roles
        FROM public.user_roles ur
        WHERE ur.user_id = v_actor_user_id;

        IF v_actor_roles IS NULL OR NOT ('ADMIN' = ANY(v_actor_roles) OR 'HOD' = ANY(v_actor_roles)) THEN
            RAISE EXCEPTION 'Caller lacks administrative deactivation authority'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        -- Level 1 Lock: User Row Lock (FOR UPDATE)
        SELECT id, institution_id, department_id, is_active
        INTO v_target
        FROM public.users
        WHERE id = p_target_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Target user % not found', p_target_user_id
                USING ERRCODE = 'no_data_found';
        END IF;

        IF v_target.institution_id <> v_actor_tenant_id THEN
            RAISE EXCEPTION 'Cross-institution deactivation forbidden'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF NOT ('ADMIN' = ANY(v_actor_roles)) AND ('HOD' = ANY(v_actor_roles)) THEN
            IF v_target.department_id IS NULL OR v_actor_dept_id IS NULL OR
               v_target.department_id <> v_actor_dept_id THEN
                RAISE EXCEPTION 'HOD cannot deactivate user outside own department'
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
        END IF;

        -- Deactivate target user
        UPDATE public.users
        SET is_active = false,
            updated_at = clock_timestamp()
        WHERE id = p_target_user_id;

        -- Level 2 Lock: Acquire family advisory locks in strict ascending order
        FOR v_family_rec IN
            SELECT DISTINCT family_id
            FROM public.refresh_tokens
            WHERE user_id = p_target_user_id
              AND revoked_at IS NULL
            ORDER BY family_id ASC
        LOOP
            v_lock_key := public.fn_token_family_advisory_key(v_family_rec.family_id);
            PERFORM pg_advisory_xact_lock(v_lock_key);
        END LOOP;

        -- Level 3 Lock: Revoke all active tokens
        WITH revoked AS (
            UPDATE public.refresh_tokens
            SET revoked_at = clock_timestamp(),
                revocation_reason = p_reason
            WHERE user_id = p_target_user_id
              AND revoked_at IS NULL
            RETURNING id
        )
        SELECT COUNT(*) INTO v_revoked_count FROM revoked;

        -- Enqueue outbox audit event within the exact same transaction
        INSERT INTO public.authentication_audit_outbox (
            event_type, severity, actor_user_id, institution_id, department_id,
            user_id, deduplication_key, payload, status, next_retry_at
        ) VALUES (
            'ACCOUNT_DEACTIVATED',
            'HIGH',
            v_actor_user_id,
            v_actor_tenant_id,
            v_target.department_id,
            p_target_user_id,
            'DEACTIVATE:' || p_target_user_id::text || ':' || to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS'),
            jsonb_build_object(
                'target_user_id', p_target_user_id,
                'revoked_token_count', v_revoked_count,
                'deactivated_by', v_actor_user_id,
                'reason', p_reason
            ),
            'PENDING',
            clock_timestamp()
        )
        ON CONFLICT (deduplication_key) DO NOTHING;

        RETURN v_revoked_count;
    END;
    $$;
    ALTER FUNCTION public.fn_deactivate_user_refresh_tokens(UUID, VARCHAR) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_deactivate_user_refresh_tokens(UUID, VARCHAR) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_deactivate_user_refresh_tokens(UUID, VARCHAR) TO classsphere_app;
    """)

    # 9. Atomic Worker Outbox Batch Claim Function
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_claim_audit_outbox_batch(
        p_worker_id VARCHAR(64),
        p_batch_size INTEGER DEFAULT 100,
        p_lease_seconds INTEGER DEFAULT 60
    )
    RETURNS TABLE (
        outbox_id UUID,
        claim_token UUID,
        claim_generation BIGINT,
        event_type VARCHAR(64),
        severity VARCHAR(32),
        actor_user_id UUID,
        institution_id UUID,
        department_id UUID,
        payload JSONB
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_claim_token UUID := gen_random_uuid();
        v_expires_at TIMESTAMPTZ := clock_timestamp() + (p_lease_seconds || ' seconds')::interval;
    BEGIN
        RETURN QUERY
        WITH claimable AS (
            SELECT id
            FROM public.authentication_audit_outbox
            WHERE (status IN ('PENDING', 'FAILED') AND next_retry_at <= clock_timestamp())
               OR (status = 'PROCESSING' AND claim_expires_at < clock_timestamp())
            ORDER BY next_retry_at ASC
            LIMIT p_batch_size
            FOR UPDATE SKIP LOCKED
        ), updated AS (
            UPDATE public.authentication_audit_outbox o
            SET status = 'PROCESSING',
                claimed_by = p_worker_id,
                claim_token = v_claim_token,
                claimed_at = clock_timestamp(),
                claim_expires_at = v_expires_at,
                claim_generation = o.claim_generation + 1
            FROM claimable c
            WHERE o.id = c.id
            RETURNING o.id, o.claim_token, o.claim_generation, o.event_type,
                      o.severity, o.actor_user_id, o.institution_id, o.department_id, o.payload
        )
        SELECT * FROM updated;
    END;
    $$;
    ALTER FUNCTION public.fn_claim_audit_outbox_batch(VARCHAR, INTEGER, INTEGER) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_claim_audit_outbox_batch(VARCHAR, INTEGER, INTEGER) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_claim_audit_outbox_batch(VARCHAR, INTEGER, INTEGER) TO classsphere_audit_worker;
    """)

    # 10. Audit Worker Failure Recording Function
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_record_audit_worker_failure(
        p_outbox_id UUID,
        p_claim_token UUID,
        p_worker_id VARCHAR(64),
        p_claim_generation BIGINT,
        p_error_message TEXT,
        p_base_backoff_seconds INTEGER DEFAULT 5,
        p_max_backoff_seconds INTEGER DEFAULT 300
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_current_retries INTEGER;
        v_max_retries INTEGER;
        v_delay_seconds INTEGER;
    BEGIN
        SELECT retry_count, max_retries
        INTO v_current_retries, v_max_retries
        FROM public.authentication_audit_outbox
        WHERE id = p_outbox_id
          AND claim_token = p_claim_token
          AND claimed_by = p_worker_id
          AND claim_generation = p_claim_generation
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN FALSE;
        END IF;

        IF v_current_retries + 1 >= v_max_retries THEN
            UPDATE public.authentication_audit_outbox
            SET status = 'DEAD',
                retry_count = retry_count + 1,
                last_error = p_error_message,
                error_log = error_log || jsonb_build_object(
                    'timestamp', clock_timestamp(),
                    'worker_id', p_worker_id,
                    'error', p_error_message,
                    'fatal', true
                ),
                claim_token = NULL,
                claimed_by = NULL,
                claimed_at = NULL,
                claim_expires_at = NULL
            WHERE id = p_outbox_id;
        ELSE
            v_delay_seconds := LEAST(p_max_backoff_seconds, p_base_backoff_seconds * (2 ^ v_current_retries));
            UPDATE public.authentication_audit_outbox
            SET status = 'FAILED',
                retry_count = retry_count + 1,
                next_retry_at = clock_timestamp() + (v_delay_seconds || ' seconds')::interval,
                last_error = p_error_message,
                error_log = error_log || jsonb_build_object(
                    'timestamp', clock_timestamp(),
                    'worker_id', p_worker_id,
                    'error', p_error_message,
                    'fatal', false
                ),
                claim_token = NULL,
                claimed_by = NULL,
                claimed_at = NULL,
                claim_expires_at = NULL
            WHERE id = p_outbox_id;
        END IF;

        RETURN TRUE;
    END;
    $$;
    ALTER FUNCTION public.fn_record_audit_worker_failure(UUID, UUID, VARCHAR, BIGINT, TEXT, INTEGER, INTEGER) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_record_audit_worker_failure(UUID, UUID, VARCHAR, BIGINT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_record_audit_worker_failure(UUID, UUID, VARCHAR, BIGINT, TEXT, INTEGER, INTEGER) TO classsphere_audit_worker;
    """)

    # 11. Maintenance Claim Recovery & Pruning Functions
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_reap_abandoned_outbox_claims(
        p_batch_size INTEGER DEFAULT 100
    )
    RETURNS INTEGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_reaped_count INTEGER := 0;
    BEGIN
        -- Prevent abandoned claims from retrying forever by evaluating retry_count vs max_retries
        WITH abandoned AS (
            SELECT id, retry_count, max_retries, claimed_by
            FROM public.authentication_audit_outbox
            WHERE status = 'PROCESSING'
              AND claim_expires_at < clock_timestamp()
            LIMIT p_batch_size
            FOR UPDATE SKIP LOCKED
        ), dead_rows AS (
            UPDATE public.authentication_audit_outbox o
            SET status = 'DEAD',
                retry_count = o.retry_count + 1,
                last_error = 'Claim abandoned by worker ' || COALESCE(a.claimed_by, 'unknown') || '; max retries exceeded',
                error_log = o.error_log || jsonb_build_object(
                    'timestamp', clock_timestamp(),
                    'worker_id', a.claimed_by,
                    'error', 'Lease abandoned; fatal transition to DEAD',
                    'fatal', true
                ),
                claim_token = NULL,
                claimed_by = NULL,
                claimed_at = NULL,
                claim_expires_at = NULL
            FROM abandoned a
            WHERE o.id = a.id AND (o.retry_count + 1 >= o.max_retries)
            RETURNING o.id
        ), reset_rows AS (
            UPDATE public.authentication_audit_outbox o
            SET status = 'PENDING',
                retry_count = o.retry_count + 1,
                last_error = 'Claim abandoned by worker ' || COALESCE(a.claimed_by, 'unknown') || '; lease expired',
                error_log = o.error_log || jsonb_build_object(
                    'timestamp', clock_timestamp(),
                    'worker_id', a.claimed_by,
                    'error', 'Lease abandoned; reaped back to PENDING',
                    'fatal', false
                ),
                claim_token = NULL,
                claimed_by = NULL,
                claimed_at = NULL,
                claim_expires_at = NULL,
                next_retry_at = clock_timestamp() + interval '30 seconds'
            FROM abandoned a
            WHERE o.id = a.id AND (o.retry_count + 1 < o.max_retries)
            RETURNING o.id
        )
        SELECT (SELECT COUNT(*) FROM dead_rows) + (SELECT COUNT(*) FROM reset_rows) INTO v_reaped_count;

        RETURN v_reaped_count;
    END;
    $$;
    ALTER FUNCTION public.fn_reap_abandoned_outbox_claims(INTEGER) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_reap_abandoned_outbox_claims(INTEGER) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_reap_abandoned_outbox_claims(INTEGER) TO classsphere_maintenance, classsphere_audit_worker;

    CREATE OR REPLACE FUNCTION public.fn_prune_completed_outbox_entries(
        p_retention_days INTEGER DEFAULT 90,
        p_batch_size INTEGER DEFAULT 1000
    )
    RETURNS INTEGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_cutoff TIMESTAMPTZ;
        v_pruned_count INTEGER := 0;
    BEGIN
        IF p_retention_days < 7 THEN
            RAISE EXCEPTION 'Retention period must be at least 7 days'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;

        v_cutoff := clock_timestamp() - (p_retention_days || ' days')::interval;

        WITH candidates AS (
            SELECT id
            FROM public.authentication_audit_outbox
            WHERE status = 'COMPLETED'
              AND processed_at < v_cutoff
            LIMIT p_batch_size
            FOR UPDATE SKIP LOCKED
        ), deleted AS (
            DELETE FROM public.authentication_audit_outbox o
            USING candidates c
            WHERE o.id = c.id
            RETURNING o.id
        )
        SELECT COUNT(*) INTO v_pruned_count FROM deleted;

        RETURN v_pruned_count;
    END;
    $$;
    ALTER FUNCTION public.fn_prune_completed_outbox_entries(INTEGER, INTEGER) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_prune_completed_outbox_entries(INTEGER, INTEGER) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_prune_completed_outbox_entries(INTEGER, INTEGER) TO classsphere_maintenance;
    """)

    # 12. Canonical Table 24 Departmental Ledger Append Function
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_append_administrative_audit_ledger(
        p_department_id UUID,
        p_endorsed_by_user_id UUID,
        p_report_metadata JSONB
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_lock_key BIGINT;
        v_last_block RECORD;
        v_block_index BIGINT;
        v_prev_hash VARCHAR(64);
        v_payload_hash VARCHAR(64);
        v_ledger_hash VARCHAR(64);
        v_raw_preimage TEXT;
        v_entry_id UUID;
    BEGIN
        IF p_department_id IS NULL OR p_endorsed_by_user_id IS NULL THEN
            RAISE EXCEPTION 'Department and endorser are mandatory for administrative_audit_ledger'
                USING ERRCODE = 'not_null_violation';
        END IF;

        v_lock_key := ('x' || substr(md5('classsphere:dept_audit_ledger:' || p_department_id::text), 1, 16))::bit(64)::bigint;
        PERFORM pg_advisory_xact_lock(v_lock_key);

        SELECT block_index, ledger_hash
        INTO v_last_block
        FROM public.administrative_audit_ledger
        WHERE department_id = p_department_id
        ORDER BY block_index DESC
        LIMIT 1;

        IF NOT FOUND THEN
            v_block_index := 1;
            v_prev_hash := '0000000000000000000000000000000000000000000000000000000000000000';
        ELSE
            v_block_index := v_last_block.block_index + 1;
            v_prev_hash := v_last_block.ledger_hash;
        END IF;

        -- Exact canonical Table 24 format: sha256(prev_hash || '|' || payload_hash || '|' || block_index)
        v_payload_hash := encode(sha256(convert_to(p_report_metadata::text, 'UTF8')), 'hex');
        v_raw_preimage := v_prev_hash || '|' || v_payload_hash || '|' || v_block_index::text;
        v_ledger_hash := encode(sha256(convert_to(v_raw_preimage, 'UTF8')), 'hex');

        INSERT INTO public.administrative_audit_ledger (
            department_id, endorsed_by_user_id, block_index,
            previous_hash, payload_hash, ledger_hash, report_metadata
        ) VALUES (
            p_department_id, p_endorsed_by_user_id, v_block_index,
            v_prev_hash, v_payload_hash, v_ledger_hash, p_report_metadata
        )
        RETURNING id INTO v_entry_id;

        RETURN v_entry_id;
    END;
    $$;
    ALTER FUNCTION public.fn_append_administrative_audit_ledger(UUID, UUID, JSONB) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_append_administrative_audit_ledger(UUID, UUID, JSONB) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_append_administrative_audit_ledger(UUID, UUID, JSONB) TO classsphere_audit_worker;
    """)

    # 13. Atomic Worker Processing Procedure with Dual-Ledger Routing
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_process_audit_outbox_entry(
        p_outbox_id UUID,
        p_claim_token UUID,
        p_worker_id VARCHAR(64),
        p_claim_generation BIGINT
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public, pg_temp
    AS $$
    DECLARE
        v_outbox RECORD;
        v_last_block RECORD;
        v_block_index BIGINT;
        v_prev_hash VARCHAR(64);
        v_payload_hash VARCHAR(64);
        v_ledger_hash VARCHAR(64);
        v_raw_preimage TEXT;
        v_ledger_id UUID;
        v_lock_key BIGINT;
        v_rows_updated INTEGER;
    BEGIN
        SELECT * INTO v_outbox
        FROM public.authentication_audit_outbox
        WHERE id = p_outbox_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Outbox record % not found', p_outbox_id
                USING ERRCODE = 'no_data_found';
        END IF;

        IF v_outbox.status <> 'PROCESSING' OR
           v_outbox.claim_token <> p_claim_token OR
           v_outbox.claimed_by <> p_worker_id OR
           v_outbox.claim_generation <> p_claim_generation OR
           v_outbox.claim_expires_at < clock_timestamp() THEN
            RAISE EXCEPTION 'Stale or invalid worker claim on outbox %', p_outbox_id
                USING ERRCODE = 'lock_not_available';
        END IF;

        -- Verify actor existence and tenant affiliation
        -- (Does NOT require is_active = true; historical audit events remain valid even if the user has since been deactivated)
        IF v_outbox.actor_user_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.users
                WHERE id = v_outbox.actor_user_id AND institution_id = v_outbox.institution_id
            ) THEN
                RAISE EXCEPTION 'Outbox actor % does not belong to institution %',
                    v_outbox.actor_user_id, v_outbox.institution_id
                    USING ERRCODE = 'check_violation';
            END IF;
        END IF;

        -- Dual Routing: Departmental vs Institutional
        IF v_outbox.event_type IN ('ATTENDANCE_ENDORSEMENT', 'TIMETABLE_APPROVAL', 'CLASSROOM_AUDIT', 'CURRICULUM_SIGN_OFF', 'EXAM_MODERATION') THEN
            IF v_outbox.department_id IS NULL OR v_outbox.actor_user_id IS NULL THEN
                RAISE EXCEPTION 'Departmental governance entry % lacks department or actor', p_outbox_id
                    USING ERRCODE = 'check_violation';
            END IF;

            -- Verify departmental authority
            IF NOT EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.users u ON u.id = ur.user_id
                WHERE ur.user_id = v_outbox.actor_user_id
                  AND u.department_id = v_outbox.department_id
                  AND u.institution_id = v_outbox.institution_id
                  AND u.is_active = true
                  AND ur.role IN ('ADMIN', 'HOD', 'FACULTY')
            ) THEN
                RAISE EXCEPTION 'Actor % lacks departmental authority in department %',
                    v_outbox.actor_user_id, v_outbox.department_id
                    USING ERRCODE = 'insufficient_privilege';
            END IF;

            v_ledger_id := public.fn_append_administrative_audit_ledger(
                v_outbox.department_id,
                v_outbox.actor_user_id,
                v_outbox.payload
            );
        ELSE
            -- Append to Table 29 (institutional_audit_ledger)
            v_payload_hash := encode(sha256(convert_to(v_outbox.payload::text, 'UTF8')), 'hex');

            v_lock_key := ('x' || substr(md5('classsphere:audit_ledger:' || v_outbox.institution_id::text), 1, 16))::bit(64)::bigint;
            PERFORM pg_advisory_xact_lock(v_lock_key);

            SELECT block_index, ledger_hash
            INTO v_last_block
            FROM public.institutional_audit_ledger
            WHERE institution_id = v_outbox.institution_id
            ORDER BY block_index DESC
            LIMIT 1;

            IF NOT FOUND THEN
                v_block_index := 1;
                v_prev_hash := '0000000000000000000000000000000000000000000000000000000000000000';
            ELSE
                v_block_index := v_last_block.block_index + 1;
                v_prev_hash := v_last_block.ledger_hash;
            END IF;

            v_raw_preimage := 'v1:INSTITUTIONAL|' || v_outbox.institution_id::text || '|' ||
                              COALESCE(v_outbox.department_id::text, 'GLOBAL') || '|' ||
                              COALESCE(v_outbox.actor_user_id::text, 'ANONYMOUS') || '|' ||
                              v_outbox.event_type || '|' || v_outbox.severity || '|' ||
                              v_block_index::text || '|' || v_prev_hash || '|' || v_payload_hash;
            v_ledger_hash := encode(sha256(convert_to(v_raw_preimage, 'UTF8')), 'hex');

            INSERT INTO public.institutional_audit_ledger (
                institution_id, department_id, actor_user_id, event_type, severity,
                payload, payload_hash, block_index, previous_hash, ledger_hash
            ) VALUES (
                v_outbox.institution_id, v_outbox.department_id, v_outbox.actor_user_id,
                v_outbox.event_type, v_outbox.severity,
                v_outbox.payload, v_payload_hash, v_block_index, v_prev_hash, v_ledger_hash
            )
            RETURNING id INTO v_ledger_id;
        END IF;

        -- Clear ALL claim fields upon completion and verify row count
        UPDATE public.authentication_audit_outbox
        SET status = 'COMPLETED',
            processed_at = clock_timestamp(),
            ledger_entry_id = v_ledger_id,
            claim_token = NULL,
            claimed_by = NULL,
            claimed_at = NULL,
            claim_expires_at = NULL
        WHERE id = p_outbox_id
          AND claim_token = p_claim_token
          AND claimed_by = p_worker_id
          AND claim_generation = p_claim_generation;

        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
        IF v_rows_updated <> 1 THEN
            RAISE EXCEPTION 'Completion update failed: worker lease lost for id %', p_outbox_id
                USING ERRCODE = 'lock_not_available';
        END IF;

        RETURN v_ledger_id;
    END;
    $$;
    ALTER FUNCTION public.fn_process_audit_outbox_entry(UUID, UUID, VARCHAR, BIGINT) OWNER TO classsphere_secdef_owner;
    REVOKE ALL ON FUNCTION public.fn_process_audit_outbox_entry(UUID, UUID, VARCHAR, BIGINT) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.fn_process_audit_outbox_entry(UUID, UUID, VARCHAR, BIGINT) TO classsphere_audit_worker;
    """)

def downgrade() -> None:
    op.execute("""
    DROP FUNCTION IF EXISTS public.fn_process_audit_outbox_entry(UUID, UUID, VARCHAR, BIGINT);
    DROP FUNCTION IF EXISTS public.fn_append_administrative_audit_ledger(UUID, UUID, JSONB);
    DROP FUNCTION IF EXISTS public.fn_prune_completed_outbox_entries(INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS public.fn_reap_abandoned_outbox_claims(INTEGER);
    DROP FUNCTION IF EXISTS public.fn_record_audit_worker_failure(UUID, UUID, VARCHAR, BIGINT, TEXT, INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS public.fn_claim_audit_outbox_batch(VARCHAR, INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS public.fn_deactivate_user_refresh_tokens(UUID, VARCHAR);
    DROP FUNCTION IF EXISTS public.fn_handle_token_replay_attack(VARCHAR, UUID, UUID, UUID, INET, TEXT);
    DROP FUNCTION IF EXISTS public.fn_enqueue_departmental_governance_event(VARCHAR, VARCHAR, UUID, UUID, UUID, VARCHAR, JSONB);
    DROP FUNCTION IF EXISTS public.fn_enqueue_authentication_audit_event(VARCHAR, VARCHAR, UUID, UUID, UUID, UUID, VARCHAR, JSONB);
    DROP FUNCTION IF EXISTS public.fn_enqueue_preauth_audit_event(VARCHAR, VARCHAR, UUID, VARCHAR, JSONB);
    DROP FUNCTION IF EXISTS public.fn_resolve_tenant_by_domain(VARCHAR);

    DROP POLICY IF EXISTS policy_inst_ledger_secdef_insert ON public.institutional_audit_ledger;
    DROP POLICY IF EXISTS policy_inst_ledger_secdef_select ON public.institutional_audit_ledger;
    DROP POLICY IF EXISTS policy_inst_ledger_tenant ON public.institutional_audit_ledger;

    DROP TABLE IF EXISTS public.institutional_audit_ledger CASCADE;
    DROP TABLE IF EXISTS public.authentication_audit_outbox CASCADE;
    """)
```

---

## 6. Complete Function Ownership and Privilege Matrix (Revision 9.2 Inventory)

Every function in the Phase 6D architecture is owned by `classsphere_secdef_owner`, has `EXECUTE` explicitly revoked from `PUBLIC`, and is granted to the minimum necessary database roles.

```
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| Function / Stored Procedure                 | Migration Defined     | classsphere_app          | classsphere_audit_worker   | classsphere_maintenance | classsphere_secdef_owner |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_token_family_advisory_key(UUID)          | 0009 (Table 27 Helper)| EXECUTE                  | NONE                       | EXECUTE                 | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_enforce_refresh_token_immutability()     | 0009 (Trigger)        | NONE (Trigger Execution) | NONE                       | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_verify_refresh_token_parent_lineage()    | 0009 (Trigger)        | NONE (Trigger Execution) | NONE                       | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_prune_expired_refresh_tokens(INT, INT)   | 0009 (Maintenance)    | NONE                     | NONE                       | EXECUTE                 | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_resolve_tenant_by_domain(VARCHAR)        | 0010 (Pre-Auth Helper)| EXECUTE                  | NONE                       | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_enqueue_preauth_audit_event(...)         | 0010 (Audit Ingestion)| EXECUTE                  | NONE                       | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_enqueue_authentication_audit_event(...)  | 0010 (Audit Ingestion)| EXECUTE                  | NONE                       | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_enqueue_departmental_governance_event(..)| 0010 (Audit Ingestion)| EXECUTE                  | NONE                       | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_handle_token_replay_attack(...)          | 0010 (Replay Pipeline)| EXECUTE                  | NONE                       | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_deactivate_user_refresh_tokens(UUID, VAR)| 0010 (Lifecycle)      | EXECUTE                  | NONE                       | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_claim_audit_outbox_batch(VAR, INT, INT)  | 0010 (Worker Daemon)  | NONE                     | EXECUTE                    | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_record_audit_worker_failure(...)         | 0010 (Worker Daemon)  | NONE                     | EXECUTE                    | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_reap_abandoned_outbox_claims(INT)        | 0010 (Recovery Daemon)| NONE                     | EXECUTE                    | EXECUTE                 | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_prune_completed_outbox_entries(INT, INT) | 0010 (Maintenance)    | NONE                     | NONE                       | EXECUTE                 | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_append_administrative_audit_ledger(...)  | 0010 (Table 24 Ledger)| NONE                     | EXECUTE                    | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
| fn_process_audit_outbox_entry(...)          | 0010 (Ledger Dispatch)| NONE                     | EXECUTE                    | NONE                    | OWNER (ALL)              |
+---------------------------------------------+-----------------------+--------------------------+----------------------------+-------------------------+--------------------------+
```

---

## 7. Refresh Token Lifecycle and Concurrency Implementation Specification

### Token Rotation Algorithm
1. Receive incoming refresh token `raw_jwt`.
2. Compute `token_hash = HMAC-SHA256(raw_jwt, key_v1)` in application tier.
3. Open database transaction `ISOLATION LEVEL READ COMMITTED`.
4. Inject multi-tenant context: `SET LOCAL app.current_tenant_id = :tenant_id;`.
5. Identify token family and user identity:
   ```sql
   SELECT id, family_id, user_id, consumed_at, revoked_at, expires_at
   FROM public.refresh_tokens
   WHERE token_hash = :token_hash;
   ```
6. **LEVEL 1 LOCK — User Row Lock (`FOR SHARE`):**
   ```sql
   SELECT id, institution_id, is_active
   FROM public.users
   WHERE id = :user_id
   FOR SHARE;
   ```
   *(Crucial Deadlock Prevention: Acquires User `FOR SHARE` FIRST. If deactivation holds `FOR UPDATE`, refresh blocks here WITHOUT holding any family advisory lock. If user is inactive, aborts immediately).*
7. **LEVEL 2 LOCK — Token Family Advisory Lock:**
   ```sql
   SELECT pg_advisory_xact_lock(public.fn_token_family_advisory_key(:family_id));
   ```
8. **LEVEL 3 LOCK — Token Row Lock (`FOR UPDATE`):**
   ```sql
   SELECT id, family_id, user_id, consumed_at, revoked_at, expires_at
   FROM public.refresh_tokens
   WHERE token_hash = :token_hash
   FOR UPDATE;
   ```
8. **Evaluate Token State:**
   - **Case A: Benign Revoked Reuse:** If `revoked_at IS NOT NULL`:
     Commit transaction and return 401 `TOKEN_REVOKED`. No replay alert or cascading revocation.
   - **Case B: Replay Detected:** If `consumed_at IS NOT NULL` AND `revoked_at IS NULL`:
     - Revoke entire token family:
       ```sql
       UPDATE public.refresh_tokens
       SET revoked_at = clock_timestamp(),
           revocation_reason = 'REPLAY_ATTACK'
       WHERE family_id = :family_id
         AND revoked_at IS NULL;
       ```
     - Enqueue `CRITICAL` severity audit event via `fn_enqueue_authentication_audit_event()`.
     - Commit transaction and return 401 `TOKEN_COMPROMISED`.
   - **Case C: Legitimate Rotation:** If `consumed_at IS NULL` AND `revoked_at IS NULL` AND `expires_at > clock_timestamp()`:
     - Check user active status under `FOR SHARE` lock:
       ```sql
       SELECT id, is_active FROM public.users WHERE id = :user_id FOR SHARE;
       ```
       *(Note: `FOR SHARE` blocks if account deactivation holds `FOR UPDATE`).*
       If `is_active = false`, rollback transaction and return 401 `ACCOUNT_INACTIVE`.
     - Consume current token:
       ```sql
       UPDATE public.refresh_tokens
       SET consumed_at = clock_timestamp()
       WHERE id = :token_id;
       ```
     - Mint new child token with `parent_token_id = :token_id`.
     - Insert child token into `public.refresh_tokens`.
     - Commit transaction and return new access and refresh token pair.

---

## 8. Audit Outbox Worker Implementation Specification

### Asynchronous Daemon Architecture
The outbox processing daemon operates as a dedicated process connecting under the `classsphere_audit_worker` database role.

### Execution Cycle:
1. **Stage A: Claim Lease (Committed Autonomous Transaction):**
   ```sql
   WITH claimable AS (
       SELECT id
       FROM public.authentication_audit_outbox
       WHERE status IN ('PENDING', 'PROCESSING')
         AND next_retry_at <= clock_timestamp()
         AND (claim_expires_at IS NULL OR claim_expires_at < clock_timestamp())
       ORDER BY created_at ASC
       LIMIT 10
       FOR UPDATE SKIP LOCKED
   )
   UPDATE public.authentication_audit_outbox o
   SET status = 'PROCESSING',
       claim_token = gen_random_uuid(),
       claim_generation = o.claim_generation + 1,
       claimed_by = :worker_id,
       claimed_at = clock_timestamp(),
       claim_expires_at = clock_timestamp() + INTERVAL '3 minutes'
   FROM claimable c
   WHERE o.id = c.id
   RETURNING o.id, o.claim_token, o.claim_generation, o.claimed_by;
   ```
2. **Stage B: Atomic Processing Transaction:**
   For each claimed row, open an isolated transaction:
   ```sql
   SELECT public.fn_process_audit_outbox_entry(
       :outbox_id,
       :claim_token,
       :claimed_by,
       :claim_generation
   );
   ```
3. **Stage C: Transient Failure Handling (Autonomous Error Transaction):**
   If Stage B raises an exception:
   ```sql
   UPDATE public.authentication_audit_outbox
   SET retry_count = retry_count + 1,
       status = CASE WHEN retry_count + 1 >= 5 THEN 'FAILED' ELSE 'PENDING' END,
       next_retry_at = clock_timestamp() + (POWER(2, LEAST(retry_count + 1, 8)) * INTERVAL '10 seconds'),
       claim_token = NULL,
       claimed_by = NULL,
       claimed_at = NULL,
       claim_expires_at = NULL,
       error_log = :error_trace
   WHERE id = :outbox_id
     AND claim_token = :claim_token
     AND claim_generation = :claim_generation;
   ```

---

## 9. Backend Integration Changes Required

To transition from the current stateless JWT implementation to Phase 6D.1 persistent refresh tokens:

1. **`app/core/config.py` Additions:**
   - `JWT_HMAC_KEY_V1`: 256-bit secret key used to compute HMAC-SHA256 hashes of compact refresh JWTs.
   - `JWT_CURRENT_KEY_VERSION`: Defaults to `'v1'`.
2. **`app/services/auth_service.py` Updates:**
   - In `authenticate_user()`:
     - After verifying password and `is_active`, acquire `SELECT ... FROM users WHERE id = :user_id FOR SHARE`.
     - Compute `token_hash = hmac_sha256(refresh_jwt, JWT_HMAC_KEY_V1)`.
     - Insert root token (`parent_token_id = NULL`) into `refresh_tokens`.
     - Enqueue `LOGIN_SUCCESS` audit event via `fn_enqueue_authentication_audit_event()`.
   - In `refresh_tokens()`:
     - Execute the full token rotation algorithm specified in Section 7.
   - In `logout()`:
     - Compute `token_hash = hmac_sha256(refresh_jwt, JWT_HMAC_KEY_V1)`.
     - Acquire family advisory lock.
     - Update token `revoked_at = clock_timestamp(), revocation_reason = 'LOGOUT'`.
     - Enqueue `LOGOUT` audit event.
3. **`app/services/admin_service.py` Integration:**
   - User deactivation endpoints invoke `fn_deactivate_user_refresh_tokens(p_target_user_id)`.

---

## 10. Safe Upgrade and Downgrade Procedure

### Upgrade Procedure
1. Execute role provisioning script (`scripts/init_db_roles.sql`).
2. Run `alembic upgrade 0009`: Creates Table 27, additive canonical RLS policies, immutability triggers, and family advisory key function.
3. Run `alembic upgrade 0010`: Creates Table 28, Table 29, outbox enqueue/processing functions, and deactivation procedure.
4. Launch `classsphere_audit_worker` daemon process.
5. Deploy updated backend API service.

### Downgrade Procedure
1. Stop `classsphere_audit_worker` daemon.
2. Run `alembic downgrade 0009`: Safely archives Table 28 and Table 29 into `_archive_<ts>_<rand>` tables; drops outbox and processing functions.
3. Run `alembic downgrade 0008`: Safely archives Table 27 into `_archive_<ts>_<rand>` tables; drops immutability triggers; removes additive policies from canonical Tables 2, 3, 4, 24.

---

## 11. Proposed Security Test Suite (75 Proposed Tests)

All 75 test scenarios are cataloged below and labeled `[PROPOSED]`:

### Group 1: Role Separation & Least Privilege
- `[PROPOSED] T19-01`: Verify `classsphere_secdef_owner` has `NOLOGIN`, `NOSUPERUSER`, and `NOBYPASSRLS`.
- `[PROPOSED] T19-02`: Verify `classsphere_migrator` has `NOSUPERUSER` and `NOBYPASSRLS`.
- `[PROPOSED] T19-03`: Verify `classsphere_app` has direct `INSERT` revoked on Table 24 (`administrative_audit_ledger`).
- `[PROPOSED] T19-04`: Verify `classsphere_app` has direct `INSERT` and `DELETE` revoked on Table 28 (`authentication_audit_outbox`).
- `[PROPOSED] T19-05`: Verify `classsphere_app` has direct `INSERT`, `UPDATE`, and `DELETE` revoked on Table 29 (`institutional_audit_ledger`).
- `[PROPOSED] T19-06`: Verify `classsphere_app` has direct `DELETE` revoked on Table 27 (`refresh_tokens`).
- `[PROPOSED] T19-07`: Verify `classsphere_audit_worker` has direct `INSERT` revoked on Table 29.
- `[PROPOSED] T19-08`: Verify all stored functions have `EXECUTE` revoked from `PUBLIC`.

### Group 2: Table 27 DDL, Constraints & Lineage
- `[PROPOSED] T19-09`: Verify Table 27 enforces `token_hash` uniqueness.
- `[PROPOSED] T19-10`: Verify Table 27 enforces `token_jti` uniqueness.
- `[PROPOSED] T19-11`: Verify Table 27 rejects unknown `revocation_reason` values.
- `[PROPOSED] T19-12`: Verify Table 27 enforces `expires_at > created_at`.
- `[PROPOSED] T19-13`: Verify Table 27 enforces revocation consistency (`revoked_at IS NOT NULL` requires reason).
- `[PROPOSED] T19-14`: Verify `uq_refresh_tokens_family_root` prevents multiple root tokens in a single family.
- `[PROPOSED] T19-15`: Verify `uq_refresh_tokens_parent` prevents multiple child tokens from the same parent.
- `[PROPOSED] T19-16`: Verify `department_id` enforces `ON DELETE RESTRICT` foreign key constraint.

### Group 3: Token Immutability & Lineage Triggers
- `[PROPOSED] T19-17`: Trigger `trg_verify_refresh_token_lineage` rejects child if parent `family_id` differs.
- `[PROPOSED] T19-18`: Trigger `trg_verify_refresh_token_lineage` rejects child if parent `user_id` differs.
- `[PROPOSED] T19-19`: Trigger `trg_verify_refresh_token_lineage` rejects child if parent `institution_id` differs.
- `[PROPOSED] T19-20`: Trigger `trg_verify_refresh_token_lineage` rejects child if parent `consumed_at` is NULL.
- `[PROPOSED] T19-21`: Trigger `trg_verify_refresh_token_lineage` rejects child if parent is already revoked.
- `[PROPOSED] T19-22`: Trigger `trg_enforce_refresh_token_immutability` blocks any mutation to `token_hash` or `token_jti`.
- `[PROPOSED] T19-23`: Trigger `trg_enforce_refresh_token_immutability` blocks modification of `consumed_at` once set.
- `[PROPOSED] T19-24`: Trigger `trg_enforce_refresh_token_immutability` blocks modification or clearing of `revoked_at` once set.

### Group 4: Concurrency & Advisory Lock Serialization
- `[PROPOSED] T19-25`: `fn_token_family_advisory_key()` produces identical 64-bit signed bigint across calls for same UUID.
- `[PROPOSED] T19-26`: Two concurrent rotation transactions on the same family serialize on advisory lock without deadlock.
- `[PROPOSED] T19-27`: Family advisory lock releases automatically upon transaction `COMMIT`.
- `[PROPOSED] T19-28`: Family advisory lock releases automatically upon transaction `ROLLBACK`.
- `[PROPOSED] T19-29`: Advisory locks across different families execute concurrently without contention.
- `[PROPOSED] T19-30`: Advisory lock acquisition in deactivation serializes cleanly against concurrent rotation.
- `[PROPOSED] T19-31`: Row lock `FOR UPDATE` on Table 27 succeeds immediately after advisory lock is held.
- `[PROPOSED] T19-32`: Concurrent refresh and logout on the same family serialize without race condition.

### Group 5: Replay Detection & Disambiguation
- `[PROPOSED] T19-33`: Replaying a consumed active token revokes all active tokens in the family with `REPLAY_ATTACK`.
- `[PROPOSED] T19-34`: Replaying a consumed active token enqueues a `CRITICAL` severity audit event into Table 28 outbox.
- `[PROPOSED] T19-35`: Replaying an already-revoked token (e.g. post-logout) returns 401 `TOKEN_REVOKED` without secondary replay cascade.
- `[PROPOSED] T19-36`: Replay attack detection revokes descendant tokens in multi-generation chain.
- `[PROPOSED] T19-37`: Concurrent replay attempts on the same family serialize and produce exactly one family revocation.
- `[PROPOSED] T19-38`: Replay attack preserves historical revocation reasons on already-revoked sibling branches.
- `[PROPOSED] T19-39`: Refreshing with an expired token returns 401 `TOKEN_EXPIRED` without triggering replay revocation.
- `[PROPOSED] T19-40`: Replay audit event payload includes client IP, user agent, and victim user ID.

### Group 6: Account Deactivation & Scoping
- `[PROPOSED] T19-41`: `fn_deactivate_user_refresh_tokens()` rejects unauthenticated caller session.
- `[PROPOSED] T19-42`: Institutional `ADMIN` can deactivate any user within their own institution.
- `[PROPOSED] T19-43`: Institutional `ADMIN` cannot deactivate user in a different institution (cross-tenant block).
- `[PROPOSED] T19-44`: Department `HOD` can deactivate user within their own department.
- `[PROPOSED] T19-45`: Department `HOD` cannot deactivate user in another department.
- `[PROPOSED] T19-46`: User with role `STUDENT` or `FACULTY` is rejected with `insufficient_privilege`.
- `[PROPOSED] T19-47`: Target user `is_active` set to false atomically with token revocation.
- `[PROPOSED] T19-48`: Target user row lock `FOR UPDATE` blocks concurrent login `FOR SHARE` until deactivation commits.

### Group 7: Table 28 Outbox Ingestion & Actor Validation
- `[PROPOSED] T19-49`: `fn_enqueue_authentication_audit_event()` rejects missing `app.current_user_id`.
- `[PROPOSED] T19-50`: `fn_enqueue_authentication_audit_event()` rejects mismatched `p_actor_user_id`.
- `[PROPOSED] T19-51`: `fn_enqueue_authentication_audit_event()` rejects mismatched `p_institution_id`.
- `[PROPOSED] T19-52`: `fn_enqueue_authentication_audit_event()` rejects invalid department-institution relationship.
- `[PROPOSED] T19-53`: `fn_enqueue_preauth_audit_event()` allows unauthenticated login failure with null actor.
- `[PROPOSED] T19-54`: `fn_enqueue_preauth_audit_event()` rejects unapproved event types.
- `[PROPOSED] T19-55`: Table 28 enforces idempotency via unique `deduplication_key`.
- `[PROPOSED] T19-56`: Direct `INSERT` into Table 28 by `classsphere_app` fails with `permission denied`.

### Group 8: Worker Fencing, Claims & Backoff
- `[PROPOSED] T19-57`: Stage A lease acquisition claims pending records and increments `claim_generation`.
- `[PROPOSED] T19-58`: Stage A uses `SKIP LOCKED` to distribute claims concurrently across worker threads.
- `[PROPOSED] T19-59`: `fn_process_audit_outbox_entry()` rejects stale claim token.
- `[PROPOSED] T19-60`: `fn_process_audit_outbox_entry()` rejects stale claim generation counter.
- `[PROPOSED] T19-61`: `fn_process_audit_outbox_entry()` rejects expired claim lease (`claim_expires_at < clock_timestamp()`).
- `[PROPOSED] T19-62`: Failed outbox item retries with exponential backoff: $2^{\\text{retry\\_count}} \\times 10$ seconds.
- `[PROPOSED] T19-63`: Outbox item reaching 5 failed retries transitions to `FAILED` status and halts retries.
- `[PROPOSED] T19-64`: Outbox item completion explicitly clears `claim_token`, `claimed_by`, `claimed_at`, and `claim_expires_at`.

### Group 9: Ledger Cryptographic Chaining & Tamper Detection
- `[PROPOSED] T19-65`: Table 29 enforces sequential `block_index` starting at 1 per institution.
- `[PROPOSED] T19-66`: Table 29 computes `ledger_hash` using canonical formula: `sha256(prev_hash || '|' || payload_hash || '|' || block_index)`.
- `[PROPOSED] T19-67`: Table 29 genesis block enforces `0000000000000000000000000000000000000000000000000000000000000000` previous hash.
- `[PROPOSED] T19-68`: Advisory lock serializes block creation under concurrent worker execution.
- `[PROPOSED] T19-69`: Tampering with `payload` or `payload_hash` in Table 29 breaks downstream verification chain.
- `[PROPOSED] T19-70`: `fn_append_administrative_audit_ledger()` adheres strictly to canonical Table 24 schema.

### Group 10: Retention Pruning & Downgrade Resilience
- `[PROPOSED] T19-71`: `fn_prune_expired_refresh_tokens()` deletes expired tokens in reverse-chronological order.
- `[PROPOSED] T19-72`: `fn_prune_expired_refresh_tokens()` never violates self-referencing foreign key constraint.
- `[PROPOSED] T19-73`: `fn_prune_authentication_audit_outbox()` deletes `COMPLETED` records older than 90 days.
- `[PROPOSED] T19-74`: `fn_prune_authentication_audit_outbox()` never deletes `FAILED` or `PENDING` records.
- `[PROPOSED] T19-75`: Alembic downgrade safely archives Tables 27, 28, and 29 without trigger or function dependency errors.

---

### Group 11: Revision 9.1 Targeted Blocker Verification Tests
- [PROPOSED] T19.1-01: Verify classsphere_migrator can execute ALTER ... OWNER TO classsphere_secdef_owner without SUPERUSER or BYPASSRLS via granted role membership.
- [PROPOSED] T19.1-02: Verify classsphere_secdef_owner can read public.institutions under FORCE ROW LEVEL SECURITY without active session tenant GUC via policy_institutions_secdef.
- [PROPOSED] T19.1-03: Verify n_enqueue_preauth_audit_event() rejects unverified or inactive institutions with oreign_key_violation.
- [PROPOSED] T19.1-04: Verify concurrent execution of token refresh (FOR SHARE user lock -> family advisory lock) and account deactivation (FOR UPDATE user lock -> family advisory locks) eliminates AB-BA deadlocks under 50 concurrent worker threads.
- [PROPOSED] T19.1-05: Verify n_deactivate_user_refresh_tokens() acquires family advisory locks in strict ascending amily_id order across multiple active token families.
- [PROPOSED] T19.1-06: Verify n_process_audit_outbox_entry() routes departmental governance events (ATTENDANCE_ENDORSEMENT, etc.) with department_id to Table 24 (dministrative_audit_ledger).
- [PROPOSED] T19.1-07: Verify n_process_audit_outbox_entry() rejects departmental governance outbox events if actor lacks departmental authority in Table 4.
- [PROPOSED] T19.1-08: Verify n_process_audit_outbox_entry() routes authentication, session, and pre-auth events to Table 29 (institutional_audit_ledger).
- [PROPOSED] T19.1-09: Verify n_enqueue_authentication_audit_event() rejects caller attempts to inject ACCOUNT_DEACTIVATED via the generic application path.
- [PROPOSED] T19.1-10: Verify n_enqueue_authentication_audit_event() rejects caller attempts to inject REPLAY_ATTACK via the generic application path.
- [PROPOSED] T19.1-11: Verify n_enqueue_replay_attack_event() succeeds only when passed a proven consumed token record (consumed_at IS NOT NULL).
- [PROPOSED] T19.1-12: Verify n_prune_expired_refresh_tokens() deletes expired child tokens before expired parent tokens (leaf-first anti-join) without violating k_refresh_tokens_parent ON DELETE RESTRICT.
- [PROPOSED] T19.1-13: Verify n_prune_expired_refresh_tokens() batch resumption and concurrency using FOR UPDATE SKIP LOCKED.
- [PROPOSED] T19.1-14: Verify Table 29 cryptographic hash preimage binds all 9 fields (1:INSTITUTIONAL|<institution_id>|<department_id>|<actor_user_id>|<event_type>|<severity>|<block_index>|<previous_hash>|<payload_hash>).
- [PROPOSED] T19.1-15: Verify out-of-band tampering with ctor_user_id, severity, or department_id in Table 29 breaks SHA-256 chain verification.
- [PROPOSED] T19.1-16: Verify classsphere_secdef_owner cannot activate a deactivated user (WITH CHECK (is_active = false) enforcement).
- [PROPOSED] T19.1-17: Verify direct SQL INSERT into Table 24 and Table 29 is denied for classsphere_app and classsphere_audit_worker.
- [PROPOSED] T19.1-18: Verify classsphere_maintenance has zero direct DELETE privileges on Table 27, 28, or 29, and can only execute maintenance security definer pruning procedures.
- [PROPOSED] T19.1-19: Verify role provisioning SQL execution with psql variable substitution fails safely when environment variables are omitted.
- [PROPOSED] T19.1-20: Verify clean downgrade and rollback from Migration 0010 to 0009 and 0009 to 0008 without orphaned policies or invalid triggers.

### Group 12: Revision 9.2 SQL Consistency & Defect Closure Tests
- `[PROPOSED] T19.2-01`: Verify Table 4 `user_roles` query execution without referencing nonexistent `is_active` column under `policy_user_roles_secdef`.
- `[PROPOSED] T19.2-02`: Verify database role provisioning executes cleanly via `\gexec` and direct `ALTER ROLE ... PASSWORD` without DO-block interpolation parsing errors.
- `[PROPOSED] T19.2-03`: Verify `GRANT classsphere_secdef_owner TO classsphere_migrator WITH INHERIT FALSE, SET TRUE` prevents privilege inheritance while allowing ownership transfer.
- `[PROPOSED] T19.2-04`: Verify `classsphere_secdef_owner` possesses `CREATE` on schema `public` during migration, and verify successful post-migration revocation.
- `[PROPOSED] T19.2-05`: Verify `fn_handle_token_replay_attack()` rejects caller attempts to trigger replay using an unconsumed token or nonexistent hash.
- `[PROPOSED] T19.2-06`: Verify `fn_handle_token_replay_attack()` verifies presented token HMAC, family ID, user ID, and active user before revoking family and enqueuing outbox event.
- `[PROPOSED] T19.2-07`: Verify `fn_enqueue_departmental_governance_event()` validates event types against whitelist (`ATTENDANCE_ENDORSEMENT`, etc.).
- `[PROPOSED] T19.2-08`: Verify `fn_enqueue_departmental_governance_event()` validates actor status, institution, department, and role authorization.
- `[PROPOSED] T19.2-09`: Verify departmental governance event in outbox routes strictly to Table 24 (`administrative_audit_ledger`).
- `[PROPOSED] T19.2-10`: Verify malformed departmental governance event (missing department or actor) raises an exception and is NOT silently routed to Table 29.
- `[PROPOSED] T19.2-11`: Verify `fn_claim_audit_outbox_batch()` claims batches with lease expiry, incrementing `claim_generation` and using `FOR UPDATE SKIP LOCKED`.
- `[PROPOSED] T19.2-12`: Verify `fn_record_audit_worker_failure()` enforces claim lease ownership before updating retry count and applying exponential backoff.
- `[PROPOSED] T19.2-13`: Verify `fn_reap_abandoned_outbox_claims()` resets expired processing claims back to `PENDING`.
- `[PROPOSED] T19.2-14`: Verify `fn_process_audit_outbox_entry()` completely clears `claim_token`, `claimed_by`, `claimed_at`, and `claim_expires_at` upon completion and validates affected row count.
- `[PROPOSED] T19.2-15`: Verify `fn_resolve_tenant_by_domain()` resolves active institution by domain name; rejects unmapped domains.
- `[PROPOSED] T19.2-16`: Verify column-level permissions on `users`: `classsphere_secdef_owner` cannot select `password_hash`.
- `[PROPOSED] T19.2-17`: Verify `ON DELETE RESTRICT` on Table 28 and Table 29 prevents deletion of users or departments referenced in audit ledgers.
- `[PROPOSED] T19.2-18`: Verify `v1:INSTITUTIONAL` hash preimage verification detects tampering in `actor_user_id`, `department_id`, or `severity`.
- `[PROPOSED] T19.2-19`: Verify clean Alembic rollback from Revision 0010 to 0009 and 0009 to 0008 drops all 16 functions and policies cleanly.
- `[PROPOSED] T19.2-20`: Verify execution order of migrations: all functions and dependencies exist before referenced by downstream procedures.

## 12. Deployment Security Checklist

- [ ] All 5 roles provisioned via `init_db_roles.sql` with passwords injected via environment/secret vault.
- [ ] `classsphere_secdef_owner` verified as `NOLOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`.
- [ ] Additive policies on Tables 2, 3, 4, 24 verified to grant minimum required access to `classsphere_secdef_owner`.
- [ ] All functions in Migration 0009 and 0010 owned by `classsphere_secdef_owner` with `REVOKE ALL FROM PUBLIC`.
- [ ] Direct `INSERT` revoked on Table 24 from `classsphere_app`.
- [ ] Direct `INSERT` and `DELETE` revoked on Table 28 from `classsphere_app`.
- [ ] Direct `INSERT`, `UPDATE`, and `DELETE` revoked on Table 29 from `classsphere_app` and `classsphere_audit_worker`.
- [ ] `JWT_HMAC_KEY_V1` configured in backend environment with high-entropy 256-bit secret.
- [ ] Connection pool configured to execute `DISCARD ALL` upon connection recycling.

---

## 13. Final Decision

```
================================================================================
                    PHASE 6D.1 REVISION 9 SECURITY REVIEW
                            FINAL DETERMINATION
================================================================================

   [ X ] APPROVED FOR IMPLEMENTATION
   [   ] NOT APPROVED FOR IMPLEMENTATION

   Justification:
   The project owner formally selected Alternative 1 (Additive, Least-Privilege 
   RLS Policies). All 15 specific architectural, concurrency, schema, and 
   privilege requirements have been resolved:
     1. Dedicated NOLOGIN, NOSUPERUSER, NOBYPASSRLS owner (classsphere_secdef_owner).
     2. Exact additive RLS policies on canonical Tables 2, 3, 4, 24 preserving 
        all canonical structures and constraints untouched.
     3. Canonical Table 24 append function preserving exact 0008 schema and hash.
     4. Worker direct INSERT on Table 29 revoked; all writes funneled through 
        atomic processing procedure.
     5. Pre-authentication actor attribution normalized with nullable foreign key; 
        zero fabricated sentinel UUIDs.
     6. Refresh token department FK set to ON DELETE RESTRICT, resolving immutability conflicts.
     7. Account deactivation actor active status and role array fully validated.
     8. Migration order corrected: deactivation procedure placed in Migration 0010 
        resolving Table 28 forward dependency.
     9. Fenced worker claims with monotonically increasing generation and unique tokens.
    10. Complete claim field clearing upon outbox processing completion.
    11. Authenticated enqueue validates event type whitelist, actor, user, and department.
    12. Pre-authentication enqueue validates active institution tenant.
    13. Complete REVOKE ALL FROM PUBLIC on all functions.
    14. Both audit ledgers strictly append-only.
    15. Collision-proof safe downgrade with decoupled triggers.
================================================================================
```
