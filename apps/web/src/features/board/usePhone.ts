import { useSyncExternalStore } from 'react';

const query = '(max-width: 720px)';

/** True below the Mobile artboard's breakpoint; one column at a time with tabs. */
export function usePhone(): boolean {
  return useSyncExternalStore(
    onChange => {
      const mql = matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => matchMedia(query).matches
  );
}
