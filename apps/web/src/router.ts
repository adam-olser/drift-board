import { useSyncExternalStore } from 'react';

export type Route = { kind: 'home' } | { kind: 'board'; slug: string; cardKey: string | null };

const BOARD_PATH = /^\/b\/([a-z0-9]+)(?:\/c\/([A-Za-z0-9-]+))?\/?$/;

export function parseRoute(pathname: string): Route {
  const match = BOARD_PATH.exec(pathname);
  return match?.[1]
    ? { kind: 'board', slug: match[1], cardKey: match[2] ?? null }
    : { kind: 'home' };
}

export const boardPath = (slug: string) => `/b/${slug}`;
export const cardPath = (slug: string, key: string) => `/b/${slug}/c/${key}`;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

export function navigate(path: string): void {
  if (window.location.pathname === path) return;
  window.history.pushState(null, '', path);
  // why: queueMicrotask so a route change triggered from inside one component's render/commit
  // (e.g. a link in a component that itself unmounts on navigation) never notifies subscribers
  // synchronously mid-render; React warns ("Cannot update a component while rendering a
  // different component") and can drop the update otherwise.
  queueMicrotask(notify);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

/** Two routes, no router library: `/` and `/b/:slug`. */
export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, () => window.location.pathname);
  return parseRoute(pathname);
}
