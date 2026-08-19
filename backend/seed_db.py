#!/usr/bin/env python3
"""
seed_db.py — populate the products table with sample data for local development.

Usage (from backend/ with venv active):
    python seed_db.py
"""

from app.database import SessionLocal
from app.models import Product, Base
from app.database import engine

PRODUCTS = [
    {"id": "SKU-001", "name": "Wireless Headphones",    "category": "Electronics", "current_stock": 42},
    {"id": "SKU-002", "name": "USB-C Charging Cable",   "category": "Electronics", "current_stock": 150},
    {"id": "SKU-003", "name": "Mechanical Keyboard",    "category": "Electronics", "current_stock": 8},
    {"id": "SKU-004", "name": "Laptop Stand",           "category": "Accessories", "current_stock": 0},
    {"id": "SKU-005", "name": "Ergonomic Mouse",        "category": "Electronics", "current_stock": 23},
    {"id": "SKU-006", "name": "Monitor Arm",            "category": "Accessories", "current_stock": 5},
    {"id": "SKU-007", "name": "Webcam HD 1080p",        "category": "Electronics", "current_stock": 17},
    {"id": "SKU-008", "name": "Desk Mat XL",            "category": "Accessories", "current_stock": 3},
    {"id": "SKU-009", "name": "Cable Management Kit",   "category": "Accessories", "current_stock": 0},
    {"id": "SKU-010", "name": "Smart Power Strip",      "category": "Electronics", "current_stock": 60},
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for data in PRODUCTS:
            existing = db.get(Product, data["id"])
            if existing is None:
                db.add(Product(**data))
        db.commit()
        print(f"Seeded {len(PRODUCTS)} products.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
