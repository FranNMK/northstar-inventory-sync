# Northstar Inventory Sync

Real-time inventory management with webhook-driven stock updates, JWT authentication, and an admin product panel.

The warehouse **pushes** stock changes to the API — the system never polls the warehouse.

---

## Live deployment

| Service | URL |
|---|---|
| **Backend API** | https://northstar-inventory-sync-mjpa.onrender.com |
| **Frontend** | https://northstar-inventory-ui.onrender.com |
| **API docs** | https://northstar-inventory-sync-mjpa.onrender.com/docs |
| **Health check** | https://northstar-inventory-sync-mjpa.onrender.com/health |

> **Free-tier note:** The backend spins down after 15 minutes of inactivity. The first request after a period of idle will take up to 30 seconds while the service cold-starts. Upgrade to Render's $7/month Starter plan to keep it always-on.

---

## Architecture

```
Warehouse ──POST /webhooks/inventory-update──► FastAPI ──► TiDB Serverless
                                                   ▲
React (12 s poll) ──GET /products─────────────────┘

Admin browser ──POST /auth/login──► JWT ──► PUT /admin/products/:id
```

**Backend — FastAPI + TiDB Serverless**
- Webhook receiver: verifies HMAC-SHA256 signature, writes new stock + audit event, acks 200 immediately
- Auth: bcrypt password hashing, HS256 JWT access tokens, `get_current_user` / `require_admin` FastAPI dependencies
- Admin endpoints: create, update, delete products (admin role only); partial updates via `model_fields_set`
- Query API: reads directly from TiDB; DB kept fresh by incoming webhook events, not polling
- Idempotent startup migrations: `ALTER TABLE` for `price` and `image_url` columns run on every boot

**Frontend — React + Vite**
- Public product list with live stock badges, thumbnails, and KSh prices; auto-refreshes every 12 s
- Login / signup forms with show/hide password toggle; JWT stored in `sessionStorage`
- Admin panel: add/edit/delete products, live image URL preview, toast feedback, loading states on every button
- `ProtectedRoute` redirects unauthenticated users to `/login`; catches 401 and redirects on token expiry
- SPA routing handled by `_redirects` file (Render static site)

---

## Repository structure

```
northstar-inventory-sync/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, startup migrations
│   │   ├── config.py        # env var loading
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   ├── models.py        # User, Product, InventoryEvent ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── auth.py          # bcrypt, JWT helpers, FastAPI dependencies
│   │   └── routers/
│   │       ├── products.py  # GET /products, GET /products/{id}/stock
│   │       ├── webhooks.py  # POST /webhooks/inventory-update
│   │       ├── auth.py      # POST /auth/signup, /auth/login, GET /auth/me
│   │       └── admin.py     # POST/PUT/DELETE /admin/products
│   ├── seed_db.py           # one-time sample data seed
│   ├── simulate_warehouse.py # local webhook event simulator
│   ├── requirements.txt
│   ├── Procfile             # Render start command
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api.js           # all API calls, in-memory token store
│   │   ├── App.jsx          # router + providers
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── components/
│   │   │   ├── NavBar.jsx
│   │   │   ├── ProductList.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── StockBadge.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── Spinner.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── hooks/usePolling.js
│   │   └── index.css
│   ├── public/_redirects    # Render SPA fallback: /* -> /index.html 200
│   └── .env.example
├── render.yaml              # Render blueprint (both services)
└── .gitignore
```

---

## Local development

### Prerequisites

- Python 3.11+
- Node 18+
- A TiDB Serverless cluster — free tier at [tidbcloud.com](https://tidbcloud.com) — or local MySQL on port 4000/3306

### 1. Clone

```bash
git clone https://github.com/FranNMK/northstar-inventory-sync.git
cd northstar-inventory-sync
```

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt

# Configure — copy the example and fill in your values
copy .env.example .env        # Windows
cp .env.example .env          # macOS / Linux
```

**`backend/.env` values:**

```env
DATABASE_URL=mysql+pymysql://<prefix>.<user>:<password>@<host>:4000/northstar_inventory
WEBHOOK_SECRET=<run: python -c "import secrets; print(secrets.token_hex(32))">
JWT_SECRET=<run same command again for a different value>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
# FRONTEND_URL=              # leave blank for local dev
```

```bash
# Seed sample products (run once)
python seed_db.py

# Start the API server
uvicorn app.main:app --reload
# API:  http://localhost:8000
# Docs: http://localhost:8000/docs
```

### 3. Frontend

```bash
cd frontend
npm install
# .env.example is already set to http://localhost:8000 — no edit needed
npm run dev
# → http://localhost:5173
```

### 4. Simulate live stock updates

Open a second terminal with the venv active:

```bash
cd backend

# Single event
python simulate_warehouse.py

# Continuous stream — updates every 4 seconds (Ctrl+C to stop)
python simulate_warehouse.py --loop --interval 4
```

Watch the React UI — stock levels update within 12 seconds.

---

## Deploying to Render

### Backend (Web Service)

1. [render.com](https://render.com) → **New** → **Web Service** → connect `northstar-inventory-sync` repo
2. Settings:

| Field | Value |
|---|---|
| **Root directory** | `backend` |
| **Runtime** | Python 3 |
| **Build command** | `pip install -r requirements.txt` |
| **Start command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Region** | EU Central (closest to TiDB cluster) |

3. **Environment variables** — all six are required:

| Key | Value |
|---|---|
| `DATABASE_URL` | TiDB Serverless connection string from the TiDB Cloud console |
| `WEBHOOK_SECRET` | Strong random hex — `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_SECRET` | Another strong random hex — same command |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRE_MINUTES` | `60` |
| `FRONTEND_URL` | Your Render static site URL (set after frontend is deployed) |

4. Click **Create Web Service**. Copy the URL (e.g. `https://northstar-inventory-sync-mjpa.onrender.com`).

### Frontend (Static Site)

1. **New** → **Static Site** → same repo
2. Settings:

| Field | Value |
|---|---|
| **Root directory** | `frontend` |
| **Build command** | `npm install && npm run build` |
| **Publish directory** | `dist` |

3. Environment variable:

| Key | Value |
|---|---|
| `VITE_API_URL` | Your backend URL — **no trailing slash** — e.g. `https://northstar-inventory-sync-mjpa.onrender.com` |

4. Click **Create Static Site**.

### Post-deploy: wire CORS

Go back to the **backend** service → Environment → add/update:

```
FRONTEND_URL = https://northstar-inventory-ui.onrender.com
```

Render auto-redeploys. Done.

### Verify

```bash
# Backend health
curl https://northstar-inventory-sync-mjpa.onrender.com/health
# → {"status":"ok"}

# Products
curl https://northstar-inventory-sync-mjpa.onrender.com/products
# → [{...}, ...]
```

### Common deployment issues

| Symptom | Cause | Fix |
|---|---|---|
| Backend returns 503 on startup | Missing env var (`JWT_SECRET`, `DATABASE_URL`) — process exits immediately | Check Render Logs tab; add all 6 env vars; Manual Deploy |
| `//products` or `//auth/login` double-slash in browser | `VITE_API_URL` had a trailing slash | Remove trailing slash from the env var in Render dashboard |
| Frontend shows 404 on direct URL / refresh | `_redirects` file missing or static site not configured correctly | Confirm `frontend/public/_redirects` contains `/* /index.html 200` |
| `OperationalError: Missing user name prefix` | TiDB username not in `prefix.user` format | Use the full connection string from TiDB Cloud — includes the prefix |
| Backend cold-start timeout (~30 s) | Free-tier service sleeps after 15 min idle | Upgrade to Render Starter ($7/mo) for always-on |

---

## API reference

### Public endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Health check; returns `{"status":"ok"}` |
| `GET` | `/products` | — | All products with stock status, price, image; `?category=` filter |
| `GET` | `/products/{id}/stock` | — | Single product live stock level |

### Auth endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | — | Register — body: `{email, password, role}` |
| `POST` | `/auth/login` | — | Login — body: `{email, password}`; returns JWT |
| `GET` | `/auth/me` | JWT | Returns current user `{id, email, role, created_at}` |

### Admin endpoints (JWT + admin role)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/admin/products` | Admin JWT | Create product — body: `{id, name, category, current_stock, price?, image_url?}` |
| `PUT` | `/admin/products/{id}` | Admin JWT | Partial update — only fields present in body are written |
| `DELETE` | `/admin/products/{id}` | Admin JWT | Delete product permanently |

### Warehouse webhook

| Method | Path | Description |
|---|---|---|
| `POST` | `/webhooks/inventory-update` | Receive stock push; requires `X-Webhook-Signature: sha256=<hmac-sha256-hex>` header |

Unsigned or tampered requests are rejected **401**.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | SQLAlchemy MySQL connection string |
| `WEBHOOK_SECRET` | ✅ | — | HMAC-SHA256 shared secret for webhook signature verification |
| `JWT_SECRET` | ✅ | — | Secret for signing JWT access tokens |
| `JWT_ALGORITHM` | — | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES` | — | `60` | Access token lifetime |
| `FRONTEND_URL` | — | _(none)_ | Deployed frontend origin added to CORS (comma-separate multiple) |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL — **no trailing slash** |

---

## Database schema

Tables and columns are created automatically on startup. The `price` and `image_url` column migrations run on every boot and are safe to re-run (duplicate-column errors are silently ignored).

```sql
-- Users table (authentication)
CREATE TABLE users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,          -- bcrypt
  role            VARCHAR(32)  NOT NULL DEFAULT 'staff',  -- 'admin' | 'staff'
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_users_email (email)
);

-- Products table
CREATE TABLE products (
  id            VARCHAR(64)  PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(128) NOT NULL,
  current_stock INT          NOT NULL DEFAULT 0,
  price         DOUBLE       NULL,                -- KSh; NULL = not set
  image_url     VARCHAR(512) NULL,
  last_updated  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Webhook audit log
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
