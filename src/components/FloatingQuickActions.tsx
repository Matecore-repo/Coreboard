import { Plus, Trash2, Edit, X } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";

interface FloatingQuickActionsProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAppointment: () => void;
  onDeleteAppointment: () => void;
  onUpdateAppointment: () => void;
}

export function FloatingQuickActions({
  isOpen,
  onClose,
  onAddAppointment,
  onDeleteAppointment,
  onUpdateAppointment,
}: FloatingQuickActionsProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
          >
            <div className="bg-card border border-border shadow-2xl rounded-full px-3 sm:px-6 py-3 flex items-center gap-1.5 sm:gap-3">
              <span className="text-muted-foreground mr-1 sm:mr-2 hidden sm:inline text-sm">Acciones Rápidas</span>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Button
                  onClick={() => {
                    onAddAppointment();
                    onClose();
                  }}
                  className="rounded-full h-9 px-3 sm:px-4"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Añadir</span>}
                </Button>
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15 }}
              >
                <Button
                  onClick={() => {
                    onUpdateAppointment();
                    onClose();
                  }}
                  variant="outline"
                  className="rounded-full h-9 px-3 sm:px-4"
                  size="sm"
                >
                  <Edit className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Actualizar</span>}
                </Button>
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  onClick={() => {
                    onDeleteAppointment();
                    onClose();
                  }}
                  variant="destructive"
                  className="rounded-full h-9 px-3 sm:px-4"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Eliminar</span>}
                </Button>
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25 }}
              >
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9 ml-1 sm:ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
