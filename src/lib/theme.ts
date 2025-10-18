export type Theme = 'light' | 'dark';

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') return t;
    return null;
  } catch (e) {
    // localStorage access denied or not available
    return null;
  }
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  } catch (e) {
    // localStorage access denied or not available; fail silently
  }
}

export function toggleTheme(): Theme {
  const current = getStoredTheme() ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const next: Theme = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  return next;
}


