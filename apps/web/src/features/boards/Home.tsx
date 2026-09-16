import { useMutation, useQuery } from '@apollo/client';
import { useState, type FormEvent } from 'react';
import { CreateBoardDocument, MyBoardsDocument } from '@/gql/graphql';
import { boardPath, navigate } from '@/router';
import { Brand } from '@/features/sync/Brand';
import styles from './Home.module.css';

/** `/`: your boards and a New board field. Backed by viewer.boards (SignIn artboard state D). */
export function Home() {
  const { data } = useQuery(MyBoardsDocument);
  const [createBoard, { loading }] = useMutation(CreateBoardDocument, {
    refetchQueries: [MyBoardsDocument],
  });
  const [name, setName] = useState('');
  const boards = data?.viewer.boards ?? [];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const result = await createBoard({ variables: { name: trimmed } });
    const slug = result.data?.createBoard.slug;
    if (slug) navigate(boardPath(slug));
  };

  return (
    <div className={styles.home}>
      <div className={styles.brand}>
        <Brand />
        Driftboard
      </div>
      <form className={styles.new} onSubmit={submit}>
        <input
          className={styles.input}
          placeholder="New board name"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={80}
          aria-label="New board name"
        />
        <button type="submit" className={styles.button} disabled={loading || !name.trim()}>
          New board
        </button>
      </form>
      <div className={styles.section}>Your boards</div>
      {boards.length === 0 ? (
        <p className={styles.empty}>
          No boards yet. Create one above, or open a link someone shared.
        </p>
      ) : (
        <ul className={styles.list}>
          {boards.map(b => (
            <li key={b.id}>
              <button
                type="button"
                className={styles.item}
                onClick={() => navigate(boardPath(b.slug))}
              >
                <span>{b.name}</span>
                <span className={styles.slug}>{boardPath(b.slug)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
