#!/usr/bin/env python3
"""
simulate_warehouse.py — local test helper

Simulates the warehouse pushing stock-update webhooks to the running FastAPI
service.  Run this from the backend/ directory with the virtual-env active:

    python simulate_warehouse.py

Environment variables (or .env file):
  WEBHOOK_SECRET   — must match the value the API server uses
  API_BASE_URL     — defaults to http://localhost:8000

The script:
  1. Reads product IDs and their current stock from the API (GET /products).
  2. Picks a random product and assigns it a random new stock level.
  3. Signs the payload with HMAC-SHA256 and posts it to the webhook endpoint.
  4. Prints the result.

Run with --loop to keep sending updates every few seconds so you can watch the
React frontend refresh live.
"""

import argparse
import hashlib
import hmac
import json
import os
import random
import time
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
WEBHOOK_SECRET = os.environ["WEBHOOK_SECRET"]


def sign(payload_bytes: bytes) -> str:
    digest = hmac.new(WEBHOOK_SECRET.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def fetch_products() -> list[dict]:
    resp = httpx.get(f"{API_BASE_URL}/products", timeout=5)
    resp.raise_for_status()
    return resp.json()


def send_update(product_id: str, new_stock: int) -> None:
    payload = {
        "product_id": product_id,
        "stock_quantity": new_stock,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    body = json.dumps(payload).encode()
    signature = sign(body)

    resp = httpx.post(
        f"{API_BASE_URL}/webhooks/inventory-update",
        content=body,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
        },
        timeout=5,
    )
    status_icon = "✓" if resp.status_code == 200 else "✗"
    print(
        f"{status_icon}  product={product_id}  new_stock={new_stock}"
        f"  HTTP {resp.status_code}"
    )


def run(loop: bool, interval: float) -> None:
    while True:
        try:
            products = fetch_products()
            if not products:
                print("No products found in the database — seed some first.")
                return

            product = random.choice(products)
            # Randomly drive stock toward 0 to make the demo interesting
            new_stock = random.choice(
                [0, 0, 0, 3, 5, 10, 25, 50, 100]
            )
            send_update(product["id"], new_stock)
        except Exception as exc:
            print(f"Error: {exc}")

        if not loop:
            break
        time.sleep(interval)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simulate warehouse webhook events")
    parser.add_argument(
        "--loop", action="store_true", help="Keep sending events on an interval"
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=4.0,
        help="Seconds between events when --loop is active (default: 4)",
    )
    args = parser.parse_args()
    run(loop=args.loop, interval=args.interval)
