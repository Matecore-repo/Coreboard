import React from 'react';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getStoredTheme, toggleTheme as toggleThemeLib } from '../lib/theme';
import dynamic from 'next/dynamic';

function ThemeBubbleContent() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      const stored = getStoredTheme();
      if (stored) return stored;
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent<'light' | 'dark'>).detail;
        if (detail === 'light' || detail === 'dark') setTheme(detail);
      } catch {}
    };
    window.addEventListener('theme:changed', handler as EventListener);
    return () => window.removeEventListener('theme:changed', handler as EventListener);
  }, []);

  const onClick = () => {
    const next = toggleThemeLib();
    setTheme(next);
    // Notify any listeners (e.g., App for toaster theme syncing)
    try {
      window.dispatchEvent(new CustomEvent<'light' | 'dark'>('theme:changed', { detail: next }));
    } catch {}
  };

  return (
    <button
      onClick={onClick}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="fixed z-40 h-12 w-12 rounded-full shadow-lg border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      style={{ right: '1rem', bottom: '1rem' }}
    >
      {theme === 'dark' ? (
        <Sun className="h-6 w-6 text-yellow-400" />
      ) : (
        <Moon className="h-6 w-6 text-violet-500" />
      )}
    </button>
  );
}

export default dynamic(() => Promise.resolve(ThemeBubbleContent), {
  ssr: false,
});
