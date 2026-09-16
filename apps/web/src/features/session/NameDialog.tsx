import { useEffect, useRef, useState, type FormEvent } from 'react';
import styles from './NameDialog.module.css';

interface Props {
  /** Board name for "Join …"; undefined on the home screen. */
  boardName?: string | undefined;
  busy: boolean;
  errorMessage?: string | undefined;
  onSubmit: (displayName: string) => void;
  onSignIn: () => void;
}

/** SignIn artboard state A: first visit, pick a name. Creates the guest session. */
export function NameDialog({ boardName, busy, errorMessage, onSubmit, onSignIn }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <dialog ref={ref} className={styles.dialog} onCancel={e => e.preventDefault()}>
      <form className={styles.form} onSubmit={submit} method="dialog">
        <h1 className={styles.title}>
          {boardName ? `Join “${boardName}”` : 'Welcome to Driftboard'}
        </h1>
        <p className={styles.sub}>Pick a name so others can see who's here. No account needed.</p>
        <label className={styles.label}>
          Your name
          <input
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            autoFocus
            required
          />
        </label>
        <span className={styles.note}>colour is assigned per session</span>
        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        <button type="submit" className={styles.submit} disabled={busy || !name.trim()}>
          {boardName ? 'Join board' : 'Continue'}
        </button>
        <p className={styles.foot}>
          Have an account?{' '}
          <button type="button" className={styles.footLink} onClick={onSignIn}>
            Sign in instead
          </button>
        </p>
      </form>
    </dialog>
  );
}
