# Northstar Inventory Sync

Real-time inventory management with webhook-driven stock updates, JWT authentication, and an admin product panel.

The warehouse **pushes** stock changes to the API — the system never polls the warehouse.

---

## Live deployment (Render)

| Service | URL |
|---|---|
| Backend API | `https://northstar-inventory-sync.onrender.com` |
| Frontend | `https://northstar-inventory-sync-frontend.onrender.com` |
| API docs | `https://northstar-inventory-sync.onrender.com/docs` |

> Update these URLs after your first deploy.

---

## Architecture

```
Warehouse ──POST /webhooks/inventory-update──► FastAPI ──► TiDB Serverless
                                                  ▲
React (12 s poll) ──GET /products────────────────┘

Admin browser ──POST /auth/login──► JWT ──► PUT /admin/products/:id
```

**Backend (FastAPI + TiDB)**
- Webhook receiver — verifies HMAC-SHA256, writes stock + audit event, acks 200
- Auth — bcrypt passwords, JWT access tokens (HS256)
- Admin endpoints — create / update / delete products (admin role only)
- Query API — reads directly from TiDB; DB kept fresh by webhook events

**Frontend (React + Vite)**
- Public product list with live stock badges, price (KSh), and product images
- Login / signup pages; JWT stored in sessionStorage
- Admin panel — add/edit/delete products with live image preview and toast feedback
- Polls `GET /products` every 12 s; auto-redirects to login on token expiry

---

## Deploy to Render

### Is Render a good fit?

Yes. Render suits this project well:

| Consideration | Verdict |
|---|---|
| Python / FastAPI | ✅ Native support — detects `requirements.txt` automatically |
| Static React frontend | ✅ Free static site hosting with CDN |
| TiDB Serverless DB | ✅ External — no Render DB needed; just set `DATABASE_URL` |
| Free tier | ✅ Both services run on Render's free tier (spins down after 15 min inactivity) |
| Webhook receiver | ✅ Render gives each service a stable public HTTPS URL |
| Environment secrets | ✅ Set via dashboard — never in code |

The only free-tier caveat: the backend **sleeps after 15 minutes of inactivity** and takes ~30 s to cold-start on the next request. Upgrade to the $7/month Starter plan to keep it always-on.

---

### Step 1 — Push your code to GitHub

Make sure your latest changes are committed and pushed:

```bash
git add -A
git commit -m "chore: prepare for Render deployment"
git push origin main
```

Confirm `backend/.env` is **not** in the repository:

```bash
git ls-files backend/.env   # must return nothing
```

---

### Step 2 — Deploy the backend (Web Service)

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo (`northstar-inventory-sync`)
3. Fill in the settings:

| Field | Value |
|---|---|
| **Name** | `northstar-inventory-sync` |
| **Region** | EU Central (closest to your TiDB cluster) |
| **Root directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build command** | `pip install -r requirements.txt` |
| **Start command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance type** | Free (or Starter for always-on) |

4. Click **Advanced** → **Add Environment Variable** — add all five:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your TiDB Serverless connection string (from TiDB Cloud console) |
| `WEBHOOK_SECRET` | A strong random hex string — run `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_SECRET` | Another strong random hex string — same command |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRE_MINUTES` | `60` |

5. Click **Create Web Service** — Render builds and deploys automatically.
6. Copy the service URL (e.g. `https://northstar-inventory-sync.onrender.com`) — you need it for Step 3.

---

### Step 3 — Deploy the frontend (Static Site)

**Before deploying**, set the backend URL in the frontend build:

1. In your repo, edit `frontend/.env.example` — note the `VITE_API_URL` variable.
2. On Render: **New** → **Static Site**
3. Settings:

| Field | Value |
|---|---|
| **Name** | `northstar-inventory-sync-frontend` |
| **Root directory** | `frontend` |
| **Build command** | `npm install && npm run build` |
| **Publish directory** | `dist` |

4. **Add Environment Variable:**

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://northstar-inventory-sync.onrender.com` (your backend URL from Step 2) |

5. Click **Create Static Site** — Render builds and serves the compiled React app.

---

### Step 4 — Update CORS on the backend

Once you have your frontend URL (e.g. `https://northstar-inventory-sync-frontend.onrender.com`), add it to the `allow_origins` list in [`backend/app/main.py`](backend/app/main.py):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                                  # local dev
        "https://northstar-inventory-sync-frontend.onrender.com", # production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit and push — Render auto-redeploys on every push to `main`.

---

### Step 5 — Verify the deployment

```bash
# Health check
curl https://northstar-inventory-sync.onrender.com/health
# → {"status":"ok"}

# Products list
curl https://northstar-inventory-sync.onrender.com/products
# → [{...}, ...]

# API docs
open https://northstar-inventory-sync.onrender.com/docs
```

---

### Step 6 — Point the webhook simulator at production

To push live stock updates to the deployed backend:

```bash
cd backend
API_BASE_URL=https://northstar-inventory-sync.onrender.com \
  python simulate_warehouse.py --loop --interval 10
```

Or set `API_BASE_URL` in your local `.env`.

---

## Local development

### Prerequisites

- Python 3.11+
- Node 18+
- A TiDB Serverless cluster (free tier at [tidbcloud.com](https://tidbcloud.com)) or local MySQL/TiDB

### 1. Clone and configure

```bash
git clone https://github.com/FranNMK/northstar-inventory-sync.git
cd northstar-inventory-sync
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt

# Create your local config
copy .env.example .env     # Windows
cp .env.example .env       # macOS/Linux

# Edit .env — fill in DATABASE_URL, WEBHOOK_SECRET, JWT_SECRET
```

`.env` reference:

```env
DATABASE_URL=mysql+pymysql://<user>:<password>@<host>:4000/northstar_inventory
WEBHOOK_SECRET=<random-hex-32>
JWT_SECRET=<random-hex-32>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```

Generate secrets:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

```bash
# Create tables and seed sample products
python seed_db.py

# Start API server
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # already set to http://localhost:8000
npm install
npm run dev
# → http://localhost:5173
```

### 4. Simulate stock updates

```bash
# In a second terminal (venv active)
cd backend
python simulate_warehouse.py --loop --interval 4
```

Watch the React UI — stock levels update within 12 seconds.

---

## API reference

### Public

| Method | Path | Description |
|---|---|---|
| `GET` | `/products` | List all products with stock status; optional `?category=` filter |
| `GET` | `/products/{id}/stock` | Single-product live stock level |
| `GET` | `/health` | Health check |

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register a new user (`email`, `password`, `role`) |
| `POST` | `/auth/login` | Verify credentials, returns JWT access token |
| `GET` | `/auth/me` | Return current user (requires JWT) |

### Admin (JWT + admin role required)

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/products` | Create a new product |
| `PUT` | `/admin/products/{id}` | Update a product (partial — only sent fields are written) |
| `DELETE` | `/admin/products/{id}` | Delete a product |

### Warehouse webhook

| Method | Path | Description |
|---|---|---|
| `POST` | `/webhooks/inventory-update` | Receive stock update; requires `X-Webhook-Signature: sha256=<hmac>` |

**Signature format:**
```
X-Webhook-Signature: sha256=<hmac-sha256-hex-of-raw-body>
```
Unsigned or tampered requests are rejected with **401**.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLAlchemy connection string |
| `WEBHOOK_SECRET` | ✅ | Shared HMAC-SHA256 secret for webhook verification |
| `JWT_SECRET` | ✅ | Secret key for signing JWT tokens |
| `JWT_ALGORITHM` | — | Token algorithm (default: `HS256`) |
| `JWT_EXPIRE_MINUTES` | — | Token lifetime in minutes (default: `60`) |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |

---

## Database schema

Tables are created automatically on startup. The two `ALTER TABLE` migrations for `price` and `image_url` are also applied automatically and are safe to re-run.

```sql
CREATE TABLE users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  role            VARCHAR(32)  NOT NULL DEFAULT 'staff',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id            VARCHAR(64)  PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(128) NOT NULL,
  current_stock INT          NOT NULL DEFAULT 0,
  price         DOUBLE       NULL,
  image_url     VARCHAR(512) NULL,
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
