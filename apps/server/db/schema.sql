-- Driftboard schema. Rerunnable: drops and recreates the public schema.
-- Mirrors PLAN.md → Domain Model. Every table: uuid id, created_at.
drop schema public cascade;
create schema public;
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
  type        text not null check (type in ('createCard', 'updateCard', 'moveCard', 'deleteCard')),
  result      jsonb not null,
  applied_at  timestamptz not null default now()
);
create index ops_board_time on ops (board_id, applied_at);
