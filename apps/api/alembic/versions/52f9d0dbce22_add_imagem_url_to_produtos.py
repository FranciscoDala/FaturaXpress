"""add imagem_url to produtos

Revision ID: 52f9d0dbce22
Revises: 5d05d1fff1fd
Create Date: 2026-09-14 10:28:11.603870

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '52f9d0dbce22'
down_revision: str = '5d05d1fff1fd'
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('produtos', sa.Column('imagem_url', sa.String(length=500), nullable=True))

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('produtos', 'imagem_url')
