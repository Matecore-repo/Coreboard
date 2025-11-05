import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

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
  // Ctrl+N o Cmd+N para nuevo turno
  useHotkeys(
    'ctrl+n, meta+n',
    (e) => {
      e.preventDefault();
      onNewAppointment?.();
    },
    { enabled: enabled && !!onNewAppointment }
  );

  // Ctrl+S o Cmd+S para guardar
  useHotkeys(
    'ctrl+s, meta+s',
    (e) => {
      e.preventDefault();
      onSave?.();
    },
    { enabled: enabled && !!onSave }
  );

  // Escape para cancelar
  useHotkeys(
    'escape',
    (e) => {
      e.preventDefault();
      onCancel?.();
    },
    { enabled: enabled && !!onCancel }
  );

  // Ctrl+K o Cmd+K para buscar
  useHotkeys(
    'ctrl+k, meta+k',
    (e) => {
      e.preventDefault();
      onSearch?.();
    },
    { enabled: enabled && !!onSearch }
  );

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

