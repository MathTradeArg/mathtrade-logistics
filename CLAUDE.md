# mathtrade-logistics

## System context

This is one of three repos that make up the Math Trade Argentina system. This one is the event-staff operational tool; it talks to `mathtrade-backend`'s REST API and has a sibling repo, `mathtrade-web-ui`, that serves public participants instead. See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for the full cross-project picture.

## What this is / who it's for

Used live and in-person by event staff/volunteers/admins running a physical math trade event — checking participants' items in and out, tracking shipping boxes, handling incident reports. README states this directly: "gestión logística para los eventos presenciales" (`README.md:3`). The only page meant for a bystander/public audience is `/display/ready-to-pickup`, a TV/projector display, not participant self-service.

## Routes

- `/` — staff landing page (tiles linking to the flows below, phase- and auth-gated)
- `/login` — staff/volunteer login
- `/receive-games`, `/deliver-to-user` — QR-driven check-in/check-out of participants' items
- `/boxes` — shipping-box assembly and tracking
- `/reports`, `/reports/all` — item/user incident reports (all-reports view is admin-only)
- `/admin/ready-to-pickup` — dashboard of users by status, manual status transitions
- `/admin/window-config` — pickup-window and table-assignment configuration
- `/display/ready-to-pickup` — unauthenticated public TV display, polls for ready users

## Talking to the backend

No central HTTP client library — a generic `fetch` wrapper hook, `useApi` (`src/hooks/useApi.ts:20-85`), plus a few page-local raw `fetch` calls for QR-lookup endpoints. Base URL: `process.env.NEXT_PUBLIC_MT_API_HOST`, read per-call (no build-time hardcoding, unlike `mathtrade-web-ui`). Auth token is stored in **`localStorage`** (`authToken`, set on login) and sent as `Authorization: token <token>` — same header scheme as `mathtrade-web-ui`, different storage mechanism. Login is the only endpoint marked `isPublic`; any other call without a stored token throws before the request is made.

## Contexts

- `ActionStatusContext` — global toast-style success/error state (auto-clears after 3-5s).
- `ControlPanelContext` — state for the floating admin "control panel" (game search + status mutation).
- `EventPhaseContext` — session-wide event phase (0=not started, 1=receiving, 2=delivering), gates most of the UI, refetched on auth change.
- Auth/session state (`isAuthenticated`, `userName`, `userId`, `isAdmin`, dark-mode) actually lives in the `useAuth` hook, not in `src/contexts/`, despite being structurally the same kind of provider.

## QR / event-day workflow

`QrScanner` (`src/components/qr/QrScanner.tsx`) wraps `react-qrcode-scanner-mi`, forces the rear camera. Used on `/receive-games` and `/deliver-to-user`: staff scans a participant's QR (their membership id), the app fetches that participant's pending items from the backend, and flips their status (`present` on receive, `receiving`→`completed` on deliver) plus bulk-updates item status. Both pages also accept a `?qr=` query param to bypass the camera (testing/deep-linking).

## Design system

A neumorphic design layer (`src/styles/neumorphism.css`, `.nm-*` utility classes with light/dark variants) plus a secondary glassmorphism layer for modal overlays (`src/styles/glassmorphism.css`). Dark mode is class-driven (`darkMode: "class"` in `tailwind.config.js`), toggled via `useAuth` and persisted to `localStorage`.

## Fork evidence (thin, not confirmed)

The README's clone instructions reference `cd mathtrade-logistics-fork` (`README.md:9-11`), but the actual git remote is `mathtrade-logistics.git` with no `-fork` suffix and no `upstream` remote — this looks like a stale/copied README line rather than evidence of a real fork lineage.

## Deployment & environment

No Dockerfile, no CI config, no `.env*` file in the repo. Env vars documented in README prose: `NEXT_PUBLIC_MT_API_HOST` (required), `NEXT_PUBLIC_AUTH_ENABLED` (documented but not referenced anywhere in source), `NODE_ENV`. Additional vars actually read in code but undocumented in the README: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NEXT_PUBLIC_ENV`.

## Tests

Jest + Testing Library configured (`jest.config.mjs`). 24 test files vs. 72 non-test source files — covers 4 of ~14 pages and ~15 components; no hooks, no contexts, no `QrScanner`, no `src/utils/*` have dedicated tests. README claims "80% minimum coverage, all hooks and utilities tested" (`README.md:133-135`) — not consistent with the actual test file listing.

## Known gaps

Facts observed during research — not a prescribed fix list:
- Orphaned/unused: `useWindowManagement.ts` hook (fully built, never imported — the pages that need it reimplement the logic inline instead), `useAssembleBox.ts`, `WindowSystemSummary.tsx`, root-level `ReportCard.tsx` (superseded by `common/ReportCard.tsx`), `ThemeManager.tsx` (exported but never rendered — dark-mode toggling is duplicated directly inside `useAuth.tsx` instead).
- A commented-out "Cajas Creadas" tab remains half-wired in `src/app/boxes/page.tsx:125-133` (its logic is still active elsewhere in the same file).
- Three `console.log('[DEBUG] ...')` statements left in the public `/display/ready-to-pickup` polling loop.
- `vite.config.ts` exists at the repo root but is unused — the app builds exclusively via Next.js.
- README's documented `test:coverage` script isn't present in `package.json`; its coverage claims don't match the actual test files (see Tests above).
