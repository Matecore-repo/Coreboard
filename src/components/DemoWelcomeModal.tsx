import React, { useState } from "react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { Sparkles, CalendarCheck, Wand2, Stars, Info, X, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
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
  const [showTips, setShowTips] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === "dark";

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="locked-modal w-[min(92vw,600px)] max-h-[88vh] overflow-hidden rounded-[28px] border border-border/60 p-0 shadow-2xl">
        <div className="flex h-full flex-col">
          <DialogHeader className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-7 py-5 backdrop-blur sm:px-10 sm:py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-semibold sm:text-2xl">Modo demo</DialogTitle>
                <DialogDescription className="max-w-[65ch] text-sm text-muted-foreground">
                  Personaliza tu visita guiada: los datos son de prueba y podes reiniciar cuando quieras.
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modo demo"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="grid h-full auto-rows-[minmax(0,1fr)] lg:grid-cols-[0.4fr,0.6fr]">
              <aside
                className={cn(
                  "hidden lg:flex flex-col gap-6 px-8 py-10",
                  isDarkTheme ? "bg-white text-slate-900" : "bg-gradient-to-br from-primary/95 via-primary/85 to-primary/75 text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full",
                      isDarkTheme ? "bg-primary/15 text-primary" : "bg-white/15 text-white"
                    )}
                  >
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-semibold leading-snug">Tu primera visita guiada</h2>
                </div>

                <motion.ul
                  className="flex flex-col gap-3 text-sm"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                >
                  <li
                    className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3", isDarkTheme ? "border-border/60 bg-muted text-foreground" : "border-white/20 bg-white/10 text-white backdrop-blur")}
                  >
                    <CalendarCheck className={cn("mt-0.5 h-5 w-5", isDarkTheme ? "text-primary" : "text-emerald-200")} />
                    <span>Agenda turnos, editarlos y revisa reportes con datos ficticios.</span>
                  </li>
                  <li
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border px-4 py-3",
                      isDarkTheme ? "border-border/60 bg-muted text-foreground" : "border-white/20 bg-white/10 text-white backdrop-blur"
                    )}
                  >
                    <Wand2 className={cn("mt-0.5 h-5 w-5", isDarkTheme ? "text-slate-700" : "text-white/90")} />
                    <span>Explora recordatorios automaticos, cajas y tareas sin riesgo.</span>
                  </li>
                  <li
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border px-4 py-3",
                      isDarkTheme ? "border-border/60 bg-muted text-foreground" : "border-white/20 bg-white/10 text-white backdrop-blur"
                    )}
                  >
                    <Stars className={cn("mt-0.5 h-5 w-5", isDarkTheme ? "text-sky-600" : "text-sky-200")} />
                    <span>Descubre tips interactivos mientras navegas la app.</span>
                  </li>
                </motion.ul>
              </aside>

              <section className="flex overflow-hidden">
                <div className="flex-1 overflow-y-auto px-7 py-7 sm:px-10 sm:py-9">
                  <div className="mx-auto flex max-w-[60ch] flex-col gap-10">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground" htmlFor="demoName">
                        Como te llamamos?
                      </label>
                      <Input
                        id="demoName"
                        className="h-12 text-base"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Martina"
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">
                        Usamos tu nombre para saludar y personalizar el recorrido. Nada se guarda en el servidor.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-5">
                      <button
                        type="button"
                        onClick={() => setShowTips((prev) => !prev)}
                        className="flex min-h-11 w-full items-center justify-between text-sm font-medium text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-expanded={showTips}
                        aria-controls="demo-tips"
                      >
                        <span className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" />
                          {showTips ? "Ocultar tips rapidos" : "Tips rapidos para el demo"}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            showTips ? "rotate-180" : "rotate-0"
                          )}
                          aria-hidden="true"
                        />
                      </button>

                      {showTips && (
                        <motion.ul
                          id="demo-tips"
                          className="mt-3 space-y-2 text-sm text-muted-foreground"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <li>Desde el menu de ajustes podes reiniciar la demo cuando quieras.</li>
                          <li>Proba duplicar servicios para ver como funciona el historial.</li>
                          <li>Los recordatorios se envian solo a tu email para que pruebes el flujo.</li>
                        </motion.ul>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <footer className="sticky bottom-0 z-20 border-t border-border/60 bg-background/95 px-7 py-4 backdrop-blur sm:px-10 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="h-11 justify-center sm:justify-start"
                onClick={onClose}
              >
                Salir del modo demo
              </Button>
              <Button onClick={handleSave} className="h-11 justify-center sm:justify-start" disabled={!name.trim()}>
                Empezar recorrido
              </Button>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
