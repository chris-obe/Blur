// Landing gate memory: has this browser used the app before, where were they
// last, and what name should we greet them by. Persisted in localStorage; no
// tokens, no PII beyond a display name the user already sees in their own UI.

const LAST_ROUTE_KEY = 'blur.lastRoute';
const VISITED_KEY = 'blur.visited';
const LAST_NAME_KEY = 'blur.lastName';

const DEFAULT_APP_ROUTE = '/gallery';

function safeGet(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    /* private mode / quota — best effort */
  }
}

/** Record the last in-app route so an authenticated cold load can resume it. */
export function recordLastRoute(path: string) {
  if (!path || path === '/' || path.startsWith('/embed')) return;
  safeSet(LAST_ROUTE_KEY, path);
}

export function getLastRoute(): string {
  return safeGet(LAST_ROUTE_KEY) || DEFAULT_APP_ROUTE;
}

/** True once the browser has entered the app shell at least once. */
export function hasVisited(): boolean {
  return safeGet(VISITED_KEY) === '1';
}

export function markVisited() {
  safeSet(VISITED_KEY, '1');
}

/** Remember the signed-in display name for a warm "welcome back" while logged out. */
export function rememberName(name: string | undefined | null) {
  if (name && name.trim()) safeSet(LAST_NAME_KEY, name.trim());
}

export function getRememberedName(): string | null {
  const name = safeGet(LAST_NAME_KEY);
  return name && name.trim() ? name.trim() : null;
}
