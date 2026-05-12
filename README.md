# MyKost

Platform marketplace untuk **survey kost** dan **jasa pindahan** — menghubungkan pelanggan dengan surveyor dan mover terverifikasi.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6, Zustand, Axios |
| Backend | Node.js, Express.js, Joi |
| Database | PostgreSQL 15 |
| Auth | JWT (`jsonwebtoken`), `bcryptjs` |
| Maps | Leaflet + react-leaflet |
| File Upload | Multer |
| Container | Docker Compose |

---

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Docker Compose v2 (bundled with Docker Desktop)
- Ports `5173` (frontend) and `5000` (backend) must be free

No Node.js or PostgreSQL installation needed — everything runs inside containers.

---

## Setup

**1. Clone and configure environment**

```bash
git clone <repo-url>
cd MyKost
cp .env.example .env
```

Edit `.env` and set a strong `JWT_SECRET` (minimum 32 random characters). The other defaults work out of the box.

**2. Start all services**

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |

**3. Stop**

```bash
docker-compose down
```

**Reset database** (required after schema changes):

```bash
docker-compose down -v && docker-compose up --build
```

### Test Accounts

All accounts use password `password123`. The login page has quick-fill buttons for each.

| Role | Email |
|---|---|
| Customer | user@test.com |
| Surveyor | agent@test.com |
| Mover | mover@test.com |

---

## Features

### Multi-role Accounts
Every account starts as a customer. Users apply separately to become a surveyor or mover — a single account can hold all three roles and switch between workspaces from the dashboard.

### Survey Orders
- **Customer** — request a kost survey with location (map picker), notes, and optional attachments. Fixed price: Rp 75.000.
- **Surveyor** — browse available orders, accept a job, submit results with up to 10 photos and notes.
- Full status timeline: `pending_payment` → `finding_agent` → `assigned` → `result_submitted` → `completed`

### Moving Orders
- **Customer** — create an order with pickup/dropoff locations, vehicle type (motorcycle / van / pickup box), move weight (light/medium/heavy), floor details, and optional add-ons (door-to-door, extra helper, round trip). Price is calculated server-side and shown before payment.
- **Mover** — browse available jobs, accept, update status, and upload condition-proof photos at pickup and delivery.
- Status flow: `DRAFT` → `PENDING_PAYMENT` → `ACCEPTED` → `ON_GOING` → `COMPLETED`

### Pricing Engine (Moving)
Deterministic, server-calculated formula:

```
base = distance_km × vehicle_rate (Rp 2.700 / 13.000 / 20.000 per km)
+ door-to-door add-on: Rp 20.000
+ extra helper:        Rp 75.000
+ high floor (no lift): Rp 20.000
+ heavy items:         Rp 40.000
+ round trip:          50% of subtotal
minimum:               Rp 30.000
rounded to nearest:    Rp 5.000
```

### In-App Chat
Polling-based messaging (15 s interval) between customer and assigned worker per order. Includes unread-count badge in the navbar.

### Notifications
Real-time-style notification bell for order status changes, new messages, and job assignments.

### Reviews & Complaints
- Post-completion star ratings (1–5) for both order types
- File complaints with category selection; status tracks open → in_review → resolved

---

## Architecture

```
MyKost/
├── docker-compose.yml          # Orchestrates frontend, backend, postgres
├── .env.example                # Environment variable template
│
├── frontend/                   # React + Vite SPA
│   └── src/
│       ├── pages/              # Route-level components (landing, auth, dashboards, order details)
│       ├── components/         # Shared UI (Navbar, Chat, StatusTimeline, MapPicker, …)
│       ├── services/           # Axios instance with JWT interceptor
│       └── store/              # Zustand auth store
│
└── backend/                    # Express REST API
    └── src/
        ├── routes/             # auth, users, survey-orders, moving-orders,
        │                       # messages, notifications, reviews, complaints, capabilities
        ├── controllers/        # Business logic per resource
        ├── middleware/         # JWT authenticate, requireRole, Multer upload
        ├── utils/              # Pricing calculator, notification helper
        └── db/
            ├── schema.sql      # Full PostgreSQL schema (auto-run on first boot)
            ├── seed.sql        # Three test accounts
            └── migrations/     # Incremental schema changes
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Universal account model | Users don't choose a role at signup; capabilities are granted via an application workflow, allowing multi-role accounts |
| Polling chat (no WebSocket) | Simpler infra — a 15 s poll is sufficient for the expected load and avoids a persistent connection layer |
| Server-side pricing | Prevents price tampering; the formula is the single source of truth |
| Photo evidence on delivery | Provides proof of item condition at both pickup and drop-off, protecting both parties |
| UUID primary keys | Avoids sequential-ID enumeration in API endpoints |

---

## API Reference

<details>
<summary>Expand full endpoint list</summary>

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Login, returns JWT |
| GET | /api/auth/me | any | Current user info |
| GET | /api/users/profile | any | Get profile |
| PUT | /api/users/profile | any | Update profile |
| POST | /api/users/change-password | any | Change password |
| GET | /api/me/capabilities | any | List own capabilities |
| POST | /api/me/capabilities | any | Apply for a new role |
| POST | /api/survey-orders | customer | Create survey order |
| GET | /api/survey-orders | customer | List own orders |
| GET | /api/survey-orders/:id | customer/agent | Order detail + history |
| GET | /api/survey-orders/available | agent | Browse open orders |
| POST | /api/survey-orders/:id/accept | agent | Accept order |
| PUT | /api/survey-orders/:id/status | agent | Update status |
| POST | /api/survey-orders/:id/result | agent | Submit survey result + photos |
| POST | /api/moving-orders | customer | Create moving order |
| GET | /api/moving-orders | customer | List own orders |
| GET | /api/moving-orders/:id | customer/mover | Order detail |
| GET | /api/moving-orders/available | mover | Browse open jobs |
| POST | /api/moving-orders/:id/accept | mover | Accept job |
| PUT | /api/moving-orders/:id/status | mover | Update status |
| POST | /api/moving-orders/:id/evidence | mover | Upload condition photos |
| GET | /api/messages/:orderId | any | Get messages |
| POST | /api/messages/:orderId | any | Send message |
| GET | /api/messages/unread | any | Unread count |
| GET | /api/notifications | any | Fetch notifications |
| PUT | /api/notifications/:id/read | any | Mark as read |
| POST | /api/reviews | any | Submit review |
| POST | /api/complaints | any | File complaint |
| GET | /api/complaints | any | List own complaints |

</details>
