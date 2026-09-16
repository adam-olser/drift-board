import { Board } from './features/board/Board';
import { seedBoard } from './features/board/seed';
import styles from './App.module.css';

export function App() {
  return (
    <div className={styles.shell}>
      <Board board={seedBoard} />
    </div>
  );
}
