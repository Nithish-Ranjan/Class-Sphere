"""
Domain 3: Infrastructure Models
Canonical Table 9: classrooms
"""
import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, Integer, Boolean, ForeignKey, UniqueConstraint, DateTime, func
from app.models.base import Base, UUIDPrimaryKeyMixin

class Classroom(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "classrooms"
    __table_args__ = (
        UniqueConstraint("department_id", "room_number", name="uq_classrooms_dept_room"),
        UniqueConstraint("department_id", "id", name="uq_classrooms_dept_id"),
    )

    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_number: Mapped[str] = mapped_column(String(32), nullable=False)
    building: Mapped[str] = mapped_column(String(64), nullable=False)
    floor: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    desk_capacity: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    has_camera: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )
