# TaskFlow

A full-stack task management application with authentication, real-time search and
filters, dashboard statistics, and a premium **dark glassmorphism** interface —
deep navy background, frosted glass surfaces, and neon blue/purple accents.

Built with **React 19 + TypeScript + Vite** on the frontend and **Express 5 +
SQLite (better-sqlite3)** on the backend, with JWT authentication and three
testing layers (Jest, Vitest, Playwright) — **97 automated tests**.

---

## Screenshots

All screenshots live in [`screenshots/`](screenshots/) and are regenerated
automatically by the E2E suite (`npm run test:e2e`).

| File | Viewport | What it shows |
|------|----------|---------------|
| [`01-login.png`](screenshots/01-login.png) | 1440×900 | Login screen — frosted auth card, ambient glow, demo-account shortcut |
| [`02-register.png`](screenshots/02-register.png) | 1440×900 | Registration screen with validated form fields |
| [`03-dashboard.png`](screenshots/03-dashboard.png) | 1440×900 | Dashboard — welcome panel, five stat cards, task list with badges |
| [`04-create-task-modal.png`](screenshots/04-create-task-modal.png) | 1440×900 | Create-task modal over the blurred dashboard, form filled by the E2E run |
| [`05-search-results.png`](screenshots/05-search-results.png) | 1440×900 | Search results with active query, filters, and the `N of M` count chip |
| [`06-edit-task-modal.png`](screenshots/06-edit-task-modal.png) | 1440×900 | Edit-task modal prefilled with stored values |
| [`07-delete-confirm.png`](screenshots/07-delete-confirm.png) | 1440×900 | Delete-confirmation dialog with the red danger action |
| [`08-mobile-dashboard.png`](screenshots/08-mobile-dashboard.png) | 375×812 | Mobile dashboard — stacked stats, hamburger navigation |
| [`09-mobile-menu.png`](screenshots/09-mobile-menu.png) | 375×812 | Mobile off-canvas navigation drawer over a blurred page |
| [`10-tablet-dashboard.png`](screenshots/10-tablet-dashboard.png) | 768×1024 | Tablet layout with the off-canvas sidebar open |

---

## Features

### Authentication
- **Register** — `POST /api/auth/register`: bcrypt-hashed password, input
  validation, duplicate-email protection (409), returns a JWT + user object.
- **Login** — `POST /api/auth/login`: credential check, returns a JWT + user object.
- **Session** — stateless JWT (HS256, default 30-day expiry) sent as
  `Authorization: Bearer <token>`; stored client-side under `taskflow_token`.
- **Route guards** — unauthenticated or expired sessions redirect to `/login`
  and clear the stored token (garbage tokens and expired JWTs are both rejected).

### Tasks
- **Create / edit** through a single glass modal with client-side validation
  (title required, ≤ 200 chars) and server-side validation on every write.
- **Delete** only after an explicit confirmation dialog (ownership-checked).
- **Complete toggle** from the round checkbox on each task card.
- Fields: title, description, priority (Low/Medium/High), status
  (To Do/In Progress/Done), due date.
- **Search** across title *and* description, plus **status** and **priority**
  filters that combine; a count chip shows `N of M` while filtered.
- **Overdue detection** — tasks past their due date get a red `OVERDUE` pill.

### Dashboard & UX
- Welcome panel with a live completion progress bar.
- Five statistic cards: total, completed, in progress, pending, high priority.
- Toast notifications for create/update/delete, empty states with clear-filter
  actions, loading and error states with retry.
- About page describing the project and stack.
- Responsive at **1440 / 768 / 375 px**: fixed sidebar on desktop, hamburger +
  off-canvas drawer with blur overlay on smaller screens, no horizontal overflow.

### Design system (dark glassmorphism)
- Deep navy canvas with static blue/violet ambient light orbs (no per-frame cost).
- Frosted panels (`backdrop-filter: blur(12–22px) + saturate`), thin
  white-alpha borders, inset top-edge highlights, layered soft shadows.
- Neon accents for primary actions, active navigation, and focus rings; red
  accents reserved for overdue/destructive states.
- **Readable fallback**: glass tokens switch to near-opaque surfaces inside
  `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`,
  so browsers without backdrop blur render solid, fully readable panels.
- Text contrast measured at **≥ 4.5:1** against rendered pixels (primary and
  danger button labels measure 4.74:1 and 4.70:1; body text 5.3–14.2:1).
- `prefers-reduced-motion` respected; visible `:focus-visible` rings; labelled
  controls, `role="dialog"`/`aria-modal` on modals, ESC-to-close, keyboard
  navigation preserved throughout.

---

## Tech stack

### Backend
| Package | Version | Role |
|---|---|---|
| express | 5.3.0 | HTTP framework |
| better-sqlite3 | 13.0.3 | Synchronous SQLite driver |
| bcryptjs | 3.0.3 | Password hashing |
| jsonwebtoken | 9.0.3 | JWT signing/verification |
| cors | 2.8.6 | CORS headers (restricted to configured origins) |
| dotenv | 18.0.9 | `.env` loading |
| jest + supertest | 30.5.x / 7.3.1 | Integration tests |

### Frontend
| Package | Version | Role |
|---|---|---|
| react / react-dom | 19.3.1 | UI library |
| react-router-dom | 7.18.5 | Client-side routing and guards |
| vite | 8.3.5 | Dev server (port 5173, proxies `/api` → 5000) and production build |
| typescript | ~7.0.2 | Type safety (`tsc -b` runs as part of the build) |
| vitest + @testing-library/* | 5.1.0 | Component/unit tests (jsdom) |
| @playwright/test | 1.64.1 | End-to-end tests + screenshot capture |
| oxlint | 1.89.0 | Linting |

> There is **no component library** — every element (buttons, badges, modals,
> sidebar, toasts) is hand-built with the CSS design system in
> `client/src/index.css`.

---

## Project structure

```
taskflow/
├── README.md
├── database/
│   └── schema.sql              # MySQL schema reference (documentation only)
├── screenshots/                # 10 portfolio screenshots (regenerated by E2E)
├── server/                     # Express 5 + SQLite API
│   ├── index.js                # routes, JWT middleware, CORS, error handling
│   ├── database.js             # better-sqlite3 init, schema, query helpers
│   ├── .env.example            # environment variable template
│   ├── package.json
│   └── tests/server.test.js    # Jest + Supertest integration tests (46)
└── client/                     # React 19 + Vite + TypeScript
    ├── index.html
    ├── playwright.config.ts    # E2E config (system Chromium, serial workers)
    ├── e2e/taskflow.spec.ts    # Playwright E2E suite (17 tests + screenshots)
    ├── src/
    │   ├── main.tsx, App.tsx   # entry point, routes, auth guards
    │   ├── index.css           # design system (glass tokens, layout, a11y)
    │   ├── pages/              # LoginPage, RegisterPage, DashboardPage, AboutPage
    │   ├── components/         # Sidebar, TaskCard, TaskModal, ConfirmDialog, Toast, Icons
    │   └── utils/api.ts        # fetch client, token storage, typed API helpers
    └── package.json
```

---

## Getting started

### Prerequisites
- **Node.js** (developed and tested on **v26.12.1**) and npm.
- For the E2E suite: a Chromium binary at `/usr/bin/chromium`
  (as configured in `client/playwright.config.ts`), or adjust `executablePath`
  to your own browser / run `npx playwright install chromium`.

### 1. Backend (terminal 1)

```bash
cd taskflow/server
npm install
npm run dev            # starts Express on http://localhost:5000
```

### 2. Frontend (terminal 2)

```bash
cd taskflow/client
npm install
npm run dev            # starts Vite on http://localhost:5173
```

Open **http://localhost:5173** — the Vite dev server proxies `/api` requests to
the backend, so no cross-origin issues occur in development.

### Environment variables

Copy the template and adjust values as needed:

```bash
cd taskflow/server
cp .env.example .env
```

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | API server port |
| `DB_PATH` | `./taskflow.db` | SQLite database file (created automatically) |
| `JWT_SECRET` | dev fallback | Secret for signing tokens — **set this for any real deployment** |
| `JWT_EXPIRES_IN` | `30d` | Token lifetime |
| `CLIENT_ORIGINS` | `http://localhost:5173,http://localhost:4173` | Comma-separated CORS allow-list |

> `CLIENT_ORIGINS` is not part of `.env.example` (the built-in defaults apply);
> add it to `.env` only when you need a different allow-list.

> Without `JWT_SECRET`, the server logs
> `[security] JWT_SECRET is not set - using an insecure development fallback`.
> This is expected locally (and during tests) and harmless there: tests run
> against the isolated `taskflow_test.db`, and the server and test suite derive
> the secret from the same expression, so sign/verify/expiry/forgery checks stay
> consistent. Always set a strong `JWT_SECRET` in production.

### Demo account

```
email:    demo@taskflow.dev
password: demo123
```

- Used by the portfolio screenshots and required by the E2E suite (it logs in
  through the real UI).
- **SQLite database files are not committed** (they contain local account data),
  so on a fresh clone the schema starts empty — create the demo account once
  while the backend is running:

  ```bash
  curl -s -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"name":"Demo User","email":"demo@taskflow.dev","password":"demo123"}'
  ```

  A `409` response means the account already exists — that is fine.
- The login page has a **“Use demo account”** button that fills the form; add a
  few sample tasks through the UI to reproduce the screenshots.

---

## Database

- **Active engine: SQLite** via `better-sqlite3` (synchronous API, file-based,
  no separate server).
- `server/database.js → initDb()` creates the schema on startup with
  `CREATE TABLE IF NOT EXISTS` for `users` and `tasks`, plus two indexes
  (`tasks(title)` and `tasks(status, priority)`), so a fresh checkout works
  without manual setup.
- `database/schema.sql` contains a **MySQL-flavored schema kept for
  documentation/reference purposes only** — it is never executed; the runtime
  schema is defined in `server/database.js`.
- **Test isolation**: the Jest suite sets `DB_PATH=./taskflow_test.db`, so tests
  never touch development data.
- **Version control**: every SQLite file (`*.db`) is excluded by `.gitignore` —
  databases hold local account data and are never published. A fresh clone
  creates a clean database automatically on first start.

---

## API reference

Base URL: `http://localhost:5000/api` — all `/api/tasks/*` and
`/api/dashboard/*` routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | public | Create account → `201 { message, token, user }` |
| `POST` | `/auth/login` | public | Sign in → `200 { message, token, user }` |
| `GET` | `/auth/me` | Bearer | Current user profile (id, name, email) |
| `GET` | `/tasks` | Bearer | List the authenticated user's tasks |
| `POST` | `/tasks` | Bearer | Create a task → `201` with the stored row |
| `PUT` | `/tasks/:id` | Bearer | Partially update an owned task |
| `DELETE` | `/tasks/:id` | Bearer | Delete an owned task → `{ message }` |
| `GET` | `/tasks/search?query=&status=&priority=` | Bearer | Search title/description, optional filters |
| `GET` | `/tasks/status/:status` | Bearer | Filter by status |
| `GET` | `/tasks/priority/:priority` | Bearer | Filter by priority |
| `GET` | `/dashboard/stats` | Bearer | `total_tasks`, `todo_count`, `in_progress_count`, `done_count`, `high_priority_count` (COALESCE-guarded) |

**Task shape:** `{ id, user_id, title, description, priority, status, due_date, created_at }`
— priority ∈ `Low | Medium | High` (default `Medium`), status ∈
`To Do | In Progress | Done` (default `To Do`).

**Error responses:** `400` validation / invalid JSON · `401` missing, invalid,
or expired token · `404` unknown route or task you do not own · `409` duplicate
email · `500` unexpected server error (no stack traces leaked).

---

## Testing

| Layer | Command | Runner | Count |
|---|---|---|---|
| Backend integration | `cd server && npm test` | Jest + Supertest | **46** |
| Frontend unit/component | `cd client && npm test` | Vitest + Testing Library | **34** |
| End-to-end | `cd client && npm run test:e2e` | Playwright (Chromium) | **17** |
| **Total** | | | **97** |

### Backend — 46 tests (`server/tests/server.test.js`, 9 groups)

| Group | Tests |
|---|---|
| Authentication – Registration | 7 |
| Authentication – Login | 5 |
| Authentication – Current User Profile | 3 |
| Tasks – CRUD Operations | 15 |
| Tasks – Ownership Isolation | 1 |
| Tasks – Search and Filters | 7 |
| Dashboard – Statistics | 2 |
| Authentication Middleware | 4 |
| Route Handling | 2 |

Runs against the isolated `taskflow_test.db` (set automatically by the suite).

### Frontend — 34 tests (4 files)

`utils/api.test.ts` (12: token storage, auth calls, bearer header, 401 handling,
CRUD/search/stats request shapes) · `App.test.tsx` (3: route guards) ·
`pages/LoginPage.test.tsx` (6: rendering, validation, success, server errors,
demo button) · `pages/DashboardPage.test.tsx` (13: data loading, error/retry,
session expiry, search/filters, create/edit/toggle/delete flows, logout).

### End-to-end — 17 tests (`client/e2e/taskflow.spec.ts`)

Real browser against the real API and database: login/register flows, demo
dashboard statistics, invalid/expired token handling, logout protection, task
create/edit/toggle/delete through the UI with SQLite persistence checks, search
and filter behaviour, and the responsive layouts at 1440/768/375 px with
overflow assertions. **Prerequisites:** both dev servers must be running **and
the demo account must exist** (see [Demo account](#demo-account) — task counts
are asserted dynamically, so an empty task list is fine); the suite runs
serially (`workers: 1`) because it shares the demo account and writes the
screenshots.

```bash
# terminals 1 & 2 running, then:
cd taskflow/client
npm run lint          # oxlint
npm run build         # tsc -b && vite build
npm test              # vitest
cd ../server && npm test
cd ../client && npm run test:e2e   # also refreshes screenshots/
```

---

## Known limitations

- **SQLite only at runtime** — `database/schema.sql` uses MySQL syntax purely as
  a documentation reference; the active schema lives in `server/database.js`.
- **No migration tooling** — the schema is (re)created idempotently on startup.
- **Development CORS** — origins come from `CLIENT_ORIGINS`; narrow this further
  for production deployments.
- **No rate limiting** on authentication endpoints.
- **E2E mutates the development database** — the suite creates/edits/deletes its
  own `E2E test task` and registers `e2e-tester@taskflow.dev`; the demo account
  itself is left intact.
