"""drop circles unique constraint

Revision ID: 0006_multiple_circles
Revises: 0005_mentor_publishing
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_multiple_circles"
down_revision: Union[str, None] = "0005_mentor_publishing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("uq_circles_class_subject", "circles", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint("uq_circles_class_subject", "circles", ["class_level", "subject"])
