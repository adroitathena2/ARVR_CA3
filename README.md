# AR Digital Passport for Physical Assets

Point a phone at a machine marker and see its **digital passport** — specs, location, status, service history — report an issue on the spot, and have it show up live on the back-office dashboard.

**Live demo:**
- **AR Scanner:** https://arvrca3.netlify.app/
- **Dashboard:** https://arvrdashboard.netlify.app/

No app install needed. The scanner runs in the browser, the dashboard is a static site, both talk to one Express + Postgres API.

<img width="1917" height="968" alt="image" src="https://github.com/user-attachments/assets/bef74fdf-989a-48e9-963a-54c1632b5b10" />
<img width="1163" height="725" alt="image" src="https://github.com/user-attachments/assets/76c77118-8712-43ae-a57b-a9bcad948e10" />


## Why this exists

Lab and classroom equipment (projectors, printers, lab gear) breaks, gets serviced, and gets reported across chats and notebooks. This project puts a scannable image marker on each asset so anyone can pull its record in seconds:

1. Scan `MARK-001` on the projector → passport for `AST-001` opens.
2. Check maintenance history, current status, location.
3. File an issue ("Lamp flicker") from the phone.
4. Dashboard shows the new issue immediately; staff triage it to `in_progress` / `resolved` / `rejected`.

## What you get

**WebAR scanner (`frontend/ar/`)**
- MindAR image tracking for 5 markers (`MARK-001..005` → `AST-001..005`) via `targets/targets.mind`.
- Marker → bottom-sheet passport with specs, maintenance, and issue reporting.
- Works without a camera: `?marker=MARK-001` deep link + **Simulate scan** picker.
- Configurable API URL in-page (for LAN phone testing).

**Web dashboard (`frontend/dashboard/`)**
- Vanilla HTML/CSS/JS, no framework, no build step.
- Asset table with search + status/category/location filters, stats cards.
- Asset detail with maintenance + issues, create / edit / delete, issue status workflow.
- Offline sample fallback with banner if the API is unreachable / cold-starting.

**REST API (`Backend/`)**
- Express + `pg`. Postgres when `DATABASE_URL` is set, otherwise in-memory seed store (demo/test friendly).
- Endpoints: `GET /api/assets`, `GET /api/assets/marker/:markerId`, `GET /api/assets/:id/maintenance`, `GET/POST /api/issues`, `PATCH /api/issues/:id/status`, `GET /api/locations`, `GET /health`.
- Consistent `{ error: { code, message } }` error envelope.

**Unity legacy (`Assets/`, kept)**
- Original ARCore + dashboard Unity project, using the same API and `seed_assets.json`. Alternative native-app path; the web apps above are the primary path.

## How it fits together

```text
[ WebAR scanner ] --\
                     >-- [ Express /api ] --> [ Postgres ]
[ Web dashboard ] --/               \--> [ in-memory seed fallback ]
[ Unity app (legacy) ] -------------/
```

The scanner and dashboard never talk to the database directly. The API is the single source of truth.

## Tech stack

- Frontend: vanilla JS + A-Frame 1.4.2 + MindAR 1.2.5 (CDN)
- Backend: Node 20 + Express + `pg`
- Database: Postgres (Supabase / Neon free tier compatible)
- Legacy: Unity 2022.3.9f1 + AR Foundation 5.0.7
- Tests: Jest + Supertest

## Demo data

One dataset is mirrored across `Backend/seedData.js`, `database/seed.sql`, `Assets/Resources/seed_assets.json`, and the dashboard offline sample:

- 3 locations: `CL-6`, `FAB-LAB`, `AR-LAB`
- 5 assets / markers: `AST-001..005` ↔ `MARK-001..005` (Epson projector, Ender-3 printer, Tektronix scope, Quest 2 headset, Daikin AC)
- 6 maintenance records, 3 issues

## Quickstart

```powershell
git clone https://github.com/adroitathena2/ARVR_CA3.git
cd ARVR_CA3/Backend; npm install
copy ..\.env.example .env   # leave DATABASE_URL empty for in-memory seed mode
npm test                    # 10/10, no DB needed
npm start                   # http://localhost:3000, check GET /health
```

Real database (optional locally, required for persistence):

```powershell
psql $env:DATABASE_URL -f ..\database\schema.sql -f ..\database\seed.sql
```

Frontends (no build, serve over HTTP — camera needs `localhost` or HTTPS):

```powershell
cd ..\frontend\ar; python3 -m http.server 8000        # http://localhost:8000/?marker=MARK-001
cd ..\frontend\dashboard; python3 -m http.server 8001 # http://localhost:8001/
```

On a phone on the same Wi-Fi, set the page's API URL field to `http://<laptop-lan-ip>:3000`. See root `.env.example` for `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `API_BASE_URL`. Never commit `.env`.

## Try it (3-minute demo)

1. Open the dashboard → asset counts load.
2. Open the scanner `?marker=MARK-001` → Epson projector (`AST-001`) passport opens, no camera needed.
3. Open **Maintenance History** → 2 records.
4. **Report Issue** ("Lamp flicker") → back on the dashboard Issues tab the new issue is visible.
5. Set it to `in_progress` → refresh → status persists.

## API sketch

| Method | Route | What it does |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/api/assets` | List + filter assets |
| `GET` | `/api/assets/marker/:markerId` | Marker → asset (`MARK-001` → `AST-001`) |
| `GET` | `/api/assets/:id/maintenance` | Service history for one asset |
| `GET` / `POST` | `/api/issues` | List / file issues |
| `PATCH` | `/api/issues/:id/status` | `open` → `in_progress` / `resolved` / `rejected` |
| `GET` | `/api/locations` | Location list |

Full contract: `docs/API.md`.

## Repo layout

```text
frontend/ar/            WebAR scanner (index.html, app.js, config.js, styles.css, targets/)
frontend/dashboard/     Web dashboard (index.html, app.js, config.js, styles.css)
Backend/                Express API (server.js, db.js, seedData.js, routes/, tests/)
database/               schema.sql + seed.sql (Supabase/Neon compatible)
docs/                   API.md, AR_DEVELOPER.md, BACKEND.md, FRONTEND.md, TEST_PLAN.md, DEPLOYMENT.md
tests/                  e2e_flow.js, validate_integration.ps1, browser/ (headless QA)
scripts/                write-frontend-env.js (injects API URL at deploy time)
tools/mindar-compiler/  builds targets.mind from marker PNGs
render.yaml             Render blueprint for Backend/
frontend/*/netlify.toml Netlify config for each web app
Assets/                 Unity legacy project (kept, ARCore APK path)
```

## Deployment

Postgres on Supabase/Neon (`schema.sql` + `seed.sql`) → `Backend/` on Render via `render.yaml` → `frontend/ar` + `frontend/dashboard` as two Netlify sites (API URL injected from `API_BASE_URL` at build). Details, health checks, and rollback in `docs/DEPLOYMENT.md`.

## Testing

```powershell
cd Backend; npm test                          # Jest, no DB needed
node tests/e2e_flow.js http://localhost:3000  # API flow, also works against deployed backend
pwsh tests/validate_integration.ps1           # static contracts + seed consistency
```

More in `docs/TEST_PLAN.md`. CI runs static checks, backend tests, and the E2E flow against Postgres 15.

## Limitations

- No auth on API routes (`admins` table reserved for future use).
- In-memory mode is ephemeral (restart reseeds); use Postgres for persistence.
- Seed images are placeholders.
- Render free tier cold-starts (~30–60s); frontends show a banner while retrying.
- Marker tracking smoke-tested with a fake camera — verify on a real phone with printed markers before a live demo.

## Docs

- `docs/API.md` — endpoint contract
- `docs/AR_DEVELOPER.md` — markers, `targets.mind`, scanner flow
- `docs/FRONTEND.md` / `docs/BACKEND.md` — dashboard / API internals
- `docs/DEPLOYMENT.md` / `docs/TEST_PLAN.md` — ship + verify
