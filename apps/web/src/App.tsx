import { ApolloProvider } from '@apollo/client';
import { useEffect, useMemo, useState } from 'react';
import { createApolloClient } from './apollo/client';
import { Board } from './features/board/Board';
import { CardPanel } from './features/board/CardPanel';
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
import { useRoute } from './router';
import styles from './App.module.css';

interface BoardScreenProps {
  slug: string;
  viewer: ReturnType<typeof useViewer>;
  onSignIn: () => void;
}

function BoardScreen({ slug, viewer, onSignIn }: BoardScreenProps) {
  const { board, loading, error, move, create, rename, edit, remove, tailPosition, setViewing } =
    useBoard(slug);
  useBoardEvents(board?.id);
  const [openId, setOpenIdState] = useState<string | null>(null);
  const setOpenId = (id: string | null) => {
    setOpenIdState(id);
    setViewing(id);
  };
  const open = openId ? (board?.cards.find(c => c.id === openId) ?? null) : null;
  if (loading) return <p className={styles.status}>Loading…</p>;
  if (error) return <p className={styles.status}>Could not load the board: {error.message}</p>;
  if (!board) return <p className={styles.status}>No board at /b/{slug}.</p>;
  return (
    <>
      <Header
        slug={slug}
        boardName={board.name}
        session={viewer.session}
        onSignIn={onSignIn}
        onLogOut={viewer.logOut}
      />
      <Board
        board={board}
        onMove={move}
        onCreate={create}
        onRename={rename}
        onDelete={card => remove(card.id)}
        onOpen={card => setOpenId(card.id)}
      />
      {open ? (
        <CardPanel
          card={open}
          columns={[...board.columns].sort((a, b) => a.position - b.position)}
          onClose={() => setOpenId(null)}
          onSave={fields => edit(open, fields)}
          onMove={columnId => move(open.id, { columnId, position: tailPosition(columnId) })}
          onDelete={() => {
            setOpenId(null);
            remove(open.id);
          }}
        />
      ) : null}
      <SyncLog />
    </>
  );
}

function Screen() {
  const route = useRoute();
  const viewer = useViewer();
  const { board } = useBoard(route.kind === 'board' ? route.slug : '');
  const [signIn, setSignIn] = useState(false);
  if (viewer.loading) return null;
  return (
    <>
      {route.kind === 'board' ? (
        <BoardScreen slug={route.slug} viewer={viewer} onSignIn={() => setSignIn(true)} />
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
