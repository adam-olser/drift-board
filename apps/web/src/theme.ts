import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'theme';
const listeners = new Set<() => void>();

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    return null;
  }
}

/** T7.2: localStorage wins, else prefers-color-scheme. Applied as data-theme on <html>. */
export function currentTheme(): Theme {
  return stored() ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}

export function applyTheme(theme: Theme = currentTheme()): void {
  document.documentElement.dataset['theme'] = theme;
  listeners.forEach(l => l());
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // private mode: the choice lasts for the page
  }
  applyTheme(theme);
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (document.documentElement.dataset['theme'] as Theme | undefined) ?? 'dark'
  );
}
