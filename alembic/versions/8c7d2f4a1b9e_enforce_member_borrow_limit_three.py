"""enforce member borrow limit three

Revision ID: 8c7d2f4a1b9e
Revises: 5ad6398b0fa0
Create Date: 2026-03-03 18:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8c7d2f4a1b9e"
down_revision: Union[str, Sequence[str], None] = "5ad6398b0fa0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Backfill existing rows before adding stricter constraints.
    op.execute(
        "UPDATE member_profiles SET borrow_limit = 3 "
        "WHERE borrow_limit IS NULL OR borrow_limit <> 3"
    )

    op.alter_column(
        "member_profiles",
        "borrow_limit",
        existing_type=sa.Integer(),
        nullable=False,
        server_default=sa.text("3"),
    )
    op.create_check_constraint(
        "ck_member_profiles_borrow_limit_three",
        "member_profiles",
        "borrow_limit = 3",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "ck_member_profiles_borrow_limit_three",
        "member_profiles",
        type_="check",
    )
    op.alter_column(
        "member_profiles",
        "borrow_limit",
        existing_type=sa.Integer(),
        nullable=True,
        server_default=None,
    )
