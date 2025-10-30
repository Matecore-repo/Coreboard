import React, { useState } from "react";
import { Building2, MapPin, Phone, Sparkles, CheckCircle2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { createOrganization, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    salonName: "",
    salonAddress: "",
    salonPhone: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const userName = user?.email ? user.email.split("@")[0] : undefined;
  const closeTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.businessName.trim() || !formData.salonName.trim()) {
      toast.error('Por favor completa los campos requeridos');
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
      }, 1500);
    } catch (error: any) {
      setLoading(false);
      toast.error(error.message || 'Error al crear la organización');
    }
  };

  React.useEffect(() => {
    return () => {
      if (closeTimeout.current) {
        clearTimeout(closeTimeout.current);
      }
    };
  }, []);

  const handleClose = () => {
    if (!loading && !showSuccess) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[min(92vw,600px)] max-h-[90vh] overflow-hidden rounded-2xl p-0">
        <form onSubmit={handleSubmit} className="relative flex h-full flex-col">
          <DialogHeader className="border-b border-border px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-2xl font-bold">
                  Configurar tu espacio
                </DialogTitle>
                <DialogDescription className="text-base">
                  Completa los datos clave para que Coreboard se vea como tu negocio desde el primer ingreso.
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Cerrar asistente"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={loading || showSuccess}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Bienvenida */}
              <div className="rounded-2xl bg-primary/10 p-4 border border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Hola{userName ? ` ${userName}` : ""}</h3>
                    <p className="text-sm text-muted-foreground">
                      Estos datos activan agendas, reportes y recordatorios con la identidad de tu marca.
                    </p>
                  </div>
                </div>
              </div>

              {/* Información del negocio */}
              <Card className="rounded-2xl border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Información del negocio</CardTitle>
                  </div>
                  <CardDescription>
                    Nombre principal que verán tus clientes en comunicaciones.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nombre del negocio *</Label>
                    <Input
                      id="businessName"
                      placeholder="Ej: Peluquería Martinez"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange("businessName", e.target.value)}
                      autoComplete="organization"
                      required
                      disabled={loading || showSuccess}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este nombre aparece en dashboard, recordatorios y enlaces compartidos.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Tu primer local */}
              <Card className="rounded-2xl border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Tu primer local</CardTitle>
                  </div>
                  <CardDescription>
                    Define dirección y contacto que verán tus clientes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="salonName">Nombre del local *</Label>
                    <Input
                      id="salonName"
                      placeholder="Ej: Sucursal Centro"
                      value={formData.salonName}
                      onChange={(e) => handleInputChange("salonName", e.target.value)}
                      required
                      disabled={loading || showSuccess}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salonAddress">Dirección</Label>
                    <Input
                      id="salonAddress"
                      placeholder="Ej: Av. Principal 123, Ciudad"
                      value={formData.salonAddress}
                      onChange={(e) => handleInputChange("salonAddress", e.target.value)}
                      disabled={loading || showSuccess}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salonPhone">Teléfono</Label>
                    <Input
                      id="salonPhone"
                      placeholder="Ej: +54 11 1234-5678"
                      value={formData.salonPhone}
                      onChange={(e) => handleInputChange("salonPhone", e.target.value)}
                      disabled={loading || showSuccess}
                    />
                    <p className="text-xs text-muted-foreground">
                      Los recordatorios usan estos datos para que tus clientes encuentren tu espacio.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-border bg-background px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="h-11 justify-center sm:justify-start"
                onClick={handleClose}
                disabled={loading || showSuccess}
              >
                Salir del asistente
              </Button>
              <Button
                type="submit"
                className="h-11 justify-center sm:justify-start"
                disabled={loading || showSuccess || !formData.businessName.trim() || !formData.salonName.trim()}
              >
                {loading ? "Creando..." : "Crear mi peluquería"}
              </Button>
            </div>
          </div>

          {/* Success overlay */}
          {showSuccess && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/95 backdrop-blur-sm rounded-2xl">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-base font-semibold">¡Listo, todo creado!</p>
                  <p className="text-sm text-muted-foreground">
                    Estamos preparando tu panel con la nueva información.
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
