from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, false, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class DemoUser(Base):
    __tablename__ = "demo_users"
    __table_args__ = (
        CheckConstraint(
            "username ~ '^[a-z0-9_]{3,30}$'", name="username_format"
        ),
        CheckConstraint(
            "char_length(display_name) BETWEEN 2 AND 80",
            name="display_name_length",
        ),
        CheckConstraint("class_level = 'class_10'", name="class_level"),
        CheckConstraint(
            "curriculum = 'nctb_bangla'", name="curriculum"
        ),
        CheckConstraint(
            "preferred_subject = 'mathematics'",
            name="preferred_subject",
        ),
        CheckConstraint(
            "access_key ~ '^SC-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'",
            name="access_key_format",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    class_level: Mapped[str] = mapped_column(String(30), nullable=False)
    curriculum: Mapped[str] = mapped_column(String(40), nullable=False)
    preferred_subject: Mapped[str] = mapped_column(String(50), nullable=False)
    school_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    access_key: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    is_seed_fixture: Mapped[bool] = mapped_column(
        Boolean, server_default=false(), default=False, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
