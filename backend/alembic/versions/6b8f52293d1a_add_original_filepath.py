"""add original_filepath

Revision ID: 6b8f52293d1a
Revises: d0ce8586fab5
Create Date: 2026-04-29 15:32:41.990909

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6b8f52293d1a'
down_revision: Union[str, Sequence[str], None] = 'd0ce8586fab5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('datasets', sa.Column('original_filepath', sa.String(), nullable=True))    # ### end Alembic commands ###


def downgrade() -> None:
    op.drop_column('datasets', 'original_filepath')