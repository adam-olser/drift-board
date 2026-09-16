import { useSyncExternalStore } from 'react';

export type Route = { kind: 'home' } | { kind: 'board'; slug: string };

const BOARD_PATH = /^\/b\/([a-z0-9]+)\/?$/;

export function parseRoute(pathname: string): Route {
  const match = BOARD_PATH.exec(pathname);
  return match?.[1] ? { kind: 'board', slug: match[1] } : { kind: 'home' };
}

export const boardPath = (slug: string) => `/b/${slug}`;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

export function navigate(path: string): void {
  if (window.location.pathname === path) return;
  window.history.pushState(null, '', path);
  notify();
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
