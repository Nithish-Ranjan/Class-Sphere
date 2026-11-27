"""fix_demo_fixture_guard

The Phase 6D ``fn_lock_demo_fixtures`` trigger function referenced
``NEW.institution_id`` directly. That column does not exist on
``class_sessions`` or ``activity_events``, so *every* UPDATE on those tables
(including legitimate session status transitions) failed with
``record "new" has no field "institution_id"``.

This revision re-creates the function so it inspects the row generically via
``to_jsonb(NEW)`` and keeps the same immutability guarantee for demo fixtures.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION fn_lock_demo_fixtures()
        RETURNS TRIGGER AS $$
        DECLARE
            is_demo BOOLEAN;
            row_id  TEXT;
        BEGIN
            is_demo := COALESCE((to_jsonb(NEW) ->> 'is_demo_fixture')::BOOLEAN, FALSE);
            IF is_demo THEN
                row_id := to_jsonb(NEW) ->> 'id';
                RAISE EXCEPTION
                    'Demo fixture rows are immutable (table %, id %)', TG_TABLE_NAME, row_id
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION fn_lock_demo_fixtures()
        RETURNS TRIGGER AS $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM institutions WHERE id = NEW.institution_id AND code = 'INST-DEMO'
            ) THEN
                RAISE EXCEPTION 'Demo fixture rows are immutable';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
