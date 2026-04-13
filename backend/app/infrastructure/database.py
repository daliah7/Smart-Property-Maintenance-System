from __future__ import annotations

from typing import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.infrastructure.models import Base

engine = create_engine(settings.database_url, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, future=True)


def init_database() -> None:
    Base.metadata.create_all(bind=engine)
    # Inline migration: add priority column to existing databases
    with engine.connect() as conn:
        try:
            conn.execute(
                text("ALTER TABLE maintenance_tickets ADD COLUMN priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'")
            )
            conn.commit()
        except Exception:
            pass  # Column already exists — safe to ignore


def get_session() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
