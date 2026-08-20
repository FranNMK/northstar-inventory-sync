# SCOPE_DELTA.md — Polling → Webhook Migration

**Service:** Northstar Inventory Sync  
**Original spec:** v1 (polling)  **Current spec:** v2 (webhook)

---

## Dropped

| Item | Detail |
|---|---|
| Scheduled polling job | The v1 design called for a background scheduler that called the warehouse stock API every 5 minutes. That job has been removed entirely and is not running anywhere in v2. |
| Warehouse API client | The HTTP client used by the polling job to call the warehouse's read endpoint is gone; we no longer initiate any outbound calls to the warehouse at runtime. |
| APScheduler / Celery dependency | Any task-scheduler library used to drive the cron-style polling has been dropped from `requirements.txt`. |

---

## Modified

| Item | Before | After |
|---|---|---|
| Stock freshness guarantee | At most 5 minutes stale (next poll cycle) | Near-real-time — updated within seconds of a warehouse event |
| `products.last_updated` column | Written on each poll sweep | Written only when a webhook event arrives or a manual seed is run |
| `requirements.txt` | Included scheduler lib | Replaced with `httpx` (test sender only), `cryptography` (HMAC) |
| CORS origin | Not required (no browser client in v1) | Now allows `http://localhost:5173` for the Vite dev server |

---

## Added

| Item | Detail |
|---|---|
| `POST /webhooks/inventory-update` | New webhook receiver endpoint. Accepts warehouse push events, verifies HMAC-SHA256 signature, persists stock + audit event, returns fast 200 ack. |
| HMAC-SHA256 signature verification | `X-Webhook-Signature: sha256=<hex>` header checked on every inbound webhook using a shared secret from `WEBHOOK_SECRET` env var. Unsigned requests are rejected 401. |
| `inventory_events` table | Audit log capturing `old_stock`, `new_stock`, `received_at`, and `source` for every webhook event received. |
| `simulate_warehouse.py` | Local test script that signs and posts fake webhook events so the team can drive the whole flow without a real warehouse connection. |
| `seed_db.py` | One-time seed script to populate the `products` table for local development. |
| Frontend `usePolling` hook | Short-interval (12 s) refetch in the React UI so the display refreshes after the backend receives webhook updates — distinct from the retired backend warehouse-polling approach. |
| `GET /products` category filter | Query parameter `?category=` for narrowing the product list. |

---

## Regression Risk and Verification

**Risk:** The switch from pull to push creates a gap between the moment a warehouse event happens and the moment our system learns about it — previously we'd catch any change within 5 minutes regardless of whether the warehouse chose to notify us. If the warehouse fails to send a webhook (network partition, misconfiguration, bug), our stock data silently goes stale without any on-box indicator. A second, smaller risk is that the new HMAC verification adds a new failure mode: if the shared secret is rotated on the warehouse side without being updated in our `.env`, all webhook deliveries will be rejected with 401 until the secret is re-synced.

**How it was checked:** The `simulate_warehouse.py` script exercises the full round-trip — it signs a payload with the configured secret, posts it to the running FastAPI service, and confirms a 200 response, then `GET /products` is called to verify the stock value has changed. The HMAC rejection path was verified by sending a request with a tampered signature (manually changed one character of the hex digest) and confirming the endpoint returns 401. The frontend was verified to reflect updated stock within one 12-second poll cycle after the simulator runs.
