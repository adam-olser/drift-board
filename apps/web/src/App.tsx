import { ApolloProvider } from '@apollo/client';
import { useMemo } from 'react';
import { createApolloClient } from './apollo/client';
import { Board } from './features/board/Board';
import { useBoard } from './features/board/useBoard';
import { useBoardEvents } from './features/board/useBoardEvents';
import { Home } from './features/boards/Home';
import { NameDialog } from './features/session/NameDialog';
import { useViewer } from './features/session/useViewer';
import { Avatars } from './features/sync/Avatars';
import { useRoute } from './router';
import styles from './App.module.css';

function BoardScreen({ slug }: { slug: string }) {
  const { board, loading, error, move, create, rename } = useBoard(slug);
  useBoardEvents(board?.id);
  if (loading) return <p className={styles.status}>Loading…</p>;
  if (error) return <p className={styles.status}>Could not load the board: {error.message}</p>;
  if (!board) return <p className={styles.status}>No board at /b/{slug}.</p>;
  return (
    <>
      <Avatars />
      <Board board={board} onMove={move} onCreate={create} onRename={rename} />
    </>
  );
}

function Screen() {
  const route = useRoute();
  const viewer = useViewer();
  const { board } = useBoard(route.kind === 'board' ? route.slug : '');
  if (viewer.loading) return null;
  return (
    <>
      {route.kind === 'board' ? <BoardScreen slug={route.slug} /> : <Home />}
      {viewer.session ? null : (
        <NameDialog
          boardName={board?.name}
          busy={viewer.starting}
          errorMessage={viewer.error?.message}
          onSubmit={viewer.startGuestSession}
        />
      )}
    </>
  );
}

export function App() {
  const client = useMemo(() => createApolloClient(), []);
  return (
    <ApolloProvider client={client}>
      <div className={styles.shell}>
        <Screen />
      </div>
    </ApolloProvider>
  );
}
