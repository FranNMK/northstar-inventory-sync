# Northstar Inventory Sync v2 — Webhook Model

Keeps product stock levels accurate in real time.  
The warehouse **pushes** updates to us via webhook; we never poll the warehouse.

---

## Architecture

```
Warehouse ──POST /webhooks/inventory-update──► FastAPI ──► TiDB
                                                  ▲
React (12 s poll) ──GET /products──────────────── ┘
```

- **Webhook receiver** — verifies HMAC-SHA256 signature, updates `products`, writes audit row to `inventory_events`, acks 200 immediately.
- **Query API** — reads straight from TiDB; the DB is kept fresh by webhook events, not polling.
- **React frontend** — shows all products with stock status badges; auto-refetches every 12 s so it reflects backend updates without a manual reload.

---

## Quick start

### 1. TiDB / MySQL

Create a database:

```sql
CREATE DATABASE northstar_inventory CHARACTER SET utf8mb4;
```

TiDB default port is **4000**; standard MySQL is **3306**.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Configure
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
# Edit .env — set DATABASE_URL and WEBHOOK_SECRET

# Seed sample products
python seed_db.py

# Start the API server
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### 3. Frontend

```bash
cd frontend
copy .env.example .env        # Windows
npm run dev
# → http://localhost:5173
```

### 4. Simulate webhook events

In a second terminal (with venv active):

```bash
cd backend

# Single event
python simulate_warehouse.py

# Continuous stream (Ctrl+C to stop)
python simulate_warehouse.py --loop --interval 4
```

Watch the React UI — stock levels update within ~12 seconds as the simulator fires.

---

## API reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/webhooks/inventory-update` | Receive stock update from warehouse (requires `X-Webhook-Signature`) |
| `GET` | `/products` | List all products with stock status; optional `?category=` filter |
| `GET` | `/products/{product_id}/stock` | Single-product stock level |
| `GET` | `/health` | Health check |

### Webhook signature

The warehouse must include this header:

```
X-Webhook-Signature: sha256=<hmac-sha256-hex-of-raw-body>
```

Computed with the shared `WEBHOOK_SECRET`. Requests without a valid signature are rejected with **401**.

---

## Environment variables

### Backend (`.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string — e.g. `mysql+pymysql://root:pass@localhost:4000/northstar_inventory` |
| `WEBHOOK_SECRET` | Shared secret for HMAC-SHA256 webhook signature verification |

### Frontend (`.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend |

---

## Database schema

```sql
CREATE TABLE products (
  id            VARCHAR(64) PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(128) NOT NULL,
  current_stock INT          NOT NULL DEFAULT 0,
  last_updated  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  VARCHAR(64) NOT NULL,
  old_stock   INT         NOT NULL,
  new_stock   INT         NOT NULL,
  received_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source      VARCHAR(64) NOT NULL DEFAULT 'webhook',
  INDEX idx_product_id (product_id)
);
```

Tables are created automatically on first startup via SQLAlchemy's `Base.metadata.create_all`.
