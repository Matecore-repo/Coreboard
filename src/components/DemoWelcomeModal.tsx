import React, { useState } from "react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { Sparkles, CheckCircle2, Zap, Lock, X, ArrowRight } from "lucide-react";
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

  const features = [
    {
      icon: Sparkles,
      title: "Datos de Prueba",
      desc: "Explora con seguridad usando datos ficticios"
    },
    {
      icon: Zap,
      title: "Funciones Reales",
      desc: "Todas las funcionalidades disponibles"
    },
    {
      icon: Lock,
      title: "100% Seguro",
      desc: "Nada se guarda en servidores"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[min(95vw,500px)] border-0 bg-gradient-to-br from-background via-background to-muted/20 p-0 shadow-2xl sm:rounded-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {step === "welcome" ? (
          // Pantalla de bienvenida
          <div className="relative overflow-hidden px-6 py-12 sm:px-10 sm:py-16">
            <motion.div
              className="absolute inset-0 -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />
            </motion.div>

            <motion.div
              className="space-y-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Logo + Título */}
              <motion.div className="text-center" variants={itemVariants}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-white shadow-lg">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Bienvenido a COREBOARD
                </h1>
                <p className="mt-3 text-base text-muted-foreground">
                  Crea y gestiona salones, servicios y turnos en modo prueba
                </p>
              </motion.div>

              {/* Features Grid */}
              <motion.div className="grid gap-3" variants={itemVariants}>
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.title}
                      className="flex items-start gap-3 rounded-xl border border-border/30 bg-white/40 p-3 backdrop-blur-sm dark:bg-muted/40"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{feature.title}</p>
                        <p className="text-sm text-muted-foreground">{feature.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* CTA Button */}
              <motion.div variants={itemVariants}>
                <Button
                  onClick={handleContinue}
                  className="h-12 w-full gap-2 text-base font-medium"
                >
                  Personalizarlo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>

              {/* Secondary Action */}
              <motion.div variants={itemVariants} className="text-center">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Usar con datos reales
                </Button>
              </motion.div>
            </motion.div>
          </div>
        ) : (
          // Pantalla de personalizacion
          <div className="px-6 py-12 sm:px-10 sm:py-16">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div>
                <h2 className="text-2xl font-bold">¿Cómo te llamas?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Usaremos tu nombre para personalizar tu experiencia
                </p>
              </div>

              {/* Input */}
              <div className="space-y-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSave()}
                  placeholder="Ej: Martina"
                  autoFocus
                  className="h-12 text-base"
                />
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-2 rounded-lg border border-amber-200/30 bg-amber-50/30 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                <div className="mt-0.5 text-amber-600 dark:text-amber-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  Es modo prueba: nada se guarda en servidores. Podes reiniciar cuando quieras.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep("welcome")}
                  className="flex-1"
                >
                  Atrás
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="flex-1 gap-2"
                >
                  Empezar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
