// Milestone 1 only: local stand-ins for the GraphQL Board type. Replaced by generated types and
// the board(slug) query in T2.6; the shape (flat cards, columns derived by columnId) is the same.
export interface SeedPeer {
  sessionId: string;
  name: string;
  color: string;
}
export interface SeedColumn {
  id: string;
  title: string;
  position: number;
}
export interface SeedCard {
  id: string;
  key: string;
  title: string;
  description: string;
  columnId: string;
  position: number;
  version: number;
  updatedBy: SeedPeer;
}
export interface SeedBoard {
  id: string;
  slug: string;
  name: string;
  keyPrefix: string;
  columns: SeedColumn[];
  cards: SeedCard[];
}

const MK: SeedPeer = { sessionId: 's-mk', name: 'MK', color: '#b7f26a' };
const JO: SeedPeer = { sessionId: 's-jo', name: 'JO', color: '#ffb86b' };
const A: SeedPeer = { sessionId: 's-a', name: 'A', color: '#8fb8ff' };

const card = (
  key: string,
  title: string,
  columnId: string,
  position: number,
  updatedBy: SeedPeer
): SeedCard => ({
  id: `c-${key}`,
  key,
  title,
  description: '',
  columnId,
  position,
  version: 1,
  updatedBy,
});

export const seedBoard: SeedBoard = {
  id: 'b-1',
  slug: '7f3k2',
  name: 'Client site redesign',
  keyPrefix: 'DB',
  columns: [
    { id: 'col-todo', title: 'To do', position: 1 },
    { id: 'col-doing', title: 'In progress', position: 2 },
    { id: 'col-done', title: 'Done', position: 3 },
  ],
  cards: [
    card('DB-14', 'Rewrite hero copy for the launch page', 'col-todo', 1024, MK),
    card('DB-11', 'Collect logo files from the client', 'col-todo', 2048, A),
    card('DB-09', 'Decide on the pricing table layout', 'col-todo', 3072, JO),
    card('DB-07', 'Set up staging domain', 'col-todo', 4096, A),
    card('DB-13', 'Build responsive nav', 'col-doing', 1024, MK),
    card('DB-12', 'Photograph the workshop', 'col-doing', 2048, A),
    card('DB-03', 'Agree on scope and timeline', 'col-done', 1024, A),
    card('DB-02', 'Choose type pairing', 'col-done', 2048, MK),
    card('DB-01', 'Send first invoice', 'col-done', 3072, JO),
  ],
};
