# Driftboard (repo: `drift-board`) — Real-Time Collaborative Task Board — Project Plan

## Context

Adam is targeting Linear's **Senior / Staff Fullstack Engineer** role (career-ops report `042-linear-senior-staff-fullstack-2026-06-15.md`, score 4.6/5 — his highest-scored evaluation across 95 tracked roles, confirmed still live and Spain-eligible as of 2026-09-16). The JD's core technical differentiator, called out explicitly in the posting, is real-time collaborative sync:

> "Linear is a remote-first company... Build new user-facing features with everything from database models to GraphQL resolvers and UI components." Responsibilities include "optimizing data synchronization, implementing real-time collaborative editing, enhancing performance through virtualized list rendering." Stack: **React, MobX, styled-components** (frontend), **Node, Postgres, Temporal, Redis** (backend), a **"proprietary websocket data sync framework built for speed and offline support,"** hosted on **Google Cloud/k8s**.

Report #042's own Block A already names the gap honestly:
> "MobX vs. Adam's Redux/XState (similar concepts, different library); styled-components (Adam likely uses CSS Modules/Tailwind); proprietary websocket sync framework is specialized; Google Cloud/Kubernetes infrastructure is peripheral"

Adam's `cv.md` currently has **zero evidence** of: real-time multi-user sync, offline-first architecture, conflict resolution, MobX, or backend ownership with Postgres. This is the same honest-gap-closing pattern as two prior projects:
- The OpenTofu + Spacelift Infrastructure Demo (closed a Spacelift-interview-specific infra gap)
- The (separately planned) Flow Builder Mini project for Spacelift's Flows team (closed a node-canvas-UI gap)

**The plan:** build a small, real, honestly-scoped collaborative task board — **not a Linear clone** — that demonstrates the actual hard mechanics Linear's JD calls out: real-time sync, optimistic UI, conflict resolution, and offline support. Scoped honestly: the **core demo (Milestones 1–7) is roughly 30–35 hours over 3–4 weekends**; account auth, card-level presence and the phone layout (Milestones 8–10) add another 10–15 if time allows. Two of the core libraries (Apollo Client, MobX) are new to Adam, which is priced in. Not a product launch.

**Explicit non-goals:** not a Linear clone, not a multi-tenant SaaS product, not a portfolio centerpiece requiring weeks of polish. Target is a working, demoable app with an honest 60-90 second spoken walkthrough ready for an interview, plus a clear, truthful account of what was scoped out and why.

## The Honest Use Case (why this isn't just a tech demo)

**Driftboard** (the product name used throughout `design/`; the repo is `adam-olser/drift-board`) — a lightweight, shared kanban board for small teams or freelancer↔client coordination who don't want to pay for Trello/Linear/Asana for a single project. This is a genuine, nameable use case, not an invented pretext — matters because `career-ops`'s source-of-truth rules mean Adam can only ever claim what he actually built and why, never fabricate a "problem" a project didn't really solve.

## Source of Truth

Two sources, split by concern:

- **`design/` wins on UI and copy** — layout, states, tokens, wording, the artboards `Main`, `CardDetail`, `Mobile`, `HeaderStates`, `SignIn`, `Components`.
- **This plan wins on mechanics** — data model, conflict policy, replay, transport, ordering. The `Architecture` and `Flow` artboards are illustrations of the plan, not the other way round.

When they disagree, fix the losing side in the same session and log it in `DECISIONS.md`. As of 2026-09-16 the two agree; the header's "WS · 38 ms" pill is the one optional item (Milestone 7 keeps it only if graphql-ws ping/pong makes it a one-liner).

## Repository Setup

- Standalone GitHub repo: `adam-olser/drift-board` — isolated from any production code, freely breakable
- Stack, as fixed in `design/Architecture.dc.html`:
  - **Frontend:** React + TypeScript + Vite.
    - **Apollo Client** owns domain data: `InMemoryCache` normalises boards / columns / cards / peers; `optimisticResponse` provides the optimistic layer; a custom **link chain `lag? → log → queue → split(session ops → http, everything else → ws)`**. Board queries, card mutations and subscriptions all ride the one graphql-ws socket, so "socket connected?" is the single offline signal. Only the four session mutations use HTTP, because they set cookies. `lagLink` exists only when `?lag=<ms>` is in the URL and delays every operation — the dev-only switch that makes optimistic UI and rollback visible in a demo.
    - **MobX** owns the sync engine only: connection state, the offline queue, the event log, toasts. Chosen because the JD names it, and committed to: the store is under ~150 lines, so learning MobX costs less than maintaining a fallback. Claim it as "MobX for the sync store", nothing bigger.
    - Domain data and sync state never live in both stores (invariant from the Architecture artboard).
  - **Backend:** Node.js + **Fastify + Mercurius** serving one GraphQL schema (Query + Mutation resolvers) from one process, plus **graphql-ws** subscriptions in the same process. **PostgreSQL** is the single source of truth (`pg` directly, hand-written SQL — D-002). This is a genuinely new proof point: `cv.md` shows backend collaboration but no owned Postgres-backed service.
  - **Real-time layer:** GraphQL subscription `boardEvents(boardId)` over graphql-ws, Mercurius's in-process pubsub, one topic per board. Notify-only — it never stores domain state. Single instance by design (see Non-Goals). This directly mirrors the JD's GraphQL + websocket-sync stack. See **Library Fallback** for the raw-`ws` escape hatch.
  - **Auth:** additive, never a gate. A signed session cookie; guest sessions carry only a display name and colour; `logIn`/`signUp` (Milestone 8) set `Session.userId` on the same row, keeping colour and queued ops. Resolvers and subscriptions are identical either way. Enables the "My boards" menu (`viewer.boards`). No orgs, roles or permissions.
  - **Deploy:** one always-on Render web service serving API and web bundle from a single origin, Postgres on Neon (D-008). No k8s, no GCP, no Redis (named non-goals).

## Domain Model

Relational, one row per thing, no arrays of ids, no JSON blobs for domain data. Every table has `id uuid primary key default gen_random_uuid()` and `created_at timestamptz not null default now()`; only columns beyond that are listed. Scalability notes are about the shape being right, not about capacity this demo needs.

```typescript
interface Board {
  id: string;
  slug: string;              // unique index; the shareable /b/:slug
  name: string;
  keyPrefix: string;         // "DB" in DB-12
  nextKeyNo: number;         // incremented with UPDATE … RETURNING inside the createCard transaction
  createdBySessionId: string;// FK sessions
}

interface Column {
  id: string;
  boardId: string;           // FK boards, ON DELETE CASCADE
  title: string;
  position: number;          // int; render order only — three fixed rows seeded with the board, no reorder mutation (YAGNI). Kept so adding columns later is data, not a migration.
}

interface Card {
  id: string;                // client-generated (crypto.randomUUID) so offline-created cards can be referenced by later queued ops
  boardId: string;           // FK boards — denormalised on purpose: subscriptions filter and indexes cluster by board, never via a join through columns
  columnId: string;          // FK columns
  key: string;               // DB-12; unique (board_id, key)
  title: string;
  description: string;
  position: number;          // double precision; the ONLY ordering source. Client proposes a midpoint, server stores it (LWW) and reindexes the column when the smallest gap drops below POSITION_MIN_GAP
  version: number;           // int; bumped ONLY by updateCard (title/description). Moves never touch it, so a drag can never fake a text conflict
  updatedAt: string;         // stamped server-side
  updatedBySessionId: string;// FK sessions; name and colour resolve through it
  deletedAt: string | null;  // soft delete. Lets the server answer CardGone precisely and makes every op on a deleted card idempotent; board(slug) filters deleted_at IS NULL
}
// index cards (board_id, column_id, position) where deleted_at is null

interface Session {
  id: string;                // the value in the signed cookie
  displayName: string;
  color: string;             // assigned at creation from an 8-colour palette, never changes — so sign-in keeps it for free
  userId: string | null;     // FK users; set by logIn/signUp, never unset (logOut creates a fresh guest session instead)
}
// index sessions (user_id)

interface User {
  id: string;
  email: string;             // unique index on lower(email)
  passwordHash: string;      // crypto.scrypt
  name: string;
}

interface Op {                 // idempotency ledger, one row per ACCEPTED mutation (written in the same transaction, so a rejection leaves no row)
  opId: string;              // primary key; client-generated crypto.randomUUID()
  sessionId: string;         // FK sessions
  boardId: string;           // FK boards; lets future pruning/history work per board
  type: 'createCard' | 'updateCard' | 'moveCard' | 'deleteCard';
  result: unknown;           // jsonb; the exact response first returned, replayed verbatim on a duplicate opId
  appliedAt: string;
}
// index ops (board_id, applied_at). Unbounded growth is accepted for the demo; a prune-older-than-N-days job is the named fix and is not built.

interface PresenceState {      // ephemeral — server Map<boardId, Map<sessionId, PresenceState>> and the Apollo cache, never Postgres
  sessionId: string;
  name: string;
  color: string;
  viewingCardId: string | null;
}
```

Why this shape scales further than the demo needs it to: boards are the partition key on every hot table, so a per-board index answers every query and a per-board pubsub topic answers every subscription; soft deletes and the ops ledger make every mutation replayable; nothing is stored twice, so there is no fan-out on write beyond the one broadcast. What would change at real scale, and is deliberately not built: Redis for pubsub and presence across instances, ops pruning, cursor pagination on `board(slug)`.

### Conflict policy (one rule per operation type — name it correctly in the interview)

| Operation | Policy | Why |
|---|---|---|
| `moveCard(cardId, columnId, position)` | **Last-write-wins, no version check.** Server stores the proposed position, reindexes the column if gaps are exhausted, broadcasts every changed card. Does **not** bump `version`. | Concurrent moves are normal use; rejecting them would feel broken. Everyone converges on the server's final order, and a drag can never invalidate someone's text edit. |
| `updateCard(cardId, baseVersion, title?, description?)` | **Optimistic concurrency.** Apply only if `baseVersion = cards.version` (`UPDATE … WHERE id = $1 AND version = $2 AND deleted_at IS NULL`), bump `version`, else reject with `VersionMismatch { current: Card }`. The *earlier* writer wins. | A silent overwrite of someone's text is the one conflict that hurts. The loser sees a toast and the current text. |
| `deleteCard(cardId)` | Set `deleted_at`; already deleted → success, no event. | Idempotent for replay. |
| `moveCard` / `updateCard` on a deleted card | Reject with `CardGone`. | The one rollback case: the optimistic layer is dropped, a toast names the card. |
| `setViewing(cardId?)` | No Postgres write at all; updates the presence map and broadcasts. | The named exception to the "same path" rule — presence is not domain data. |

Do not call the `updateCard` rule "last-write-wins" — it is the opposite. No field-level merge, no CRDT (named scope cut).

### Ordering

`ordering.ts` is a tiny shared module (`shared/`, aliased from both apps): `between(a, b)` returns the midpoint, `POSITION_MIN_GAP` is the one named constant. The client uses `between` to propose a position for the optimistic move; the server uses the same function to reindex a column to evenly spaced positions inside the move transaction and broadcasts the result as one `CardMoved { cards: [{ id, columnId, position }] }` event, so a reindex is just a move that touched several cards.

### Offline replay policy

The queue lives in the MobX sync store as an ordered list of pending operations, each still holding its open Apollo observable, so the optimistic layer genuinely stays on screen and every mutation promise resolves with a real server result. On reconnect the ops replay **in order, one at a time, with rebase**: after each `updateCard` result, every later queued `updateCard` on the same card has its `baseVersion` replaced by the returned `version`, so a user can never conflict with their own earlier edit. `moveCard`/`deleteCard` apply as-is. An `updateCard` that is still rejected (someone else edited the card meanwhile) errors its observable, which drops that op's layer and raises the toast naming the card. After the last result, one `network-only` `board(slug)` query overwrites the cache. Replay alone is never reconciliation — the refetch always runs. Cards created offline render with a `···` key until the server assigns one.

## GraphQL Schema (shape only)

- **Query:** `board(slug)` — canonical snapshot, live cards only · `viewer` — current session, optional user, `viewer.boards` (boards created by any session belonging to this session's user, or by this session alone while guest)
- **Mutation (HTTP, set cookies):** `startGuestSession(displayName)` · `signUp`, `logIn`, `logOut` (Milestone 8)
- **Mutation (socket):** `createBoard(name)` (no `opId`, cannot happen offline) · `createCard(id)`, `updateCard(baseVersion)`, `moveCard(position)`, `deleteCard` (each with `opId`) · `setViewing` (no `opId`, no ledger row)
- **Subscription:** `boardEvents(boardId)` → `CardCreated | CardUpdated | CardMoved { cards[] } | CardDeleted | PresenceChanged { peers[] }`, each carrying `origin` (the causing session); published after commit; a client ignores its own events
- Every card mutation, whatever its origin (optimistic UI, offline replay, direct API call), goes through the same resolver → validate → policy from the table above → one Postgres transaction + `ops` row → publish path.

## Build Order (milestones, increasing difficulty)

Mechanics first, polish last. Header chrome, themes, the sync-log panel and the card detail panel are all deferred to Milestone 7 so the sync story is proven before anything is made pretty.

### Milestone 1 — Static board
- Three columns, seeded cards, `@dnd-kit/core` drag within and across columns, local React state. Plain layout using the `Components` tokens, nothing more. `shared/ordering.ts` with its unit test.
- Verify: cards drag between columns; positions stay strictly increasing per column.

### Milestone 2 — GraphQL API + Postgres + guest sessions
- Fastify + Mercurius; tables `boards`, `columns`, `cards`, `sessions`, `ops` per the model above; `docker-compose.yml` with one Postgres service. Vite dev proxy for `/graphql` (HTTP and WebSocket) so the cookie is same-origin in dev too.
- `startGuestSession` over HTTP sets the signed cookie (`@fastify/cookie`, `signed: true`); first visit shows the **A · pick a name** dialog. `createBoard`, `board(slug)`, the four card mutations with `opId` idempotency, soft delete, and the conflict policy table above. Card keys from `nextKeyNo` in the same transaction.
- Apollo Client with `InMemoryCache`, `HttpLink` for now, generated types via GraphQL Code Generator.
- Verify: refresh preserves state; same `opId` twice returns the stored result; a second browser gets its own guest session and colour; a deleted card is gone from `board(slug)` but `moveCard` on it returns `CardGone`.

### Milestone 3 — Deploy the walking skeleton
- One Fastify process serves the API **and** the built web bundle (same origin). **Paid always-on instance** (Render starter; Fly is the fallback) — a free tier that sleeps takes 30–50 s to wake and drops the socket, which would sink the live demo. Database on Neon's free tier, never Render's free Postgres (deleted after 30 days). Auto-deploy on push to `main`. `.env.example`, one install command, one dev command.
- Verify: the live URL loads a board, a guest can create and move a card, a fresh clone runs locally in under 5 minutes. **Every later milestone is verified on the live URL too.**

### Milestone 4 — The socket: subscriptions, transport, connection presence
- graphql-ws in the same process; `boardEvents(boardId)` on Mercurius's in-process pubsub, published after commit. Card mutations and `board(slug)` move onto the socket; the link chain becomes `log → split(session ops → http, else → ws)`.
- The cache holds `Board.cards` as one flat list; columns are derived on the client by filtering on `columnId` and sorting on `position`. So a `CardMoved`/`CardUpdated` event or mutation result is just normalised card data with no list surgery; only `CardCreated` appends to the list and `CardDeleted` evicts.
- Connection-level presence: the `boardEvents` subscribe resolver adds the session to the board's presence map, Mercurius's `onDisconnect` removes it; both broadcast `PresenceChanged`; peers render as plain avatar chips. `setViewing` waits for Milestone 9.
- Verify: two windows on the live URL; a move in one appears in the other well under a second; opening a third window adds a chip, closing it removes the chip.

### Milestone 5 — Optimistic UI via Apollo
- `lagLink` (active only with `?lag=<ms>`). `optimisticResponse` on `moveCard`/`updateCard`/`createCard`; `createCard` inserts via the mutation's `update`; the canonical result replaces the layer.
- Verify with `?lag=2000` on the live URL: the drag lands instantly while the log shows the request still in flight; without the flag, nothing looks different.

### Milestone 6 — Conflict policy + offline queue
- `updateCard` version check end to end; `VersionMismatch` and `CardGone` mapped to toasts by the MobX store. Inline title edit on the card row is enough; the detail panel comes in Milestone 7.
- `queueLink`: when the socket is closed it parks the operation (with its observer) in the MobX queue instead of forwarding it, so the optimistic layer stays; on reconnect the store forwards the parked ops one at a time, rebasing `baseVersion` from each result, then runs the `network-only` `board(slug)` refetch. In-memory queue only; `idb-keyval` persistence is a named stretch.
- Verify (all on the live URL): same title edited from two windows within a second — the second is rejected, both show the first; drag a card in A while B is mid-edit of its title — B's save succeeds; DevTools offline in A, edit the same card's title twice, delete another card, move a card in B, back online — both edits apply in order without a conflict, the delete applies, A converges to include B's move; `?lag=3000`, delete in B, move in A before the lag elapses — A rolls back with a toast; repeat the offline run by restarting the server.

### Milestone 7 — The designed UI
- Header from `design/HeaderStates.dc.html` (brand, slug, connection pill, offline banner, `Syncing 1 / 2`, the avatar chips from Milestone 4), dark/light themes with `localStorage` + `prefers-color-scheme`, the collapsible sync log fed by the `logLink` the earlier milestones already emit into, the card detail panel (`design/CardDetail.dc.html`, save on ⌘↵). No new mechanics; the latency pill shows graphql-ws ping/pong round-trip only if it is a one-liner, otherwise it is cut.
- Verify: header states 1, 3 and 4 appear in the right situations; the four-step walkthrough below runs end to end on the live URL.

**Core demo complete here.** Everything below is additive and can be cut without weakening the interview story.

### Milestone 8 — Account auth (additive)
- `users` table, `signUp`/`logIn`/`logOut` over HTTP with `crypto.scrypt`. Signing in sets `userId` on the existing session row: same id, colour and queue. `logOut` issues a fresh guest session rather than clearing `userId`. **B/C** dialogs and **D · My boards** from `design/SignIn.dc.html`; header state 2.
- Verify: a board link never redirects to a login wall; signing in mid-offline keeps the queue; `viewer.boards` lists boards created as a guest before sign-in.

### Milestone 9 — Card-level presence
- `setViewing(cardId?)` updates the presence map and broadcasts; "MK editing" marker on the card row and "who's viewing" in the detail panel.
- Verify: focusing a card in one window marks it in the other within a second; blurring clears it.

### Milestone 10 (stretch) — Phone layout
- `design/Mobile.dc.html`: one column at a time with tabs, long-press → move sheet.

## Explicit Non-Goals (say these out loud if asked — shows judgment, not gaps)

- **No orgs, roles or permissions.** Auth is additive (guest → account upgrade for "My boards"); anyone with the link can edit. No invitations, no ownership enforcement, no password reset, no email verification.
- **Single server instance.** Pubsub and presence live in process memory, so there is no horizontal scaling and no Redis. Say this out loud: it is the honest reason Linear runs Redis and this project does not.
- No multi-tenant organization structure
- No CRDT/Operational Transform — the per-operation policy (LWW for moves, optimistic concurrency for text) is the deliberate, named scope cut (Milestone 6)
- No column add/rename/reorder — three fixed columns seeded with the board
- No swimlanes, labels, sub-tasks, due dates, or any Linear-specific feature surface — intentionally *not* an issue tracker clone
- No native mobile app — the phone artboard is a responsive layout, and a stretch goal
- Not Temporal (workflow orchestration) — genuinely out of scope; don't claim familiarity from this build
- No Kubernetes/GCP deployment — Render/Railway/Fly.io, matching the QR Studio and OpenTofu demo projects

## Library Fallback (if time runs short)

One fallback, with an honest framing that goes into `DECISIONS.md` the moment it is taken:

- **graphql-ws → raw `ws` events.** If subscription plumbing (Mercurius + graphql-ws + Apollo split link) eats a weekend, keep the GraphQL Query/Mutation API over HTTP and broadcast plain JSON events over a hand-rolled `ws` channel. The offline signal becomes the raw socket's state. Framing: "I kept GraphQL for the request/response API and used a raw socket for fan-out so I could spend my time on optimistic UI, conflicts and offline."
- Apollo Client and MobX are **not** fallback candidates: Apollo's optimistic layer, cache and link chain are the mechanism the whole Flow artboard is built on, and the MobX store is too small to be worth a second library. Do not build parallel versions of anything.

## Development Rules (how the code gets written — follow these on every milestone)

These are the non-negotiables for the build. They exist so the demo is honest, the interview story holds up under questioning, and a weekend of work does not turn into a month.

### Workflow
- **One milestone at a time, in order.** Do not start Milestone N+1 until Milestone N's "Verify" step passes in a real browser. No skipping ahead to the fun sync work before persistence is solid.
- **Vertical slices, small commits.** Each commit is one working increment (e.g. "moveCard persists via GraphQL"), not "wip". Commit message body says what was verified and how. Keep `main` runnable at every commit.
- **Runnable from a fresh clone in under 5 minutes.** `git clone` → `pnpm i` → `cp .env.example .env` → `pnpm db:up && pnpm db:reset` → `pnpm dev`. Postgres via `docker-compose.yml` (single `postgres` service); no local `psql` needed, the reset runs inside the container. If setup gets more complicated than this, that is scope creep — stop and cut.
- **Every scope decision gets written down the moment it is made.** Stack swaps (e.g. graphql-ws→raw ws), scope cuts, and things deferred all go into a short `DECISIONS.md` (one dated line each: what, why, what the honest interview framing becomes). The plan's "Library Fallback" section is the template. This is what makes the interview walkthrough truthful without relying on memory.
- **Design wins on UI and copy, plan wins on mechanics** (see Source of Truth). Fix the losing side the same session and log it in `DECISIONS.md`. Never build against one while the other says something different.

### Code conventions
- **TypeScript strict everywhere**, frontend and backend. `strict: true`, `noUncheckedIndexedAccess: true`. No `any` outside of third-party type gaps, and each one gets a `// why:` comment.
- **The GraphQL schema is the shared contract.** Resolver types and client documents are both generated from it with GraphQL Code Generator. No hand-written duplicates of domain types on either side; database row types live once per table in that module's `sql.ts` with one mapper to camelCase. The one piece of shared *logic* is `shared/ordering.ts`, because client and server must compute the same midpoint.
- **Formatting and linting are automatic, not a style debate.** Prettier with the same config as `ganba-hero` (`singleQuote`, `semi`, `printWidth: 100`, `trailingComma: es5`, `arrowParens: avoid`) plus ESLint with `typescript-eslint` recommended rules. `pnpm lint` and `pnpm typecheck` must both pass before every commit. Wire them as root scripts on day one.
- **Named exports, no default exports** (except where a framework demands one, e.g. Vite config). Components are `PascalCase.tsx`, everything else `camelCase.ts`. Path alias `@/` maps to the package's `src/`.
- **No dead code, no commented-out code, no TODOs without an owner.** If something is deferred, it goes into `DECISIONS.md`, not a code comment.
- **Dependencies need a one-line justification** in `DECISIONS.md` when added. Allowed by default, because the design or a decision names them: `@apollo/client`, `graphql`, `graphql-ws`, `@graphql-codegen/*`, `mobx` + `mobx-react-lite`, `@dnd-kit/core` + `@dnd-kit/sortable`, `fastify`, `mercurius`, `@fastify/cookie`, `@fastify/static`, `@fastify/rate-limit`, `pg`, `idb-keyval`; dev tooling (`typescript`, `vite`, `vitest`, `tsx`, `esbuild`, `prettier`, `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks`) is exempt. Anything else is a conscious add. No UI component kits; the design is hand-built with CSS Modules (D-003) using the tokens from `design/Components.dc.html`.

### Architecture rules (these are the interview story, so they must be true in the code)
- **Postgres is the single source of truth for domain data.** The server holds no board/column/card state in memory beyond a request. The two deliberate exceptions are ephemeral by nature: the in-process pubsub and the presence map. The real-time layer is notify-only; it never becomes a second store.
- **Every card mutation takes the same path** regardless of origin: optimistic UI, offline replay, or a direct API call all go through the same resolver → validation → one Postgres transaction + `ops` row → broadcast. No side doors for the offline queue. `setViewing` is the named exception: presence is not domain data and never touches Postgres.
- **The server stamps `updatedAt` and increments `version`, never the client, and only `updateCard` increments it.** The client only ever sends `baseVersion`, the version it thinks it edited from, for conflict detection.
- **Every card mutation carries a client-generated `opId`** (`crypto.randomUUID()`, no library) recorded in the `ops` ledger together with its result; a repeated `opId` returns that stored result. Offline replay and reconnect retries must be safe to send twice. `createBoard`, `setViewing` and the session mutations carry none: they cannot be queued.
- **Domain data and sync state never live in both places.** Apollo's cache owns domain data (board/columns/cards/peers); the MobX sync store owns connection status, the offline queue, the event log and toasts. If a value is readable from both, one of them is wrong.
- **Three sanctioned ways to write the cache, and no fourth.** The optimistic layer only via `optimisticResponse`; canonical results via normalisation plus the mutation's `update` where a list changes; peer changes via the subscription handler's `cache.modify`. `Board.cards` is one flat list so only create and delete ever touch a list, and both go through one `cardList.ts` helper. No `writeQuery`/`writeFragment` from components or the MobX store. Rejection drops the layer and surfaces a toast, never a silent revert.
- **Conflicts are decided by the server, per the policy table, and only there.** Moves are last-write-wins; field edits are version-checked optimistic concurrency. Clients never decide who won; they apply whatever the server returns. Use the right name for each in the interview.
- **After reconnect: replay in order with rebase, then run a `network-only` `board(slug)` query** that overwrites the cache. A parked operation keeps its observable open until it has a real result. Replay alone is not reconciliation.
- **Auth is additive, never a gate.** A shareable board link always works with a guest session; signing in sets `userId` on the same session row (same id, colour, queue). Resolvers and subscriptions do not branch on whether `userId` is set, except `viewer.boards`. Names and colours come from the session, nothing else does.
- **One ordering source.** `Card.position` is the only order; no `cardIds` arrays, no derived lists persisted anywhere. A reindex is broadcast as a multi-card `CardMoved`, never as a silent server-side change.
- **Deletes are soft.** `deleted_at` is how the server tells `CardGone` from "never existed" and how replayed deletes stay idempotent. Reads filter it; nothing ever hard-deletes a card.

### Ponytail rules (run this checklist before writing any code)
1. **Does this need to exist?** No → skip it (YAGNI). Nothing gets built that no milestone's Verify step exercises.
2. **Already in this codebase?** Reuse it, don't rewrite. One `Card` row component, one toast, one dialog shell.
3. **Stdlib does it?** Use it: `crypto.randomUUID()` for opIds, `crypto.scrypt` for passwords, `Intl.DateTimeFormat` for the log timestamps, `URL`/`URLSearchParams`, `structuredClone`.
4. **Native platform feature?** Use it: `navigator.onLine` + `online`/`offline` events, `prefers-color-scheme`, `localStorage`, `<dialog>`, CSS `:has()`/`color-mix()`, Postgres `RETURNING`, `ON CONFLICT DO NOTHING`, `gen_random_uuid()`.
5. **Installed dependency does it?** Use it before adding another: Apollo's `optimisticResponse` before a hand-rolled optimistic layer, Mercurius's pubsub before a pubsub library, Fastify's static plugin before nginx, `@dnd-kit` sensors before custom touch handling.
6. **One line?** One line. No helper for something used once; no abstraction for something used twice.
7. **Only then: the minimum that works.** Ship it, verify it, write the next milestone.

### Coding practices, DRY, and smells to refuse
- **DRY where it is knowledge, not where it is text.** The conflict policy, the replay rules, the ordering rule and the input limits each exist in exactly one module. Two similar-looking JSX blocks are fine; two places that decide what `version` means are not. Rule of three for abstractions: extract on the third use, not the second.
- **Small, single-purpose functions and modules.** One resolver per mutation, one link per concern (`lagLink`, `logLink`, `queueLink`, `split`), one MobX store. A file over ~200 lines or a function over ~40 is a signal to split, not a rule to obey blindly.
- **Colocate by feature, not by kind:** `features/board/`, `features/sync/`, `features/session/`, `features/presence/` on the client; `modules/cards/`, `modules/sessions/`, `modules/boards/`, `modules/presence/` on the server. No global `utils/` or `helpers/`; `lib/` is created the day two features need the same thing, not before.
- **Explicit over clever.** Discriminated unions for events and errors, never string sniffing on messages. Exhaustive `switch` with a `never` default. No boolean flags that change what a function does; make it two functions. No default exports.
- **Errors are values at the boundary.** Resolvers throw the typed errors from `errors.ts` (`CARD_GONE`, `VERSION_MISMATCH`, `BAD_INPUT`, …); unknown errors are logged by pino and surface as `INTERNAL` with no detail. The client maps codes to toasts in one place and never writes error payloads into the cache; the truth arrives as an event or the reconciliation refetch. No `catch (e) {}` anywhere; no `console.*` in either app: pino on the server, the sync log on the client.
- **Data access is the only place that knows SQL.** One `sql.ts` per module: parameterised statements only (`$1`, never template strings), one row type per table, one mapper from `snake_case` rows to the camelCase shape the resolvers return. One transaction per mutation via `withTx`; `position` reindexing and `next_key_no` increments happen inside it. Never `SELECT *`.
- **Validate at the edge, trust inside.** GraphQL types validate shape; resolvers validate lengths and ranges from `limits.ts` and throw `BAD_INPUT`. Nothing below the resolver re-checks.
- **Apollo: fragments belong to the component that renders them.** `CardRow` owns `CardRowFragment`, `Board` composes them. Cache writes only through the three sanctioned paths. Fetch policies stay at their defaults except the one `network-only` reconciliation query.
- **MobX: the store is the only place state changes.** `makeAutoObservable`, every mutation is a method, every component that reads the store is wrapped in `observer`, nothing reads the store outside React except the links. No MobX state mirrors something Apollo already holds.
- **React: derive, don't sync.** No `useEffect` that copies one state into another; compute it. No `useMemo`/`useCallback` until a profiler shows the need. Props drilled more than two levels move to a hook or the store. Every interactive element is reachable by keyboard: `@dnd-kit`'s `KeyboardSensor` is on, dialogs are `<dialog>` with focus trapped by the browser, toasts render in an `aria-live="polite"` region, hit targets are at least 44px on the phone layout.
- **Dependencies are pinned by the lockfile and installed with `--frozen-lockfile`** locally, in CI and on Render. A dependency bump is its own commit.
- **Commits are small and truthful.** `type(scope): what` in the subject (`feat(cards): moveCard returns every touched card`), the body says what was verified and how. Never `wip`, never `fixes`.
- **Smells that block a commit:** dead or commented-out code; a `TODO` without a `DECISIONS.md` line; copy-pasted resolver bodies; a component that fetches and lays out and formats; `any` or `as unknown as`; a `useEffect` that syncs state; a magic number outside `ordering.ts` or `limits.ts`; a cache write outside the three sanctioned paths; a `console.*`; a store field that duplicates the Apollo cache; a raw SQL string outside `sql.ts`; a resolver that trusts input it has not measured.
- **Comments say why, never what.** If a `what` comment is needed, rename the thing.
- **Test where bugs are expensive and manual checking is slow, nowhere else.** Unit: `ordering.ts` (midpoint, reindex, gap detection), `moves.ts` (drop target → column + position), `replay.ts` (rebase rules, order, error-on-reject). Integration: `cards/policy.test.ts` runs the conflict, idempotency, soft-delete and reindex rules against the Docker Postgres with a fresh schema per run. Vitest, colocated `*.test.ts`, one `pnpm test`. No component tests, no end-to-end suite: the browser walkthrough on the live URL is the e2e.

### Verification rules
- **Every milestone's "Verify" step is executed in a real browser**, not reasoned about: Adam's two windows, plus a headless Chromium script (Playwright in Claude's scratch space, not a repo dependency — D-018) that drives the dev server and reports positions and state. Record it as one line in the commit body ("verified: two tabs, card move propagates < 1s").
- **The four-step interview walkthrough (see Verification below) is rehearsed end-to-end on the live URL after Milestones 5, 6 and 7**, not just at the end. If a step breaks, fixing it beats starting the next milestone. Rehearse with `?lag=2000` once so the optimistic layer is visibly doing work.
- **Offline is tested with DevTools network throttling set to Offline**, and separately by killing the server process. Both must recover.
- **Automation covers four modules: three pure ones and the server policy against real Postgres.** "Unit tests for ordering and replay, an integration test for the conflict and idempotency rules" is the exact, true sentence.

### Honesty rules (carried over from `career-ops` source-of-truth rules)
- The README and any CV/interview claim describe **what was actually built**, in the past tense, naming the libraries actually used. If the fallback path was taken, say so.
- Never describe the version check as CRDT-like, never describe the subscription layer as "a sync framework", never imply Temporal, Kubernetes or GCP were touched.
- If a milestone was not reached, the README lists it under "Not built" with one sentence on why. Unfinished and stated beats finished and overstated.

## Repo Contents to Produce

- `README.md` — one paragraph explaining what this is, the honest use case (freelancer/small-team board coordination), and naming the Linear-interview context directly (same tone as the `qr-studio-spacelift-demo` README)
- `IMPLEMENTATION.md` — repo shape, tooling decisions, `schema.sql` and `schema.graphql` contracts, and the ordered task list with a "done when" per task
- `DECISIONS.md` — dated one-liners for every stack swap, scope cut and deferral (see Development Rules)
- `shared/` — `ordering.ts` and its test, aliased from both apps; nothing else unless it is genuinely needed on both sides
- `apps/web/` — React/TS/Vite frontend: Apollo Client + link chain (`lag? → log → queue → split`), MobX sync store with `replay.ts`, generated GraphQL types, Vite proxy config
- `apps/server/` — Fastify + Mercurius GraphQL API, graphql-ws subscriptions, signed session cookie, serves the built web bundle (single origin)
- `apps/server/db/schema.sql` — the Domain Model above as DDL: `boards`, `columns`, `cards` (soft delete, `(board_id, column_id, position)` index), `sessions`, `ops` (`result jsonb`), `users` (Milestone 8)
- `docker-compose.yml` — single Postgres service for local dev
- `design/` — the design canvas working files, kept in the repo as the visual source of truth
- Tests: unit for `ordering.ts`, `moves.ts` and `replay.ts`, integration for `cards/policy.test.ts` against the local Postgres; everything else is verified in the browser on the live URL

## Verification

- Manual, browser-based verification on the live URL across the milestones above, plus unit tests for `ordering.ts`, `moves.ts` and `replay.ts` and the `policy.test.ts` integration test
- Core walkthrough to rehearse before the interview (60-90 seconds):
  1. Open the live board link in two browser windows as two guests with different names and colours (Milestone 2). If Milestone 8 shipped, sign in on one and show nothing else changes.
  2. Drag a card in one window, show it updating instantly in the other, and point at the sync log event; with `?lag=2000` show the drag landing before the request completes (Milestones 4-5)
  3. Edit the same card's title in both windows within a second; show the second edit rejected with a toast, the log row `conflict · version mismatch`, and both windows on the same text (Milestone 6)
  4. Go offline in one window (DevTools), edit a title twice and move a card, show `3 queued`, move a card in the other window meanwhile, go back online, show `Syncing 1 / 3` through `3 / 3` then the board reconciling to include the other window's move (Milestone 6)
- Be ready to name the scope cuts if asked: LWW for moves vs. optimistic concurrency for text and why not CRDT; single instance with in-memory pubsub and why not Redis; auth without permissions; graphql-ws vs. raw `ws` (whichever was actually used, and why)

## How This Maps Back to the Linear JD (for interview prep, once built)

| JD line | What this project demonstrates |
|---|---|
| "optimizing data synchronization" | Milestone 4 (subscription fan-out, cache writes) + Milestone 6 (per-operation conflict policy) |
| "implementing real-time collaborative editing" | Milestones 4-5 (live sync, connection presence, Apollo optimistic layer) + Milestone 9 (card-level presence) |
| "proprietary websocket data sync framework built for speed and offline support" | Milestones 4, 5, 6 together — the closest honest analog without claiming Linear's actual system |
| "everything from database models to GraphQL resolvers and UI components" | Milestones 2-3: owned schema, resolvers, sessions, deploy — the single biggest net-new CV proof point |
| "React and TypeScript fundamentals" | Already strong per cv.md; reinforced here with Apollo (new) and MobX (new, but scoped to the sync store — say "MobX for the sync store", not "MobX") |
| "experience across the full stack (Browser technologies, Node, GraphQL, PostgreSQL)" | The whole stack is exactly this list |
| "high ownership mentality: self-directed, full-lifecycle builder" | The project itself, end-to-end, is the proof point |

**What this project does NOT close:** Temporal experience, Kubernetes/GCP infra, and true CRDT-based conflict resolution remain honest, named gaps — do not overstate them even after this project exists. The mitigation framing is: "I built the mechanics that matter most for the *product* problem (sync, optimism, offline); the *infrastructure* choices Linear made (Temporal, k8s) are things I'd ramp up on, not things I'm pretending to already know."
