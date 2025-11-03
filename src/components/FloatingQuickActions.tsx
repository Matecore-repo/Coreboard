import { Link as LinkIcon, Copy, Check } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

interface FloatingQuickActionsProps {
  isOpen: boolean;
  onClose: () => void;
  onGeneratePaymentLink: () => void;
}

export function FloatingQuickActions({
  isOpen,
  onClose,
  onGeneratePaymentLink,
}: FloatingQuickActionsProps) {
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      containerRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* Floating Actions Bar */}
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-auto max-w-3xl px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-actions-title"
            ref={containerRef}
            tabIndex={-1}
          >
            <div className="bg-card border border-border shadow-2xl rounded-full px-3 sm:px-6 py-3 flex items-center gap-1.5 sm:gap-3">
              <span id="quick-actions-title" className="text-muted-foreground mr-1 sm:mr-2 hidden sm:inline text-sm">Generar link de pago</span>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Button
                  onClick={() => {
                    onGeneratePaymentLink();
                    onClose();
                  }}
                  className="rounded-full h-9 px-3 sm:px-4"
                  size="sm"
                  aria-label="Generar link de pago"
                >
                  <LinkIcon className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Generar link</span>}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
