import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { Building2, MapPin, Phone, Sparkles, CheckCircle, Rocket, Info, X, ChevronDown, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { cn } from "./ui/utils";
import { useAuth } from "../contexts/AuthContext";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { createOrganization, user } = useAuth();
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    salonName: "",
    salonAddress: "",
    salonPhone: "",
  });
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [showSalonDetails, setShowSalonDetails] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isDarkTheme = resolvedTheme === "dark";
  const userName = user?.email ? user.email.split("@")[0] : undefined;
  const closeTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.businessName.trim() || !formData.salonName.trim()) {
      return;
    }

    try {
      setLoading(true);
      await createOrganization({
        name: formData.businessName.trim(),
        salonName: formData.salonName.trim(),
        salonAddress: formData.salonAddress.trim() || undefined,
        salonPhone: formData.salonPhone.trim() || undefined,
      });
      setLoading(false);
      setShowSuccess(true);
      closeTimeout.current = setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1100);
    } catch (error) {
      setLoading(false);
      // TODO: mostrar error al usuario
    }
  };

  React.useEffect(() => {
    return () => {
      if (closeTimeout.current) {
        clearTimeout(closeTimeout.current);
      }
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="locked-modal w-[min(92vw,700px)] max-h-[90vh] overflow-hidden rounded-[28px] border border-border/60 p-0 shadow-2xl">
        <form onSubmit={handleSubmit} className="relative flex h-full flex-col">
          <DialogHeader className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-6 py-5 backdrop-blur sm:px-10 sm:py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">Paso 1 de 2</span>
                <DialogTitle className="text-xl font-semibold sm:text-[1.6rem]">Configurar tu espacio</DialogTitle>
                <DialogDescription className="max-w-[58ch] text-sm text-muted-foreground">
                  Completa los datos clave para que Coreboard se vea como tu negocio desde el primer ingreso.
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar asistente"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="shrink-0">Estamos en</span>
              <div className="h-1.5 w-full max-w-[260px] overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "60%" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span>Paso 1 de 2</span>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="grid h-full auto-rows-[minmax(0,1fr)] lg:grid-cols-[0.38fr,0.62fr]">
              <aside
                className={cn(
                  "hidden lg:flex flex-col justify-between gap-8 px-9 py-12",
                  isDarkTheme ? "bg-white text-slate-900" : "bg-gradient-to-br from-primary/90 via-primary to-primary/80 text-white"
                )}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full",
                        isDarkTheme ? "bg-primary/15 text-primary" : "bg-white/15 text-white backdrop-blur"
                      )}
                    >
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-xs uppercase tracking-[0.25em]",
                          isDarkTheme ? "text-muted-foreground/70" : "text-white/70"
                        )}
                      >
                        Preparando tu cuenta
                      </p>
                      <h2 className="text-2xl font-semibold leading-snug">Hola{userName ? ` ${userName}` : ""}</h2>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "max-w-[48ch] text-sm leading-relaxed",
                      isDarkTheme ? "text-muted-foreground" : "text-white/80"
                    )}
                  >
                    Estos datos activan agendas, reportes y recordatorios con la identidad de tu marca. En minutos vas a poder agendar turnos reales.
                  </p>
                </div>

                <motion.ul
                  className="flex flex-col gap-3 text-sm"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                >
                  <li
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border px-4 py-3",
                      isDarkTheme ? "border-border/60 bg-muted text-foreground" : "border-white/20 bg-white/10 text-white backdrop-blur"
                    )}
                  >
                    <CheckCircle className={cn("mt-0.5 h-5 w-5", isDarkTheme ? "text-primary" : "text-emerald-200")} />
                    <span>Personaliza Coreboard con el nombre que tus clientes reconocen.</span>
                  </li>
                  <li
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border px-4 py-3",
                      isDarkTheme ? "border-border/60 bg-muted text-foreground" : "border-white/20 bg-white/10 text-white backdrop-blur"
                    )}
                  >
                    <Rocket className={cn("mt-0.5 h-5 w-5", isDarkTheme ? "text-slate-700" : "text-white/90")} />
                    <span>Activa tu primer local para abrir agendas y asignar servicios.</span>
                  </li>
                  <li
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border px-4 py-3",
                      isDarkTheme ? "border-border/60 bg-muted text-foreground" : "border-white/20 bg-white/10 text-white backdrop-blur"
                    )}
                  >
                    <Phone className={cn("mt-0.5 h-5 w-5", isDarkTheme ? "text-sky-600" : "text-sky-200")} />
                    <span>Suma direccion y contacto para los recordatorios automaticos.</span>
                  </li>
                </motion.ul>
              </aside>

              <section className="flex overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-10 sm:py-9">
                  <div className="mx-auto flex max-w-[62ch] flex-col gap-9">
                    <Card className="border border-border/70 shadow-none">
                      <CardHeader className="space-y-2 pb-0">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">Informacion del negocio</CardTitle>
                        </div>
                        <CardDescription>Nombre principal que veran tus clientes en comunicaciones.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="businessName">Nombre del negocio *</Label>
                          <Input
                            id="businessName"
                            placeholder="Ej: Peluqueria Martinez"
                            value={formData.businessName}
                            onChange={(e) => handleInputChange("businessName", e.target.value)}
                            autoComplete="organization"
                            required
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowBusinessDetails((prev) => !prev)}
                          className="flex min-h-11 items-center gap-2 text-sm text-primary transition hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          aria-expanded={showBusinessDetails}
                          aria-controls="business-details"
                        >
                          <Info className="h-4 w-4" />
                          {showBusinessDetails ? "Ocultar detalles" : "Mas detalles"}
                          <ChevronDown
                            className={cn("h-4 w-4 transition-transform", showBusinessDetails ? "rotate-180" : "rotate-0")}
                            aria-hidden="true"
                          />
                        </button>

                        <AnimatePresence>
                          {showBusinessDetails && (
                            <motion.div
                              id="business-details"
                              className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground"
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                            >
                              Este nombre aparece en dashboard, recordatorios y enlaces compartidos. Podes editarlo luego desde configuracion general.
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>

                    <Card className="border border-border/70 shadow-none">
                      <CardHeader className="space-y-2 pb-0">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">Tu primer local</CardTitle>
                        </div>
                        <CardDescription>Defini direccion y contacto que veran tus clientes.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="salonName">Nombre del local *</Label>
                          <Input
                            id="salonName"
                            placeholder="Ej: Sucursal Centro"
                            value={formData.salonName}
                            onChange={(e) => handleInputChange("salonName", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="salonAddress">Direccion</Label>
                          <Input
                            id="salonAddress"
                            placeholder="Ej: Av. Principal 123, Ciudad"
                            value={formData.salonAddress}
                            onChange={(e) => handleInputChange("salonAddress", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="salonPhone">Telefono</Label>
                          <Input
                            id="salonPhone"
                            placeholder="Ej: +54 11 1234-5678"
                            value={formData.salonPhone}
                            onChange={(e) => handleInputChange("salonPhone", e.target.value)}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowSalonDetails((prev) => !prev)}
                          className="flex min-h-11 items-center gap-2 text-sm text-primary transition hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          aria-expanded={showSalonDetails}
                          aria-controls="salon-details"
                        >
                          <Info className="h-4 w-4" />
                          {showSalonDetails ? "Ocultar detalles" : "Mas detalles"}
                          <ChevronDown
                            className={cn("h-4 w-4 transition-transform", showSalonDetails ? "rotate-180" : "rotate-0")}
                            aria-hidden="true"
                          />
                        </button>

                        <AnimatePresence>
                          {showSalonDetails && (
                            <motion.div
                              id="salon-details"
                              className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground"
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                            >
                              Mas adelante podes sumar otros locales. Los recordatorios usan estos datos para que tus clientes encuentren tu espacio sin dudas.
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <footer className="sticky bottom-0 z-20 border-t border-border/60 bg-background/95 px-6 py-4 backdrop-blur sm:px-10 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="h-11 justify-center sm:justify-start"
                onClick={onClose}
                disabled={loading}
              >
                Salir del asistente
              </Button>
              <Button
                type="submit"
                className="h-11 justify-center sm:justify-start"
                disabled={loading || !formData.businessName.trim() || !formData.salonName.trim()}
              >
                {loading ? "Creando..." : "Crear mi peluqueria"}
              </Button>
            </div>
          </footer>
        </form>

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              className={cn(
                "absolute inset-0 z-30 flex items-center justify-center backdrop-blur-sm",
                isDarkTheme ? "bg-slate-900/80" : "bg-white/80"
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className={cn(
                  "flex flex-col items-center gap-3 rounded-2xl px-7 py-6 text-center shadow-lg",
                  isDarkTheme ? "bg-slate-800 text-white" : "bg-white text-slate-900"
                )}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full",
                    isDarkTheme ? "bg-emerald-500/15 text-emerald-200" : "bg-emerald-500/10 text-emerald-600"
                  )}
                >
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <p className="text-base font-semibold">Listo, todo creado</p>
                <p className="text-sm text-muted-foreground">
                  Estamos preparando tu panel con la nueva informacion.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
