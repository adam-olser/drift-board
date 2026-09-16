import { ApolloProvider } from '@apollo/client';
import { useMemo } from 'react';
import { createApolloClient } from './apollo/client';
import { Board } from './features/board/Board';
import { useBoard } from './features/board/useBoard';
import styles from './App.module.css';

const DEMO_SLUG = '7f3k2'; // routes arrive in T2.7

function BoardScreen({ slug }: { slug: string }) {
  const { board, loading, error } = useBoard(slug);
  if (loading) return <p className={styles.status}>Loading…</p>;
  if (error) return <p className={styles.status}>Could not load the board: {error.message}</p>;
  if (!board) return <p className={styles.status}>No board at /b/{slug}.</p>;
  return <Board board={board} onMove={() => undefined} />;
}

export function App() {
  const client = useMemo(() => createApolloClient(), []);
  return (
    <ApolloProvider client={client}>
      <div className={styles.shell}>
        <BoardScreen slug={DEMO_SLUG} />
      </div>
    </ApolloProvider>
  );
}
