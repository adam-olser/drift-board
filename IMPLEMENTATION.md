# Driftboard — Implementation Layout

Companion to `PLAN.md` (why, order, rules) and `design/` (what it looks like). This file is the how: repo shape, tooling, the two contracts (SQL + GraphQL), and an ordered task list with a "done when" per task. Work top to bottom. Tick tasks off in this file as they land.

## 0. Decisions fixed before the first commit

| # | Choice | Why (one line) |
|---|---|---|
| D-001 | pnpm workspaces, `apps/web`, `apps/server`, plus a plain `shared/` folder aliased from both apps | Same layout as `giglist`; one lockfile, one `pnpm dev`; no package for one file. |
| D-002 | `pg` directly, no ORM | Six tables, ~10 queries. `schema.sql` is the migration. |
| D-003 | CSS Modules, not styled-components | styled-components is in maintenance mode; the design's tokens are CSS variables already. |
| D-004 | `tsx watch` for server dev, `vite` for web dev, `esbuild` for server build | No ts-node, no nodemon, no webpack. |
| D-005 | GraphQL Code Generator: `client` preset → `apps/web/src/gql/`, `typescript-resolvers` → `apps/server/src/gql/` | One schema, generated types on both sides, zero hand-written domain types. |
| D-006 | Node 22, `"type": "module"` everywhere | Native `crypto.randomUUID`, `scrypt`, `structuredClone`, top-level await. |
| D-007 | Vitest: unit for `shared/ordering.ts`, `board/moves.ts`, `sync/replay.ts`; integration for `cards/policy.test.ts` against Docker Postgres | Test where bugs are expensive and manual checking is slow. |
| D-015 | Offline ops are parked with their observable open and replayed with `baseVersion` rebase, not coalesced | The optimistic layer really stays; every promise gets a real result; no self-conflict. |
| D-008 | Render starter web service + Neon free Postgres (or Render basic, paid), auto-deploy on `main` | Always-on web; never Render's free Postgres, it is deleted after 30 days. |
| D-009 | Client-generated card ids, `createCard(id)` | Offline-created cards must be referenceable by later queued ops. |
| D-011 | Cookie `httpOnly` + `sameSite: lax` + `secure` in prod, signed, 1 year | Single origin makes `lax` sufficient. |
| D-013 | Title ≤ 200, description ≤ 5 000, name ≤ 40; `@fastify/rate-limit` on the four HTTP session mutations | Public editable URL. |

`DECISIONS.md` holds the full dated list with interview framings; this table is the summary.

## 1. Repo shape

```
drift-board/
├── PLAN.md  IMPLEMENTATION.md  DECISIONS.md  README.md
├── design/                       # canvas working files + driftboard.html
├── docker-compose.yml            # postgres:16, port 5432, volume, init script creating driftboard + driftboard_test
├── .env.example                  # DATABASE_URL, TEST_DATABASE_URL, COOKIE_SECRET, PORT
├── package.json  pnpm-workspace.yaml  tsconfig.base.json
├── .prettierrc  eslint.config.js  .editorconfig  .gitignore
├── render.yaml                   # one web service; DATABASE_URL points at Neon
├── shared/
│   └── ordering.ts  ordering.test.ts     # no package.json; both apps alias `@shared/*` here
├── apps/server/
│   ├── package.json  tsconfig.json
│   ├── db/schema.sql  db/seed.sql  db/init/01-databases.sql
│   └── src/
│       ├── index.ts              # fastify(), plugins, listen
│       ├── env.ts                # parse + validate process.env once
│       ├── db.ts                 # pg Pool, withTx(fn)
│       ├── schema.graphql        # THE contract (read by both codegen configs)
│       ├── gql/                  # generated resolver types, committed
│       ├── graphql.ts            # mercurius registration, context, pubsub, ws
│       ├── errors.ts             # CardGone, VersionMismatch → GraphQL errors
│       ├── limits.ts             # TITLE_MAX, DESCRIPTION_MAX, NAME_MAX
│       └── modules/
│           ├── sessions/  { resolvers.ts, sql.ts, cookie.ts, colors.ts }
│           ├── boards/    { resolvers.ts, sql.ts }
│           ├── cards/     { resolvers.ts, sql.ts, policy.ts, policy.test.ts }
│           └── presence/  { resolvers.ts, map.ts }
└── apps/web/
    ├── package.json  tsconfig.json  vite.config.ts  codegen.ts  index.html
    └── src/
        ├── main.tsx  App.tsx  router.ts  theme.css  tokens.css   # router.ts: two routes, `/` and `/b/:slug`, ~20 lines on pushState
        ├── gql/                  # generated, committed
        ├── apollo/  { client.ts, links/lagLink.ts, links/logLink.ts, links/queueLink.ts, links/split.ts, cache.ts, cardList.ts }   # cardList.ts: the only code that appends to / removes from Board.cards
        ├── features/
        │   ├── session/  { NameDialog.tsx, SignInDialog.tsx, useViewer.ts, session.graphql }
        │   ├── boards/   { Home.tsx, boards.graphql }                       # `/`: your boards + New board (SignIn artboard state D content)
        │   ├── board/    { Board.tsx, Column.tsx, CardRow.tsx, CardPanel.tsx, useBoard.ts, board.graphql, moves.ts, moves.test.ts }
        │   ├── sync/     { SyncStore.ts, replay.ts, replay.test.ts, Header.tsx, SyncLog.tsx, Toasts.tsx, useSyncStore.ts }
        │   └── presence/ { Avatars.tsx, usePresence.ts }
        └── lib/ (only if two features need the same thing; otherwise it does not exist)
```

Rule from `PLAN.md` applies: no `utils/`. `lib/` is created the day something is genuinely shared, not before.

## 2. Contract A — `apps/server/db/schema.sql`

```sql
create extension if not exists pgcrypto;

create table sessions (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,
  color         text not null,
  user_id       uuid null,
  created_at    timestamptz not null default now()
);

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  password_hash text not null,
  name          text not null,
  created_at    timestamptz not null default now()
);
create unique index users_email_lower on users (lower(email));
alter table sessions add constraint sessions_user_fk foreign key (user_id) references users(id);
create index sessions_user on sessions (user_id);

create table boards (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  name                  text not null,
  key_prefix            text not null,
  next_key_no           integer not null default 1,
  created_by_session_id uuid not null references sessions(id),
  created_at            timestamptz not null default now()
);

create table columns (
  id        uuid primary key default gen_random_uuid(),
  board_id  uuid not null references boards(id) on delete cascade,
  title     text not null,
  position  integer not null
);
create index columns_board on columns (board_id, position);

create table cards (
  id                    uuid primary key default gen_random_uuid(),
  board_id              uuid not null references boards(id) on delete cascade,
  column_id             uuid not null references columns(id),
  key                   text not null,
  title                 text not null,
  description           text not null default '',
  position              double precision not null,
  version               integer not null default 1,
  updated_at            timestamptz not null default now(),
  updated_by_session_id uuid not null references sessions(id),
  deleted_at            timestamptz null,
  created_at            timestamptz not null default now(),
  unique (board_id, key)
);
create index cards_live_order on cards (board_id, column_id, position) where deleted_at is null;

create table ops (
  op_id       uuid primary key,
  session_id  uuid not null references sessions(id),
  board_id    uuid not null references boards(id) on delete cascade,
  type        text not null check (type in ('createCard','updateCard','moveCard','deleteCard')),
  result      jsonb not null,
  applied_at  timestamptz not null default now()
);
create index ops_board_time on ops (board_id, applied_at);
```

`users` ships in Milestone 2 even though it is only used in Milestone 8, because `sessions.user_id` needs the FK and a later `alter table` is one more thing to run on Render.

## 3. Contract B — `apps/server/src/schema.graphql`

```graphql
scalar DateTime

type Board { id: ID!, slug: String!, name: String!, keyPrefix: String!, columns: [Column!]!, cards: [Card!]! }   # cards is ONE flat list; the client groups by columnId and sorts by position
type Column { id: ID!, title: String!, position: Int! }
type Card {
  id: ID!, key: String!, title: String!, description: String!
  columnId: ID!, position: Float!, version: Int!
  updatedAt: DateTime!, updatedBy: Peer!
}
type Peer { sessionId: ID!, name: String!, color: String! }
type Presence { sessionId: ID!, name: String!, color: String!, viewingCardId: ID }
type Session { id: ID!, displayName: String!, color: String!, user: User }
type User { id: ID!, email: String!, name: String! }
type Viewer { session: Session, boards: [Board!]! }

type Query {
  board(slug: String!): Board
  viewer: Viewer!
}

# ---- HTTP only: these set the cookie
type Mutation {
  startGuestSession(displayName: String!): Session!
  signUp(email: String!, password: String!, name: String!): Session!
  logIn(email: String!, password: String!): Session!
  logOut: Session!

  # ---- socket, no opId (cannot happen offline; a duplicate just makes another board)
  createBoard(name: String!): Board!

  # ---- socket, each carries an opId
  createCard(opId: ID!, id: ID!, boardId: ID!, columnId: ID!, title: String!, position: Float!): Card!   # id is client-generated (D-009)
  updateCard(opId: ID!, cardId: ID!, baseVersion: Int!, title: String, description: String): Card!
  moveCard(opId: ID!, cardId: ID!, columnId: ID!, position: Float!): [Card!]!   # every card the move (or reindex) touched
  deleteCard(opId: ID!, cardId: ID!): ID!

  # ---- socket, no opId, no ledger row, no Postgres
  setViewing(boardId: ID!, cardId: ID): Boolean!
}

# every event carries origin = the session that caused it; a client ignores its own events (its mutation result already applied them)
type CardCreated { origin: ID!, card: Card! }
type CardUpdated { origin: ID!, card: Card! }
type CardMoved   { origin: ID!, cards: [Card!]! }
type CardDeleted { origin: ID!, cardId: ID! }
type PresenceChanged { origin: ID!, peers: [Presence!]! }
union BoardEvent = CardCreated | CardUpdated | CardMoved | CardDeleted | PresenceChanged

type Subscription { boardEvents(boardId: ID!): BoardEvent! }
```

Errors are GraphQL errors with `extensions.code` ∈ `CARD_GONE | VERSION_MISMATCH | UNAUTHENTICATED | NOT_FOUND | BAD_INPUT`; `VERSION_MISMATCH` carries `extensions.current: Card`. Defined once in `errors.ts`, mapped to toasts once in `SyncStore.ts`. Anything else is logged by pino and surfaces as `INTERNAL` with no detail.

`extensions.current` is for the toast text only. The cache never learns the truth from an error: the winning edit arrives as a `CardUpdated` event, and after offline replay the `network-only` refetch covers anything missed. This keeps the three-sanctioned-cache-writes rule intact.

Only **accepted** mutations get an `ops` row (the row is written inside the same transaction, so a rejection rolls it back). A rejected op that is retried is simply re-evaluated.

## 4. Root scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "lint": "prettier --check . && eslint .",
    "test": "pnpm -r test",
    "db:up": "docker compose up -d",
    "db:reset": "docker compose exec -T postgres psql -U driftboard -d driftboard -v ON_ERROR_STOP=1 -f /db/schema.sql -f /db/seed.sql",
    "codegen": "pnpm -r codegen"
  }
}
```

`db:reset` runs inside the container (`apps/server/db` is mounted at `/db`), so no local `psql` is required. `schema.sql` starts with `drop schema public cascade; create schema public;` so it is rerunnable. `pnpm test` runs the server integration test against `TEST_DATABASE_URL`, applying `schema.sql` through `pg` first; when that database is unreachable the file skips with one warning line instead of failing, so the pure tests still run without Docker. Root `package.json` also carries `"packageManager": "pnpm@10"` so Render's corepack picks pnpm.

Fresh clone: `pnpm i && cp .env.example .env && pnpm db:up && pnpm db:reset && pnpm dev`. Five commands, under five minutes, or Development Rules say stop and cut.

## 5. Task list

Each task is one commit (or two). "Done when" is the verification, executed, not assumed. Times are honest guesses for someone new to Apollo and MobX.

### Milestone 1 — Static board (~3 h)

- [x] **T1.1 Scaffold** — `git init`, root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`, `paths` for `@/*` and `@shared/*`), Prettier (ganba-hero config), ESLint flat config with `typescript-eslint` recommended + `eslint-plugin-react-hooks`, `.gitignore`, `.editorconfig`. Root scripts above. `DECISIONS.md` already exists; add a line if anything here changes.
  *Done when* `pnpm lint && pnpm typecheck` pass on an empty workspace.
- [x] **T1.2 `shared/ordering.ts`** (aliased as `@shared/ordering` in both apps' tsconfig and Vite/esbuild) — `between(a: number | null, b: number | null): number`, `POSITION_MIN_GAP = 1e-6`, `needsReindex(positions: number[]): boolean`, `reindex(n: number): number[]` (evenly spaced from 1024). Vitest colocated.
  *Done when* tests cover: empty column, head, tail, between, gap exhaustion.
- [x] **T1.3 `apps/web` scaffold** — Vite + React + TS, `tokens.css` from `design/Components.dc.html` (both theme sets as CSS variables on `[data-theme]`), `theme.css` base. No components yet.
  *Done when* the dev server shows a blank page in the dark token colours.
- [x] **T1.4 Board layout** — `Board.tsx` (3-column grid), `Column.tsx`, `CardRow.tsx` (key, title, last-editor chip = `updatedBy`; there is no assignee in the model) per `design/Main.dc.html`, seeded local state shaped like the GraphQL `Board` type. No header yet.
  *Done when* it looks like the Main artboard's board area, minus header and log.
- [x] **T1.5 Drag and drop** — `@dnd-kit/core` + `@dnd-kit/sortable` with `KeyboardSensor` on; `moves.ts` is pure: `(cards, activeId, over) → { columnId, position }` via `between` from the drop target's neighbours.
  *Done when* `moves.test.ts` covers drop at head, tail, between, into an empty column, onto itself; and cards visibly drag within and across columns.

### Milestone 2 — API + Postgres + guest sessions (~8 h)

- [x] **T2.1 Postgres** — `docker-compose.yml` with `db/init/01-databases.sql` mounted into `/docker-entrypoint-initdb.d` (creates `driftboard_test` next to the default db), `schema.sql` (above), `seed.sql` (one board `7f3k2` "Client site redesign", key prefix `DB`, three columns, the nine cards from the Main artboard authored by three seed sessions named MK, JO and Ada so the chips match the design). `db.ts` with `Pool` and `withTx`.
  *Done when* `pnpm db:up && pnpm db:reset` succeeds twice in a row.
- [x] **T2.2 Fastify + Mercurius** — `index.ts`, `env.ts`, `graphql.ts` registering `schema.graphql` with empty resolvers typed from `src/gql/` (server codegen config), `@fastify/cookie` with the D-011 attributes, `@fastify/rate-limit` scoped to the session mutations. GraphiQL on in dev.
  *Done when* `{ viewer { session { id } } }` returns `null` session from GraphiQL at `localhost:4000/graphiql`.
- [x] **T2.3 Sessions** — `modules/sessions`: `startGuestSession` inserts a row, assigns a colour from `colors.ts` (eight hex values, the design's lime `#b7f26a`, amber `#ffb86b`, blue `#8fb8ff` first; picked by `count % 8`), sets the cookie; context loader reads the cookie → `Session | null` for both HTTP requests and the WebSocket upgrade; `viewer` resolver.
  *Done when* two browsers get two sessions with different colours and `viewer` returns each its own.
- [x] **T2.4 Boards** — `modules/boards`: `board(slug)` (two statements: columns ordered by position; live cards joined to `sessions` for `updatedBy`, returned as the flat `Board.cards` list), `createBoard` (slug = 5 lowercase base32 chars from `randomUUID`, retried once on unique violation; key prefix = up to 3 initials uppercased, `DB` if the name yields none; seeds the three columns), `viewer.boards`.
  *Done when* `board(slug:"7f3k2")` returns the seed and `createBoard` returns a board that `board(slug)` can read back.
- [x] **T2.5 Card mutations + policy** — `modules/cards/policy.ts` holds the four rules from `PLAN.md`'s table as one function per op; `sql.ts` has one parameterised statement per rule and one row type + mapper per table; `resolvers.ts` validates lengths from `limits.ts`, wraps each op in `withTx` and writes the `ops` row. `ops` lookup first: on hit, return stored `result`. Each op begins with `select … from cards where id = $1 for update`: no row → `NOT_FOUND`, `deleted_at` set → `CARD_GONE`, version differs (updateCard only) → `VERSION_MISMATCH`; this is how the three outcomes are told apart instead of guessing from a zero-row update. `createCard` takes the client id. Card key from `update boards set next_key_no = next_key_no + 1 … returning`. `moveCard` returns every card it changed (reindex path included) and never touches `version`.
  *Done when* `policy.test.ts` (Vitest, real Postgres, one fresh schema per run) passes these cases: same `opId` twice → identical result, one row; stale `baseVersion` → `VERSION_MISMATCH` with `current`; `moveCard` does not change `version`; `moveCard`/`updateCard` on a deleted card → `CARD_GONE`; `deleteCard` twice → success; 30 cards moved repeatedly to the head reindex and the returned list covers every changed card; a `createCard` with an existing id → `BAD_INPUT`.
- [x] **T2.6 Apollo + codegen** — web `codegen.ts` reading `schema.graphql`, `client` preset into `src/gql/`; `board.graphql` and `session.graphql` documents; `apollo/client.ts` with `HttpLink` to `/graphql`; Vite proxy for `/graphql` (`ws: true`). `cache.ts` with `typePolicies` keyed on `id`; `Board.cards` is a flat list with the default merge (replace). `useBoard.ts` derives `cardsByColumn` with one `useMemo`-free pass (filter + sort, cheap at this size).
  *Done when* `pnpm codegen` is clean and the board renders from the API instead of seeded state.
- [x] **T2.7 Routes, name dialog, wiring** — `router.ts` (`/` and `/b/:slug` on `history.pushState`, no router library); `Home.tsx` at `/` lists `viewer.boards` with a **New board** button (`createBoard` then navigate); `NameDialog.tsx` (`<dialog>`, SignIn artboard state A) shown on either route when `viewer.session` is null; `useBoard.ts`; drag calls `moveCard`; inline title edit calls `updateCard`; `+ new` calls `createCard`.
  *Done when* refresh preserves everything and Milestone 2's Verify line in `PLAN.md` passes.

### Milestone 3 — Deploy (~2 h)

- [x] **T3.1 Single origin** — server serves `apps/web/dist` via `@fastify/static` with SPA fallback; `pnpm build` builds shared → web → server (esbuild bundle to `apps/server/dist/index.js`).
  *Done when* `pnpm build && node apps/server/dist/index.js` serves the app on one port with no proxy.
- [x] **T3.2 Render + Neon** — create the Neon project, run `schema.sql` + `seed.sql` against it once with `psql` (or the Neon SQL editor). `render.yaml`: one web service (build `pnpm i --frozen-lockfile && pnpm build`, start `node apps/server/dist/index.js`, starter plan), env vars `DATABASE_URL` (Neon, with `sslmode=require`) and `COOKIE_SECRET` (generated), `NODE_ENV=production`, auto-deploy on `main`.
  *Done when* the live URL passes Milestone 3's Verify line and a fresh clone runs locally in under 5 minutes by the clock.

### Milestone 4 — Socket, subscriptions, connection presence (~6 h)

- [x] **T4.1 graphql-ws server** — Mercurius `subscription: { fullWsTransport: true, context: (socket, request) => sessionFromCookie(request) }` so queries and mutations ride the socket too (protocol `graphql-transport-ws`, which is what the `graphql-ws` client speaks). `boardEvents(boardId)` topic `board:<id>`; the subscribe resolver records `boardId` on the connection context. Publish after each `withTx` commit with `origin` = the caller's session id.
- [x] **T4.2 Presence map** — `modules/presence/map.ts` `Map<boardId, Map<sessionId, Presence>>`; add in the `boardEvents` subscribe resolver, remove in Mercurius `subscription.onDisconnect` using the `boardId` stored on the connection context; publish `PresenceChanged` both times. `setViewing` resolver stub (returns true, implemented in T9.1).
- [ ] **T4.3 Client transport** — `GraphQLWsLink` over `createClient({ url, lazy: false, retryAttempts: Infinity, shouldRetry: () => true })`; `split.ts` routes the four session mutations to `HttpLink`, everything else to ws. `logLink.ts` pushes `{ ts, op, vars, status, ms }` into the MobX store (T4.4).
- [ ] **T4.4 `SyncStore.ts`** — MobX `makeAutoObservable(this, { queue: observable.shallow })`: `connection: 'online'|'offline'|'syncing'`, `log: LogEntry[]`, `queue: PendingOp[]` (shallow, because entries hold Apollo `Operation`/`Observer` objects that must not be proxied), `toasts`, `peers`, `replayProgress: { done, total } | null`. `attach(client)` is called once from `client.ts` so the store can run the reconciliation query without a circular import. Fed by `graphql-ws` `on('connected'|'closed')`; `connected` triggers `replay()` (T6.3).
- [ ] **T4.5 Event handlers** — `useBoard.ts` subscribes; events whose `origin` is `viewer.session.id` are dropped (the mutation result already applied them). `CardUpdated`/`CardMoved` need no handler code beyond letting Apollo normalise the `Card` objects (flat list, keyed by id). `CardCreated` → `cardList.append(cache, boardId, card)`; `CardDeleted` → `cardList.remove(cache, boardId, cardId)` + `cache.evict`; `PresenceChanged` replaces `peers` in the store. `Avatars.tsx` renders chips.
  *Done when* Milestone 4's Verify line passes on the live URL, including the third-window chip test.

### Milestone 5 — Optimistic UI (~3 h)

- [ ] **T5.1 `lagLink.ts`** — reads `?lag=` once at startup, delays every operation by that many ms; absent → link is not added.
- [ ] **T5.2 `optimisticResponse`** on `moveCard` (the card with its new `columnId`/`position`), `updateCard`, `createCard` (real client-generated id, key `···` until the result lands); `createCard`'s `update` calls `cardList.append` (Apollo runs `update` for the optimistic layer too, so the new card appears instantly); `deleteCard`'s `update` calls `cardList.remove`; results replace layers.
- [ ] **T5.3 Error mapping** — `onError` link → `SyncStore.toast()` for `CARD_GONE`, `VERSION_MISMATCH` (message includes the current title). `Toasts.tsx` per Components artboard.
  *Done when* Milestone 5's Verify line passes with `?lag=2000` on the live URL.

### Milestone 6 — Conflicts + offline (~7 h)

- [ ] **T6.1 Inline title edit sends `baseVersion`** from the cached card; on `VERSION_MISMATCH` the toast shows the current title and the field resets to it.
- [ ] **T6.2 `replay.ts`** (pure) — `rebase(queue: PendingOp[], applied: { cardId, version }): PendingOp[]` replaces `baseVersion` on every later `updateCard` for that card; `nextToReplay(queue)` returns the head. Vitest covers: two edits same card, edit then move then edit, edits on different cards untouched, rejected head leaves the tail unchanged.
- [ ] **T6.3 `queueLink.ts` + `SyncStore.replay()`** — the link only parks: `request(operation, forward)` returns `new Observable(observer => …)`; if `store.connection === 'online'` it subscribes `forward(operation)` to the observer straight away, otherwise it pushes `{ operation, forward, observer, cardId, baseVersion }` onto `store.queue` and returns (the observable stays open, so Apollo keeps the optimistic layer). The store drives replay on `connected`: `connection = 'syncing'`, `replayProgress = { done: 0, total: queue.length }`; loop: shift the head, set `operation.variables.baseVersion` from the entry, `forward(operation).subscribe(observer)` wrapped in a promise that settles on complete/error; on success `queue = rebase(queue, { cardId, version })`; on `VERSION_MISMATCH`/`CARD_GONE` the error has already reached the observer, so Apollo dropped that layer and `onError` toasted; `done++`. After the loop: `client.query({ query: BoardDocument, variables, fetchPolicy: 'network-only' })`, `replayProgress = null`, `connection = 'online'`. If the socket closes mid-replay, stop the loop and leave the rest parked.
- [ ] **T6.4 Queued row state** — `CardRow.tsx` shows the dashed `queued` style for cards with a pending op (`store.queue` lookup).
  *Done when* every clause of Milestone 6's Verify line passes on the live URL, including the server-restart run.

### Milestone 7 — Designed UI (~6 h)

- [ ] **T7.1 `Header.tsx`** — states 1, 3, 4 from HeaderStates artboard, driven only by `SyncStore`; offline banner; `Syncing i / n`. Latency pill only if `graphql-ws` `ping`/`pong` timing is one line, else the pill reads `WS`.
- [ ] **T7.2 Theme switch** — `data-theme` on `<html>`, `localStorage`, `prefers-color-scheme` default.
- [ ] **T7.3 `SyncLog.tsx`** — collapsible dev panel over `store.log`, row styles from Components artboard, `⌘.` toggles.
- [ ] **T7.4 `CardPanel.tsx`** — slide-in per CardDetail artboard, `⌘↵` saves with `baseVersion`, history rows filtered from `store.log` by card.
- [ ] **T7.5 README** — one paragraph, honest use case, Linear context, "Not built" list (currently Milestones 8–10).
  *Done when* the four-step walkthrough runs end to end on the live URL, timed under 90 seconds.

**Core demo complete.** Tag `v0.1`.

### Milestone 8 — Account auth (~4 h)
- [ ] T8.1 `signUp`/`logIn`/`logOut` with `crypto.scrypt` (N=2^15, 16-byte salt, stored `salt:hash`), constant-time compare; `logOut` creates a new guest session and sets the cookie.
- [ ] T8.2 `SignInDialog.tsx` states B/C, `My boards` menu (state D), header state 2.
*Done when* Milestone 8's Verify line passes.

### Milestone 9 — Card-level presence (~2 h)
- [ ] T9.1 `setViewing` writes the map and publishes; `CardRow` "editing" marker; panel "who's viewing".

### Milestone 10 — Phone layout (stretch)
- [ ] T10.1 Column tabs, long-press move sheet, log collapsed to bottom bar per Mobile artboard.

## 6. Environment

`.env.example`
```
DATABASE_URL=postgres://driftboard:driftboard@localhost:5432/driftboard
TEST_DATABASE_URL=postgres://driftboard:driftboard@localhost:5432/driftboard_test
COOKIE_SECRET=change-me-32-chars-minimum-please
PORT=4000
NODE_ENV=development
```
Local Docker on this machine is Rancher Desktop: make sure `~/.rd/bin` is on `PATH` (credential helper) and the CLI context is `rancher-desktop` (`docker context use rancher-desktop`), otherwise `docker compose` talks to a stale colima socket.

On Render, `DATABASE_URL` is the Neon connection string (or the linked paid Render Postgres) and `COOKIE_SECRET` a generated secret; nothing else is needed.

## 7. Definition of done for the whole project

1. `pnpm lint && pnpm typecheck && pnpm test` green on `main` with the database up.
2. Fresh clone to running board in under 5 minutes, timed.
3. Four-step walkthrough on the live URL in under 90 seconds, timed, once with `?lag=2000`.
4. `README.md` "Not built" list matches reality. `DECISIONS.md` has a dated line for every deviation from this file.
