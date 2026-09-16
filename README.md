# Driftboard

A small collaborative task board for a freelancer and a client, or a two-to-five person team, to coordinate work on one link with no accounts: open the board, pick a name, drag cards. It exists to demonstrate the mechanics behind a real-time, offline-tolerant sync layer, the kind of thing Linear's job description calls "a proprietary websocket data sync framework built for speed and offline support", so it is deliberately not a Linear clone and not a product: one board schema, three columns, cards with a title and a description. What it does have is built end to end and running live: GraphQL over one graphql-ws socket for queries, mutations and a per-board `boardEvents` subscription; optimistic UI through Apollo's cache with a client-generated id per card; version-checked text edits where the earlier writer wins and the loser gets a toast; an in-memory offline queue in a MobX store that replays in order on reconnect, rebasing each later edit onto the version the earlier one produced, then refetches the board; an idempotent ops ledger so a retried mutation returns its stored result; connection-level presence; and a sync log you can open with ⌘. to watch all of it happen.

**Live:** https://driftboard-4yjg.onrender.com — open the same board link in two windows, pick two names.

## Stack, as built

React 19 + Vite, Apollo Client (cache, optimistic layer, custom link chain `lag? → error → log → queue → split(session ops → HTTP, everything else → graphql-ws)`), MobX for the sync store only, dnd-kit, CSS Modules with the tokens from `design/`. Node 22, Fastify + Mercurius (one process serves the GraphQL API, the socket and the web bundle), PostgreSQL with hand-written SQL through `pg`. Render for the app, Neon for the database. Vitest for the pure modules and one integration test against a Docker Postgres; every milestone was verified in a real browser on the live URL.

## Run it

```
pnpm install
pnpm db:up && pnpm db:reset      # Docker Postgres with schema + seed
pnpm dev                         # API on :4000, web on :5173
pnpm test && pnpm typecheck && pnpm lint
```

Copy `.env.example` to `.env` first. Add `?lag=2000` to a board URL to slow every request and watch the optimistic layer work.

## Not built

- **Account auth** (sign-up, sign-in, boards listed per user). Guest sessions cover the demo; auth is additive and closes no gap the sync mechanics don't.
- **Card-level presence** ("MK is editing" on a row, who's viewing in the panel). The presence map and `setViewing` stub exist; the UI does not.
- **Phone layout.** The board is usable at phone width but not designed for it.
- **Multi-instance deployment.** Pubsub and presence live in process memory, which is the honest reason Linear runs Redis and this does not.
- **Live co-editing of text.** Edits are version-checked, earlier writer wins; no CRDT, because a title is not a document.
- **Persisting the offline queue** across reloads. It is in memory; `idb-keyval` was the named stretch.

`PLAN.md` holds the reasoning, `IMPLEMENTATION.md` the task list with what was verified, `DECISIONS.md` every scope call in one dated line each.
