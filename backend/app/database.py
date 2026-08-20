from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import DATABASE_URL

# TiDB Serverless (tidbcloud.com) requires SSL/TLS.
# For local TiDB / plain MySQL, ssl_verify_cert=False is harmless.
_connect_args = {}
if "tidbcloud.com" in DATABASE_URL:
    _connect_args = {"ssl": {"verify_mode": "VERIFY_IDENTITY"}}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # detect stale connections
    pool_recycle=1800,
    connect_args=_connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
