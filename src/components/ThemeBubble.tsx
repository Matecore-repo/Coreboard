import React from 'react';
import { useEffect, useState } from 'react';
import { Sun, Moon, Sparkles, Mic } from 'lucide-react';
import { FaMagic, FaWhatsapp } from 'react-icons/fa';
import { getStoredTheme, toggleTheme as toggleThemeLib, applyTheme } from '../lib/theme';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'motion/react';

type BubbleOption = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

function ThemeBubbleContent() {
  const router = useRouter();
  // Detectar si estamos en dashboard: cualquier ruta que no sea login/auth
  const loginRoutes = ['/login', '/', '/index'];
  const authRoutes = router.pathname?.startsWith('/auth') || router.pathname?.startsWith('/test');
  const isDashboard = typeof window !== 'undefined' && 
    router.pathname && 
    !loginRoutes.includes(router.pathname) && 
    !authRoutes &&
    router.pathname !== '/accept-invite';
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      const stored = getStoredTheme();
      if (stored) return stored;
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const [isExpanded, setIsExpanded] = useState(false);

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

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!isExpanded || !isDashboard) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-theme-bubble]')) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, isDashboard]);

  const handleThemeToggle = (newTheme: 'light' | 'dark') => {
    applyTheme(newTheme);
    setTheme(newTheme);
    setIsExpanded(false);
    try {
      window.dispatchEvent(new CustomEvent<'light' | 'dark'>('theme:changed', { detail: newTheme }));
    } catch {}
  };

  // En login: comportamiento simple
  if (!isDashboard) {
    const onClick = () => {
      const next = toggleThemeLib();
      setTheme(next);
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

  // En dashboard: burbuja expandible
  // 4 burbujas: tema (sol/luna), IA, WhatsApp, Micrófono
  // Colores: blanco en dark mode, negro en light mode
  const iconColor = theme === 'dark' ? 'text-white' : 'text-black';
  
  const options: BubbleOption[] = [
    {
      id: 'theme',
      label: theme === 'dark' ? 'Modo claro' : 'Modo oscuro',
      icon: theme === 'dark' ? (
        <Sun className={`h-5 w-5 ${iconColor}`} />
      ) : (
        <Moon className={`h-5 w-5 ${iconColor}`} />
      ),
      onClick: () => handleThemeToggle(theme === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'ai',
      label: 'Asistente IA',
      icon: <FaMagic className={`h-5 w-5 ${iconColor}`} />,
      onClick: () => {
        setIsExpanded(false);
        // TODO: Implementar funcionalidad de IA
      },
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <FaWhatsapp className={`h-5 w-5 ${iconColor}`} />,
      onClick: () => {
        setIsExpanded(false);
        // TODO: Implementar funcionalidad de WhatsApp
      },
    },
    {
      id: 'mic',
      label: 'Micrófono',
      icon: <Mic className={`h-5 w-5 ${iconColor}`} />,
      onClick: () => {
        setIsExpanded(false);
        // TODO: Implementar funcionalidad de micrófono
      },
    },
  ];

  // Posiciones en hilera a la izquierda de la burbuja madre
  // Espaciado entre burbujas: 60px (centro a centro)
  const BUBBLE_SPACING = 60;

  return (
    <>
      {/* Overlay oscuro cuando está expandido */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/75 z-30"
            onClick={() => setIsExpanded(false)}
            style={{ 
              willChange: 'opacity',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          />
        )}
      </AnimatePresence>

      <div
        data-theme-bubble
        className="fixed z-40"
        style={{
          right: '1rem',
          bottom: '1rem',
        }}
      >
        {/* Burbujas secundarias */}
        <AnimatePresence>
          {isExpanded && (
            <>
              {options.map((option, index) => {
                // Calcular posición en hilera a la izquierda
                // Cada burbuja está BUBBLE_SPACING px a la izquierda de la anterior
                const xOffset = -(BUBBLE_SPACING * (index + 1));
                
                return (
                  <motion.button
                    key={option.id}
                    initial={{ 
                      opacity: 0, 
                      scale: 0.5,
                      x: 0,
                    }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      x: xOffset,
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.5,
                      x: 0,
                    }}
                    whileHover={{
                      scale: 1.1,
                    }}
                    whileTap={{
                      scale: 0.85,
                      transition: { duration: 0.15, ease: 'easeOut' },
                    }}
                    onClick={(e) => {
                      option.onClick();
                    }}
                    aria-label={option.label}
                    className={`absolute h-10 w-10 rounded-full border bg-background/95 flex items-center justify-center ${
                      theme === 'dark' 
                        ? 'border-white/30 shadow-lg' 
                        : 'border-black/30 shadow-lg'
                    }`}
                    style={{
                      right: 0,
                      bottom: '50%',
                      marginBottom: '-20px',
                      willChange: 'transform, opacity',
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 700,
                      damping: 35,
                      mass: 0.3,
                      delay: index * 0.02,
                    }}
                  >
                    {option.icon}
                  </motion.button>
                );
              })}
            </>
          )}
        </AnimatePresence>

        {/* Burbuja principal */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label="Abrir opciones"
          className="h-12 w-12 rounded-full shadow-lg border bg-background/90 flex items-center justify-center relative"
          whileHover={{ 
            scale: 1.05,
            transition: { duration: 0.2, ease: 'easeOut' },
          }}
          whileTap={{ 
            scale: 0.9,
            transition: { duration: 0.1, ease: 'easeOut' },
          }}
          animate={{ 
            rotate: isExpanded ? 180 : 0,
          }}
          transition={{ 
            type: 'spring',
            stiffness: 500,
            damping: 30,
            mass: 0.4,
          }}
          style={{ willChange: 'transform' }}
        >
          <Sparkles className={`h-6 w-6 ${iconColor}`} />
        </motion.button>
      </div>
    </>
  );
}

export default dynamic(() => Promise.resolve(ThemeBubbleContent), {
  ssr: false,
});
