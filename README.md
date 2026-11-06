# Sapling Family Clinic — two-way patient messaging (Phase 1, text track)

React (Vite) frontend + NestJS backend + Prisma/SQLite + Socket.IO. Phase 2 was not attempted — this submission is Phase 1 only, extended past the original brief with real auth (admin vs. patient login), live two-way chat over WebSockets, and a small admin dashboard (see "Beyond the brief" below).

## Stack & key decisions

- **Text track**, with a simple chat UI (not a CLI) per the brief's preference.
- **Persistence:** SQLite via Prisma (`backend/prisma/dev.db`), not Postgres — explicitly allowed as a substitute, and it means there's nothing to install or run besides `npm install`.
- **Agent:** OpenAI (`gpt-4o-mini` by default) when `OPENAI_API_KEY` is set in `backend/.env`; otherwise a deterministic rule-based agent covering the same scenario, so the whole demo also runs fully offline with no service account (this satisfies the brief's "local demo mode" requirement).
- **Emergency detection is never delegated to the model.** It's a regex check in application code that runs before either agent sees the message. If it matches, the exact required reply is returned, an `emergency` handoff is logged, and nothing else happens that turn — a model mistake can't cause a safety failure here.
- **Chat is real-time over Socket.IO, not polling.** REST still handles listing/renaming/deleting threads (not latency-sensitive); sending/receiving a message is a socket event, pushed live to every open tab watching that thread.
- **Auth is deliberately minimal for a local demo:** two seeded accounts (`admin`/`admin123`, `alex`/`alex123`), JWT issued on login, no signup/reset flow. See "Beyond the brief" for why this exists at all.

## Setup & run

### Backend

```bash
cd backend
npm install
# dev.db already exists with migrations applied, seeded with the two demo accounts on first boot.
# To start from a clean slate instead:  rm prisma/dev.db && npx prisma migrate deploy
```

Edit `backend/.env` if you want the LLM path (optional — the app runs fully offline without this):
```
OPENAI_API_KEY=""        # leave blank for the offline rule-based agent, or set your key to use the LLM agent
OPENAI_MODEL="gpt-4o-mini"
PORT=3001                # port 3000 was already in use by another app on the dev machine this was built on
JWT_SECRET="..."          # change if this ever runs anywhere but localhost
SEED_ADMIN_PASSWORD="admin123"
SEED_PATIENT_PASSWORD="alex123"
```

```bash
npm run start:dev        # or: npm run build && node dist/main.js
```

Backend listens on `http://localhost:3001` (REST + the Socket.IO gateway on the same port/server).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. `frontend/.env` points it at `http://localhost:3001` (`VITE_API_BASE`).

### Logging in

- **Staff/admin:** `admin` / `admin123` → patient list, a per-patient chat + record view, an "All Handoffs" tab (every pending/resolved request across all patients), and an "All Chats" tab (every conversation across all patients).
- **Alex (patient):** `alex` / `alex123` → a ChatGPT-style sidebar of her own chats (new / rename / delete), the active thread, and her own record + the clinic FAQ alongside it.

To demo the live two-way behavior: open two browser windows (or one normal + one incognito), log in as `admin` in one and `alex` in the other. Open the same patient/thread on both sides. Messages sent from either side — and the agent's replies — appear on both screens immediately, no refresh.

### Running the Phase 1 demo script

1. As **admin**, open Alex's patient detail view and start a new conversation with the clinic's opening message (step 0) — that's the "clinic-initiated" thread.
2. Switch to (or log in as) **alex** and reply in that same thread for every patient turn in the script.
3. The record/FAQ/open-slots panel next to the chat is exactly what the agent sees.
4. As admin, the **All Handoffs** tab shows every request the agent has filed, with structured `details`, status, and how many messages fed into it. Marking a request **resolved**/**cancelled** there is the only way status changes — the agent itself only ever creates/updates `pending_staff` requests.
5. The **Scenario clock** control (admin top bar) sets "now" without touching the host machine's clock, as the brief requires.
6. Stop and restart the backend at any point — reconnecting reloads the same conversations, messages, and handoffs from SQLite, and re-authenticates the socket from the stored JWT.

## Beyond the brief

The brief's Phase 1 didn't ask for auth, multiple logins, sockets, or an admin dashboard — "staff review" was meant to happen outside the chat entirely, and a single demo UI with a sender toggle was enough to simulate both sides. Those were built anyway, on request, to make the demo feel like a real two-sided product rather than a one-screen simulation. Net effect on the original evaluation criteria:

- **Safety / correctness:** unchanged. The emergency pre-check, the agent's reply logic, and the handoff schema are untouched — only the transport (socket vs. REST) and who's allowed to call what changed.
- **Workflow correctness & persistence:** strengthened. Access is now actually enforced per-role (a patient can't list other patients, can't delete another patient's chat, can't call admin-only endpoints) rather than assumed by UI convention.
- **Scope:** this is meaningfully more surface area than a 3-hour Phase 1 was meant to have. If this were being scored strictly against the original brief, the honest framing is: Phase 1's required behavior is the part in `test-evidence.md`; auth/sockets/dashboard are a product-direction extension on top of it.

## Design system

The UI carries Sapling Health's brand so it reads as an internal product rather than a demo: **Inter** (their brand font, self-hosted via `@fontsource-variable/inter` — no external font requests), the two-leaf **shoot mark** lifted from saplinghealth.com's favicon (`components/Logo.tsx`, recolorable via `currentColor`) with the lowercase `sapling` wordmark treatment, and their warm-monochrome palette — near-black greens `#0A0B0A/#101210/#141715/#2A2622` on creams `#FBFAF7/#F1F0ED/#ECEAE5`. The site itself is monochrome, so the only added chroma is the semantic set an internal tool can't do without: amber *pending staff*, leaf-green *resolved*, red *emergency* (cards get a red-tinted border wash). All of it lives as CSS variables at the top of `frontend/src/index.css`.

## Architecture

```
backend/src/
  agent/
    agent.service.ts       orchestrator: emergency check, then dispatch to llm or rule agent
    emergency.ts            deterministic regex check + the exact required reply text
    llm-agent.service.ts    OpenAI structured-output call (one per inbound message)
    rule-agent.service.ts   offline fallback: keyword/intent matching over the same scenario
    date-utils.ts           weekday/slot resolution shared by both agents' prompts/logic
  auth/                     seeded users, JWT issue/verify, JwtAuthGuard + RolesGuard (HTTP only — see below)
  chat/
    chat.gateway.ts         Socket.IO gateway: join/leave a conversation room, send_message, pushes message/handoff/conversation_updated
  conversations/            Conversation + Message persistence, the only caller of AgentService
  handoffs/                 HandoffRequest CRUD + pure merge helpers (handoff.utils.ts)
  patient/, faq/            static synthetic data (alex_morgan.json, clinic_faq.md, open_slots.json) + role-scoped patient endpoints
  clock/                    the simulated "now" setting (admin-only to change)
frontend/src/
  auth/                     AuthContext (JWT in localStorage), LoginPage
  socket/                   SocketContext — one socket per login session, recreated on token change
  shared/                   useChat, useConversations, useHandoffs — REST for initial load, socket for live updates
  patient/                  PatientApp, ChatSidebar (new/rename/delete)
  admin/                    AdminApp (tabs), PatientListView, PatientDetailView, AllHandoffsView, AllChatsView
  components/               PatientPanel, ClockBar (shared display components)
```

`conversation.service.ts` is the only place that writes to the `HandoffRequest` table, and the gateway is the only place that calls it for sending a message. Both agents return a plain `{ reply, handoffAction? }` value — they never touch Prisma directly — so the LLM can't corrupt state: if it names an `update` target that isn't actually in that patient's handoff list, the service treats it as a `create` instead of throwing or silently discarding it.

The gateway decides the message's `sender` from the authenticated socket's role, not from anything the client sends — a patient socket can only ever send as `patient`, an admin socket only as `clinic`. This is enforced in `chat.gateway.ts`'s `onSend` handler, independent of whatever the frontend UI happens to show.

**A real gotcha worth flagging:** the global `JwtAuthGuard`/`RolesGuard` (registered via `APP_GUARD` for the REST controllers) apply to *every* Nest execution context by default, including WebSocket message handlers. Calling `ctx.switchToHttp().getRequest()` inside a guard during a `ws` context throws, and Nest's default exception handling swallows that into a generic "Internal server error" sent back over the socket — so every `@SubscribeMessage` handler silently "did nothing" with no useful log output. Both guards now check `ctx.getType() !== 'http'` and pass through immediately for non-HTTP contexts, since the gateway authenticates sockets itself in `handleConnection`.

Adding a new handoff type is a one-line enum change in `prisma/schema.prisma` (+ a migration) and in `handoff.types.ts`; the `details` column is freeform JSON, so new fields for that type need no further migration.

## Tests

```bash
cd backend && npm test
```

36 unit tests, all passing: emergency detection (positive/negative), the weekday-to-open-slot resolution (the Nov 10/Nov 12 nuance — see "known limitations" below), the full rule-based agent against every scripted step including create-vs-update and the booked-vs-pending distinction, and the handoff merge/prune helpers.

**Not covered by automated tests:** the LLM agent path itself (non-deterministic, costs real API calls per run), the socket gateway, and auth/role scoping. These were verified manually against the running server instead (see `test-evidence.md`) — a Socket.IO integration test harness and an auth-matrix test suite are both reasonable next additions, just not written yet given the time box.

## Test evidence

`test-evidence.md` — the full 12-step Phase 1 script run end-to-end against the live API (rule-based agent, pre-dating the auth/socket layer — the agent logic it exercises is unchanged), plus a persistence check across a backend restart. The auth/role-scoping and live socket behavior added afterward were verified manually (login as each role, cross-role access attempts, two simultaneous socket clients exchanging messages and seeing each other's pushes) rather than captured as a second formal evidence file.

## Known limitations

- **Weekday resolution is scenario-specific, not general.** Both agents resolve a weekday mention (e.g. "Thursday") against the *open slots list*, not generic calendar math — because the brief's own script expects "Thursday" to land on Nov 12, not the nearer Nov 5, since only Nov 10/Nov 12 are offered as real slots.
- **The rule-based fallback is intentionally narrow.** It's a keyword matcher tuned to the 12 scripted steps plus one generic catch-all; it's meant as an offline demo mode, not a serious NLU substitute for the LLM path.
- **No automated test run of the LLM path yet** — it's been code-reviewed and prompt-engineered against the same safety rules, but not exercised against a real API key during this build.
- **Auth is demo-grade, not production-grade.** Two hardcoded seeded accounts, no password reset/rotation, no refresh tokens (7-day JWT expiry), no rate limiting on login. Fine for a local walkthrough, not fine for anything real.
- **Single synthetic patient.** The admin "patient list" and role-scoping are built to scale past one patient, but there's only ever been one to test against.
- **No automated socket/auth test coverage** (see Tests above).

## Next two priorities

1. **Write a Socket.IO + auth integration test suite** covering the gotcha above (so a regression in guard scoping fails CI instead of silently breaking every socket handler again) and the full role-scoping matrix (patient can't list/delete/access another patient's data; admin can't be impersonated by a client-supplied sender field).
2. **Exercise the LLM agent path against the real script** end-to-end over sockets, side-by-side with `test-evidence.md`'s rule-agent run, checking it never invents a slot/date outside `open_slots.json` and that its create-vs-update decisions match the rule agent's on ambiguous follow-ups.
