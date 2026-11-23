"""
Domain 8: Governance Models
Canonical Table 24: administrative_audit_ledger
Canonical Table 25: notifications
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import String, Integer, BigInteger, Boolean, ForeignKey, UniqueConstraint, CheckConstraint, DateTime, Text, func
from app.models.base import Base, UUIDPrimaryKeyMixin

class AdministrativeAuditLedger(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "administrative_audit_ledger"
    __table_args__ = (
        UniqueConstraint("department_id", "block_index", name="uq_dept_ledger_block"),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    endorsed_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    block_index: Mapped[int] = mapped_column(BigInteger, nullable=False)
    previous_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    ledger_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    report_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )


class Notification(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint("category IN ('ATTENDANCE', 'INCIDENT', 'SYSTEM', 'TIMETABLE')", name="chk_notification_category"),
    )

    recipient_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_target: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )
