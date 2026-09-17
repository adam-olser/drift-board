import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level catch-all: React has no hook equivalent, so this is the one class component in the
 * app. An unhandled render error used to white-screen the whole page with no way back; this
 * shows what broke and a reload button instead. Does not catch errors in event handlers or
 * async code (React never routes those here) — those are unhandled promise rejections, a
 * separate and much larger problem than this component is meant to solve.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // no console.* per PLAN.md; pino is server-side only, so this is the one exception —
    // there is no sync log to write to once the tree that owns it has already crashed.
    // eslint-disable-next-line no-console
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.message}>{error.message || 'An unexpected error occurred.'}</p>
          <p className={styles.note}>
            Your edits up to this point were saved as they happened; nothing since the error was
            lost by reloading.
          </p>
          <button type="button" className={styles.reload} onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
