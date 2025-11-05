import React from 'react';
import { useEffect, useState } from 'react';
import { Sun, Moon, Sparkles, Mic, MessageCircle } from 'lucide-react';
import { FaBrain } from 'react-icons/fa';
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
      icon: <FaBrain className={`h-5 w-5 ${iconColor}`} />,
      onClick: () => {
        setIsExpanded(false);
        // TODO: Implementar funcionalidad de IA
      },
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <MessageCircle className={`h-5 w-5 ${iconColor}`} />,
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

  // Posiciones: arriba, abajo, izquierda, derecha
  // Distancia desde el centro de la burbuja madre (48px/2 = 24px) hasta el centro de las secundarias (40px/2 = 20px)
  // Espacio entre bordes: 80px, entonces distancia centro a centro = 24 + 80 + 20 = 124px
  const DISTANCE_CENTER_TO_CENTER = 80; // Distancia desde el centro de la madre al centro de las secundarias
  
  const bubblePositions = [
    { angle: -90, distance: DISTANCE_CENTER_TO_CENTER },  // Arriba - Tema
    { angle: 90, distance: DISTANCE_CENTER_TO_CENTER },   // Abajo - IA
    { angle: 180, distance: DISTANCE_CENTER_TO_CENTER },  // Izquierda - WhatsApp
    { angle: 0, distance: DISTANCE_CENTER_TO_CENTER },     // Derecha - Micrófono
  ];

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

      <motion.div
        data-theme-bubble
        className="fixed z-40"
        initial={false}
        animate={
          isExpanded
            ? {
                left: '50%',
                top: '50%',
                right: 'auto',
                bottom: 'auto',
              }
            : {
                right: '1rem',
                bottom: '1rem',
                left: 'auto',
                top: 'auto',
              }
        }
        style={{
          transform: isExpanded ? 'translate(-50%, -50%)' : 'none',
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 40,
          mass: 0.4,
        }}
      >
        {/* Burbujas secundarias */}
        <AnimatePresence>
          {isExpanded && (
            <>
              {options.map((option, index) => {
                if (index >= bubblePositions.length) return null;
                const pos = bubblePositions[index];
                // Convertir ángulo a radianes
                const radians = (pos.angle * Math.PI) / 180;
                // Calcular posición exacta desde el centro (0,0)
                const x = Math.cos(radians) * pos.distance;
                const y = Math.sin(radians) * pos.distance;
                
                return (
                  <motion.button
                    key={option.id}
                    initial={{ 
                      opacity: 0, 
                      scale: 0,
                      x: 0,
                      y: 0,
                    }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      x,
                      y,
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0,
                      x: 0,
                      y: 0,
                    }}
                    whileHover={{
                      scale: 1.1,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 800,
                      damping: 45,
                      mass: 0.2,
                      delay: index * 0.02,
                    }}
                    onClick={option.onClick}
                    aria-label={option.label}
                    className={`absolute h-10 w-10 rounded-full border bg-background/95 flex items-center justify-center active:scale-95 ${
                      theme === 'dark' 
                        ? 'border-white/30 shadow-lg' 
                        : 'border-black/30 shadow-lg'
                    }`}
                    style={{
                      left: '50%',
                      top: '50%',
                      marginLeft: '-20px',
                      marginTop: '-20px',
                      willChange: 'transform, opacity',
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
          className="h-12 w-12 rounded-full shadow-lg border bg-background/90 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200 relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ 
            rotate: isExpanded ? 180 : 0,
          }}
          transition={{ 
            type: 'spring',
            stiffness: 500,
            damping: 35,
            mass: 0.4,
          }}
          style={{ willChange: 'transform' }}
        >
          <Sparkles className={`h-6 w-6 ${iconColor}`} />
        </motion.button>
      </motion.div>
    </>
  );
}

export default dynamic(() => Promise.resolve(ThemeBubbleContent), {
  ssr: false,
});
