"""
FastAPI application entry point for the Northstar Inventory Sync service.
"""

import logging
import logging.config

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import products, webhooks

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
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────────────────────
app.include_router(webhooks.router)
app.include_router(products.router)


# ── DB bootstrap ───────────────────────────────────────────────────────────────
@app.on_event("startup")
def create_tables() -> None:
    """Create tables if they don't already exist (idempotent)."""
    Base.metadata.create_all(bind=engine)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}
