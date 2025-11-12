import React, { useState, useEffect, startTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";

interface WelcomeScreenProps {
  onComplete: () => void;
  isGoodbye?: boolean;
}

export function WelcomeScreen({ onComplete, isGoodbye = false }: WelcomeScreenProps) {
  const { resolvedTheme } = useTheme();
  const [showContent, setShowContent] = useState(false);
  const [dateText, setDateText] = useState("");
  
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (isGoodbye) {
      // Para despedida, mostrar inmediatamente
      startTransition(() => {
        setShowContent(true);
      });
      const timer = setTimeout(() => {
        onComplete();
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      // Para bienvenida, obtener fecha y mostrar después de delay
      const today = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      const formattedDate = today.toLocaleDateString('es-AR', options);
      startTransition(() => {
        setDateText(formattedDate);
      });

      const timer = setTimeout(() => {
        startTransition(() => {
          setShowContent(true);
        });
      }, 400);

      const autoCompleteTimer = setTimeout(() => {
        onComplete();
      }, 3000);

      return () => {
        clearTimeout(timer);
        clearTimeout(autoCompleteTimer);
      };
    }
  }, [onComplete, isGoodbye]);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center ${
      isDark ? 'bg-black' : 'bg-white'
    }`}>
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="text-center space-y-6 px-6 max-w-md"
          >
            {/* Text - Sin iconos, minimalista */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: isGoodbye ? 0.2 : 0.4, duration: 0.6 }}
              className="space-y-4"
            >
              {isGoodbye ? (
                <>
                  <h1 className={`text-4xl font-light tracking-tight ${
                    isDark ? 'text-white' : 'text-black'
                  }`}>
                    ¡Hasta pronto!
                  </h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className={`text-lg font-light ${
                      isDark ? 'text-white/80' : 'text-black/70'
                    }`}
                  >
                    Gracias por usar COREBOARD
                  </motion.p>
                </>
              ) : (
                <>
                  <h1 className={`text-4xl font-light tracking-tight ${
                    isDark ? 'text-white' : 'text-black'
                  }`}>
                    Bienvenido a tu sistema de gestión
                  </h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className={`text-lg font-light ${
                      isDark ? 'text-white/80' : 'text-black/70'
                    }`}
                  >
                    Hoy es {dateText}
                  </motion.p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
