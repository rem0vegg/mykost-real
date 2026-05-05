# MyKost - Multi-user Marketplace

Software Engineering Course Project — Docker + React + Node.js + PostgreSQL

## Setup & Run

### Prerequisites
- Docker Desktop installed and running

### Start the app
```bash
docker-compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health check**: http://localhost:5000/api/health

### Stop
```bash
docker-compose down
```

### Clean reset (delete all data — required after schema changes)
```bash
docker-compose down -v
docker-compose up --build
```

---

## Test Accounts

All accounts use password: `password123`

| Role  | Email             | Password    |
|-------|-------------------|-------------|
| User  | user@test.com     | password123 |
| Agent | agent@test.com    | password123 |
| Mover | mover@test.com    | password123 |

The login page has quick-fill buttons for each test account.

---

## Features

- **Multi-role authentication** — JWT-based login/register with bcrypt password hashing
- **User role** — Create survey orders, create moving orders, track status, chat with assigned worker
- **Agent role** — Browse available survey orders, accept jobs, update status, chat with clients
- **Mover role** — Browse available moving orders, accept jobs, update status, chat with clients
- **Status tracking** — Full status history timeline per order
- **In-app chat** — Simple polling-based chat per order (no WebSocket needed)
- **Profile management** — Edit name/phone/location, change password

---

## Architecture

```
mykost/
├── docker-compose.yml      # All services
├── frontend/               # React 18 + Vite
│   └── src/
│       ├── pages/          # LoginPage, RegisterPage, DashboardPage (role-based),
│       │                     ProfilePage, SurveyOrderDetailPage, MovingOrderDetailPage
│       ├── components/     # Navbar, ProtectedRoute, Chat, StatusBadge, StatusTimeline
│       ├── services/       # Axios instance with JWT interceptor
│       └── store/          # Zustand auth store
└── backend/                # Node.js + Express
    └── src/
        ├── routes/         # auth, users, survey-orders, moving-orders, messages
        ├── controllers/    # Business logic per resource
        ├── middleware/     # JWT authenticate, requireRole
        └── db/
            ├── schema.sql  # Full PostgreSQL schema
            └── seed.sql    # Test accounts
```

**Tech stack:**
- Frontend: React 18, Vite, Zustand, Axios, React Router v6
- Backend: Node.js, Express, pg (PostgreSQL driver), bcryptjs, jsonwebtoken, Joi
- Database: PostgreSQL 15
- Container: Docker Compose

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | — | Register new user |
| POST | /api/auth/login | — | Login |
| GET | /api/auth/me | any | Current user |
| GET | /api/users/profile | any | Get profile |
| PUT | /api/users/profile | any | Update profile |
| POST | /api/users/change-password | any | Change password |
| POST | /api/survey-orders | user | Create survey order |
| GET | /api/survey-orders | user | List own orders |
| GET | /api/survey-orders/available | agent | List pending orders |
| GET | /api/survey-orders/my-orders | agent | Agent's accepted orders |
| POST | /api/survey-orders/:id/accept | agent | Accept order |
| PUT | /api/survey-orders/:id/status | agent | Update order status |
| GET | /api/survey-orders/:id | user/agent | Order detail + history |
| POST | /api/moving-orders | user | Create moving order |
| GET | /api/moving-orders | user | List own orders |
| GET | /api/moving-orders/available | mover | List pending jobs |
| GET | /api/moving-orders/my-jobs | mover | Mover's accepted jobs |
| POST | /api/moving-orders/:id/accept | mover | Accept job |
| PUT | /api/moving-orders/:id/status | mover | Update job status |
| GET | /api/moving-orders/:id | user/mover | Job detail + history |
| GET | /api/messages/:orderId | any | Get messages |
| POST | /api/messages/:orderId | any | Send message |
| GET | /api/messages/unread | any | Unread count |
