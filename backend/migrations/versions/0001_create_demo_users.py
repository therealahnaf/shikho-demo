"""create demo users

Revision ID: 0001_demo_users
Revises:
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_demo_users"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "demo_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("username", sa.String(length=30), nullable=False),
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column("class_level", sa.String(length=30), nullable=False),
        sa.Column("curriculum", sa.String(length=40), nullable=False),
        sa.Column("preferred_subject", sa.String(length=50), nullable=False),
        sa.Column("school_name", sa.String(length=120), nullable=True),
        sa.Column("access_key", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "username ~ '^[a-z0-9_]{3,30}$'",
            name=op.f("ck_demo_users_username_format"),
        ),
        sa.CheckConstraint(
            "char_length(display_name) BETWEEN 2 AND 80",
            name=op.f("ck_demo_users_display_name_length"),
        ),
        sa.CheckConstraint(
            "class_level = 'class_10'", name=op.f("ck_demo_users_class_level")
        ),
        sa.CheckConstraint(
            "curriculum = 'nctb_bangla'", name=op.f("ck_demo_users_curriculum")
        ),
        sa.CheckConstraint(
            "preferred_subject = 'mathematics'",
            name=op.f("ck_demo_users_preferred_subject"),
        ),
        sa.CheckConstraint(
            "access_key ~ '^SC-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'",
            name=op.f("ck_demo_users_access_key_format"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_demo_users")),
        sa.UniqueConstraint("access_key", name=op.f("uq_demo_users_access_key")),
        sa.UniqueConstraint("username", name=op.f("uq_demo_users_username")),
    )


def downgrade() -> None:
    op.drop_table("demo_users")
