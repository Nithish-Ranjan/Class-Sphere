"""
Domain 6: Observable Telemetry Models
Canonical Table 19: activity_events
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, Boolean, ForeignKey, CheckConstraint, DateTime, func
from app.models.base import Base, UUIDPrimaryKeyMixin

class ActivityEvent(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "activity_events"
    __table_args__ = (
        CheckConstraint(
            "event_code IN ('PHONE', 'TALKING', 'HEAD_DOWN', 'NOTE_PASSING', 'OUT_OF_SEAT')",
            name="chk_activity_event_code",
        ),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("class_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_code: Mapped[str] = mapped_column(String(32), nullable=False)
    event_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    location_marker: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    is_demo_fixture: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )
