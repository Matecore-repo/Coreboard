import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onNewAppointment?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onSearch?: () => void;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNewAppointment,
  onSave,
  onCancel,
  onSearch,
  onNavigate,
  enabled = true,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      const isMeta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (isMeta && key === 'n' && onNewAppointment) {
        event.preventDefault();
        onNewAppointment();
        return;
      }

      if (isMeta && key === 's' && onSave && !isInput) {
        event.preventDefault();
        onSave();
        return;
      }

      if (event.key === 'Escape' && onCancel) {
        event.preventDefault();
        onCancel();
        return;
      }

      if (isMeta && (key === 'k' || key === 'b') && onSearch) {
        event.preventDefault();
        onSearch();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onNewAppointment, onSave, onCancel, onSearch]);

  // Flechas para navegación (solo cuando no hay input activo)
  useEffect(() => {
    if (!enabled || !onNavigate) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (isInput) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigate('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigate('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onNavigate('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNavigate('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onNavigate]);
}

