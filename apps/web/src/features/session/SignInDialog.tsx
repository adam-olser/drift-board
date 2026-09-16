import { useEffect, useRef, useState, type FormEvent } from 'react';
import styles from './NameDialog.module.css';

interface Props {
  busy: boolean;
  errorMessage?: string | undefined;
  onLogIn: (email: string, password: string) => Promise<unknown>;
  onSignUp: (email: string, password: string, name: string) => Promise<unknown>;
  onClose: () => void;
  /** No session yet: the third button reads "Continue as guest" and goes back to the name dialog. */
  guestOption?: boolean;
}

/** SignIn artboard states B (sign in) and C (error), plus the create-account variant. */
export function SignInDialog({
  busy,
  errorMessage,
  onLogIn,
  onSignUp,
  onClose,
  guestOption,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (mode === 'in') await onLogIn(email.trim(), password);
      else await onSignUp(email.trim(), password, name.trim());
      onClose();
    } catch {
      // the mutation error is rendered from props
    }
  };

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose}>
      <form className={styles.form} onSubmit={submit} method="dialog">
        <h1 className={styles.title}>{mode === 'in' ? 'Sign in' : 'Create an account'}</h1>
        <p className={styles.sub}>Keeps your colour and anything queued. Adds “My boards”.</p>
        {mode === 'up' ? (
          <label className={styles.label}>
            Name
            <input
              className={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              required
            />
          </label>
        ) : null}
        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={254}
            autoFocus
            required
          />
        </label>
        <label className={styles.label}>
          Password
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            maxLength={200}
            required
            aria-invalid={errorMessage ? true : undefined}
          />
        </label>
        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        <button type="submit" className={styles.submit} disabled={busy}>
          {mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className={styles.link} onClick={onClose}>
          {guestOption ? 'Continue as guest' : 'Cancel'}
        </button>
        <p className={styles.foot}>
          {mode === 'in' ? 'New here?' : 'Have an account?'}{' '}
          <button
            type="button"
            className={styles.footLink}
            onClick={() => setMode(m => (m === 'in' ? 'up' : 'in'))}
          >
            {mode === 'in' ? 'Create an account' : 'Sign in instead'}
          </button>
        </p>
      </form>
    </dialog>
  );
}
