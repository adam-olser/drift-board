import { ApolloProvider } from '@apollo/client';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { createApolloClient } from './apollo/client';
import { Board } from './features/board/Board';
import { CardPanel } from './features/board/CardPanel';
import {
  EMPTY_FILTER,
  isFilterActive,
  matchesFilter,
  type BoardFilter,
} from './features/board/filter';
import { FilterBar } from './features/board/FilterBar';
import { useBoard } from './features/board/useBoard';
import { useBoardEvents } from './features/board/useBoardEvents';
import { Home } from './features/boards/Home';
import { NameDialog } from './features/session/NameDialog';
import { SignInDialog } from './features/session/SignInDialog';
import { useViewer } from './features/session/useViewer';
import { Header } from './features/sync/Header';
import { SyncLog } from './features/sync/SyncLog';
import { syncStore } from './features/sync/SyncStore';
import { Toasts } from './features/sync/Toasts';
import { boardPath, cardPath, navigate, useRoute } from './router';
import styles from './App.module.css';

interface BoardScreenProps {
  slug: string;
  /** /b/:slug/c/:key renders that card as a page instead of the board. */
  cardKey: string | null;
  viewer: ReturnType<typeof useViewer>;
  onSignIn: () => void;
}

const BoardScreen = observer(function BoardScreen({
  slug,
  cardKey,
  viewer,
  onSignIn,
}: BoardScreenProps) {
  const {
    board,
    loading,
    error,
    move,
    create,
    rename,
    edit,
    remove,
    addLabel,
    removeLabel,
    tailPosition,
    setViewing,
  } = useBoard(slug);
  useBoardEvents(board?.id);
  const [filter, setFilter] = useState<BoardFilter>(EMPTY_FILTER);
  const [openId, setOpenIdState] = useState<string | null>(null);
  const setOpenId = (id: string | null) => {
    setOpenIdState(id);
    setViewing(id);
  };
  const open = openId ? (board?.cards.find(c => c.id === openId) ?? null) : null;
  const page = cardKey ? (board?.cards.find(c => c.key === cardKey) ?? null) : null;
  if (loading) return <p className={styles.status}>Loading…</p>;
  if (error) return <p className={styles.status}>Could not load the board: {error.message}</p>;
  if (!board) return <p className={styles.status}>No board at /b/{slug}.</p>;
  const columns = [...board.columns].sort((a, b) => a.position - b.position);
  // Everyone assignable: connected peers (live) plus anyone who has ever edited a card here
  // (may be offline now), deduped by session id, connected peers' colours winning.
  const peerMap = new Map(board.cards.map(c => [c.updatedBy.sessionId, c.updatedBy]));
  for (const p of syncStore.peers)
    peerMap.set(p.sessionId, { sessionId: p.sessionId, name: p.name, color: p.color });
  if (viewer.session) {
    peerMap.set(viewer.session.id, {
      sessionId: viewer.session.id,
      name: viewer.session.displayName,
      color: viewer.session.color,
    });
  }
  const peers = [...peerMap.values()];
  const active = isFilterActive(filter);
  const matched = board.cards.filter(c => matchesFilter(c, filter));
  const visibleIds = active ? new Set(matched.map(c => c.id)) : undefined;
  const panelFor = (card: NonNullable<typeof open>, full: boolean) => (
    <CardPanel
      card={card}
      columns={columns}
      peers={peers}
      boardLabels={board.labels}
      full={full}
      fullHref={cardPath(slug, card.key)}
      boardHref={boardPath(slug)}
      onClose={() => (full ? navigate(boardPath(slug)) : setOpenId(null))}
      onSave={fields => edit(card, fields)}
      onMove={columnId => move(card.id, { columnId, position: tailPosition(columnId) })}
      onDelete={() => {
        if (full) navigate(boardPath(slug));
        else setOpenId(null);
        remove(card.id);
      }}
      onAddLabel={(name, color) => addLabel(card, name, color)}
      onRemoveLabel={labelId => removeLabel(card, labelId)}
    />
  );
  return (
    <>
      <Header
        slug={slug}
        boardName={board.name}
        session={viewer.session}
        onSignIn={onSignIn}
        onLogOut={viewer.logOut}
      />
      {cardKey ? (
        <div className={styles.body}>
          {page ? (
            panelFor(page, true)
          ) : (
            <p className={styles.status}>
              No card {cardKey} on this board.{' '}
              <a
                href={boardPath(slug)}
                onClick={e => {
                  e.preventDefault();
                  navigate(boardPath(slug));
                }}
              >
                Back to the board
              </a>
            </p>
          )}
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.main}>
            <FilterBar
              filter={filter}
              onChange={setFilter}
              peers={peers}
              boardLabels={board.labels}
              matchCount={matched.length}
              totalCount={board.cards.length}
            />
            <Board
              board={board}
              onMove={move}
              onCreate={create}
              onRename={rename}
              onDelete={card => remove(card.id)}
              onOpen={card => setOpenId(card.id)}
              visibleIds={visibleIds}
            />
            <SyncLog />
          </div>
          {open ? panelFor(open, false) : null}
        </div>
      )}
    </>
  );
});

function Screen() {
  const route = useRoute();
  const viewer = useViewer();
  const { board } = useBoard(route.kind === 'board' ? route.slug : '');
  const [signIn, setSignIn] = useState(false);
  if (viewer.loading) return null;
  return (
    <>
      {route.kind === 'board' ? (
        <BoardScreen
          slug={route.slug}
          cardKey={route.cardKey}
          viewer={viewer}
          onSignIn={() => setSignIn(true)}
        />
      ) : (
        <Home />
      )}
      {signIn ? (
        <SignInDialog
          busy={viewer.busy}
          errorMessage={viewer.authError}
          onLogIn={viewer.logIn}
          onSignUp={viewer.signUp}
          onClose={() => setSignIn(false)}
          guestOption={!viewer.session}
        />
      ) : viewer.session ? null : (
        <NameDialog
          boardName={board?.name}
          busy={viewer.starting}
          errorMessage={viewer.error?.message}
          onSubmit={viewer.startGuestSession}
          onSignIn={() => setSignIn(true)}
        />
      )}
    </>
  );
}

export function App() {
  const client = useMemo(() => createApolloClient(), []);
  // why: attach here, not inside createApolloClient — StrictMode runs the memo factory twice
  // in dev and keeps only one client; the store must hold that one.
  useEffect(() => syncStore.attach(client), [client]);
  return (
    <ApolloProvider client={client}>
      <div className={styles.shell}>
        <Screen />
        <Toasts />
      </div>
    </ApolloProvider>
  );
}
