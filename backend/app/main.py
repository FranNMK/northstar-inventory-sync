"""
FastAPI application entry point for the Northstar Inventory Sync service.
"""

import logging
import logging.config

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import products, webhooks
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Northstar Inventory Sync",
    description=(
        "Keeps product stock levels accurate in real time using a webhook push model. "
        "The warehouse sends updates to us; we never poll the warehouse."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────────────────────
app.include_router(webhooks.router)
app.include_router(products.router)
app.include_router(auth_router)
app.include_router(admin_router)


# ── DB bootstrap ───────────────────────────────────────────────────────────────
@app.on_event("startup")
def create_tables() -> None:
    """Create tables and apply additive column migrations (idempotent).
    Logs a clear error and continues if the DB is unreachable at startup.
    """
    import logging as _logging
    from sqlalchemy import text as _text

    log = _logging.getLogger(__name__)
    try:
        Base.metadata.create_all(bind=engine)
        log.info("Database tables verified/created OK.")

        # Additive migrations — ALTER TABLE is safe to re-run; MySQL error 1060
        # ("Duplicate column") is caught and ignored so restarts are idempotent.
        _migrations = [
            "ALTER TABLE products ADD COLUMN price DOUBLE NULL DEFAULT NULL",
            "ALTER TABLE products ADD COLUMN image_url VARCHAR(512) NULL DEFAULT NULL",
        ]
        with engine.connect() as _conn:
            for _sql in _migrations:
                try:
                    _conn.execute(_text(_sql))
                    _conn.commit()
                except Exception as _col_exc:
                    if "1060" in str(_col_exc):  # Duplicate column — already applied
                        pass
                    else:
                        raise
        log.info("Column migrations verified OK.")

    except Exception as exc:  # noqa: BLE001
        _logging.getLogger(__name__).error(
            "Could not connect to database at startup: %s\n"
            "Check DATABASE_URL in backend/.env — see README.md for TiDB Serverless format.",
            exc,
        )


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}
