-- Demo board matching design/Main.dc.html. Fixed uuids so the seed is deterministic.
insert into sessions (id, display_name, color) values
  ('00000000-0000-4000-8000-00000000000a', 'Ada', '#8fb8ff'),
  ('00000000-0000-4000-8000-00000000000b', 'MK',  '#b7f26a'),
  ('00000000-0000-4000-8000-00000000000c', 'JO',  '#ffb86b');

insert into boards (id, slug, name, key_prefix, next_key_no, created_by_session_id) values
  ('00000000-0000-4000-8000-000000000001', '7f3k2', 'Client site redesign', 'DB', 15,
   '00000000-0000-4000-8000-00000000000a');

insert into columns (id, board_id, title, position) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'To do',       1),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'In progress', 2),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 'Done',        3);

insert into cards (board_id, column_id, key, title, position, updated_by_session_id) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'DB-14', 'Rewrite hero copy for the launch page', 1024, '00000000-0000-4000-8000-00000000000b'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'DB-11', 'Collect logo files from the client',    2048, '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'DB-09', 'Decide on the pricing table layout',    3072, '00000000-0000-4000-8000-00000000000c'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'DB-07', 'Set up staging domain',                 4096, '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'DB-13', 'Build responsive nav',                  1024, '00000000-0000-4000-8000-00000000000b'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'DB-12', 'Photograph the workshop',               2048, '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'DB-03', 'Agree on scope and timeline',           1024, '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'DB-02', 'Choose type pairing',                   2048, '00000000-0000-4000-8000-00000000000b'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'DB-01', 'Send first invoice',                    3072, '00000000-0000-4000-8000-00000000000c');

-- A couple of demo labels and detail fields, applied after insert so card versions stay at 1
-- (the policy tests key off DB-13's baseVersion sequence starting there).
insert into labels (board_id, name, color) values
  ('00000000-0000-4000-8000-000000000001', 'Design',   '#8fb8ff'),
  ('00000000-0000-4000-8000-000000000001', 'Urgent',   '#ff7b72');

update cards set priority = 'high', due_date = '2026-10-01', assignee_session_id = '00000000-0000-4000-8000-00000000000b'
  where key = 'DB-14';
update cards set priority = 'medium', assignee_session_id = '00000000-0000-4000-8000-00000000000a'
  where key = 'DB-13';

insert into card_labels (card_id, label_id)
  select c.id, l.id from cards c, labels l
   where c.key = 'DB-14' and l.name = 'Urgent' and l.board_id = c.board_id;
insert into card_labels (card_id, label_id)
  select c.id, l.id from cards c, labels l
   where c.key = 'DB-13' and l.name = 'Design' and l.board_id = c.board_id;
