import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "./ui/utils";

interface DemoWelcomeModalProps {
  isOpen: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
}

export default function DemoWelcomeModal({ isOpen, onSave, onClose }: DemoWelcomeModalProps) {
  const [name, setName] = useState("");
  const [step, setStep] = useState<"welcome" | "input">("welcome");
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === "dark";

  const handleContinue = () => {
    setStep("input");
  };

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  const handleBack = () => {
    setStep("welcome");
    setName("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[min(92vw,520px)] max-h-[90vh] overflow-hidden rounded-3xl border border-border/40 p-0 shadow-2xl bg-background/95 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-50 rounded-full p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:scale-110"
        >
          <X className="h-4 w-4" />
        </button>

        <AnimatePresence mode="wait">
          {step === "welcome" ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="px-10 py-16 sm:px-12 sm:py-20"
            >
              {/* Icon with more space */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  delay: 0.2, 
                  type: "spring", 
                  stiffness: 150, 
                  damping: 15,
                  duration: 0.6
                }}
                className="flex justify-center mb-10"
              >
                <div className={cn(
                  "h-24 w-24 rounded-3xl flex items-center justify-center shadow-xl transition-all",
                  isDarkTheme
                    ? "bg-primary/20 text-primary border-2 border-primary/30 hover:border-primary/50"
                    : "bg-primary/10 text-primary border-2 border-primary/20 hover:border-primary/40"
                )}>
                  <Sparkles className="h-12 w-12" />
                </div>
              </motion.div>

              {/* Content with more spacing */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center space-y-6 mb-12"
              >
                <h2 className="text-3xl font-bold tracking-tight leading-tight">
                  Modo Demo
                </h2>
                <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
                  Explora todas las funcionalidades con datos de prueba. Nada se guarda permanentemente.
                </p>
              </motion.div>

              {/* CTA with more spacing */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="space-y-4"
              >
                <Button
                  onClick={handleContinue}
                  className="w-full h-12 gap-2 text-base font-medium"
                  size="lg"
                >
                  Personalizar
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Usar con datos reales
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="px-10 py-16 sm:px-12 sm:py-20"
            >
              {/* Header with more space */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-10 text-center"
              >
                <h2 className="text-3xl font-bold tracking-tight mb-3">
                  ¿Cómo te llamas?
                </h2>
                <p className="text-muted-foreground text-base max-w-sm mx-auto">
                  Usaremos tu nombre para personalizar tu experiencia
                </p>
              </motion.div>

              {/* Input with more space */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="space-y-6 mb-10"
              >
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSave()}
                  placeholder="Ej: Martina"
                  autoFocus
                  className="h-14 text-base px-4"
                />
              </motion.div>

              {/* Actions with more space */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="flex gap-4"
              >
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 h-12"
                  size="lg"
                >
                  Atrás
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="flex-1 h-12 gap-2"
                  size="lg"
                >
                  Empezar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
