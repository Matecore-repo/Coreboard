import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/router";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
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
  const router = useRouter();

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

  const handleUseRealData = () => {
    onClose();
    router.push("/login");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[min(92vw,600px)] max-h-[90vh] overflow-hidden rounded-2xl border-0 ring-1 ring-border/40 shadow-[0_8px_32px_rgba(0,0,0,0.10)] bg-card p-6 sm:p-8">
        {/* Cuerpo scrollable */}
        <div className="overflow-auto">
          <AnimatePresence mode="wait">
            {step === "welcome" ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                className="space-y-6 sm:space-y-7 text-center max-w-[28rem] mx-auto"
              >
                {/* Texto */}
                <div className="space-y-2 text-center">
                  <DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight mx-auto">
                    ¿Cómo querés empezar?
                  </DialogTitle>
                  <DialogDescription className="text-sm sm:text-base leading-relaxed mx-auto">
                    Probá sin comprometer nada: tus datos de prueba se eliminan automáticamente.
                  </DialogDescription>
                </div>

                {/* Acciones */}
                <div className="space-y-2 sm:space-y-2.5">
                  <div className="space-y-1.5">
                    <Button onClick={handleContinue} className="w-full h-10 sm:h-11 rounded-lg font-semibold">
                      Explorar modo demo
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">Podés salir cuando quieras</p>
                  </div>

                  <div className="space-y-1.5">
                    <Button
                      variant="outline"
                      onClick={handleUseRealData}
                      className="w-full h-10 sm:h-11 rounded-lg border-border/60 hover:bg-muted"
                    >
                      Usar con datos reales
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">Ideal para empezar a trabajar</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                className="space-y-6 sm:space-y-7 max-w-[28rem] mx-auto"
              >
                <div className="text-center space-y-2">
                  <DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
                    Contanos tu nombre
                  </DialogTitle>
                  <DialogDescription className="text-sm sm:text-base leading-relaxed">
                    Lo usamos para personalizar la experiencia en el modo demo
                  </DialogDescription>
                </div>

                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="Ej: Martina"
                  autoFocus
                  className="h-12 sm:h-14 text-sm sm:text-base px-4 rounded-lg"
                />

                <div className="flex gap-3 sm:gap-4">
                  <Button variant="outline" onClick={handleBack} className="flex-1 h-10 sm:h-11 rounded-lg border-border/60 hover:bg-muted">
                    Atrás
                  </Button>
                  <Button onClick={handleSave} disabled={!name.trim()} className="flex-1 h-10 sm:h-11 gap-2 rounded-lg font-semibold">
                    Empezar <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
