import { Bell, Lock, Palette, Globe, Save } from "lucide-react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { toast } from "sonner";

export function SettingsView() {
  const handleSaveSettings = () => {
    toast.success("Configuración guardada correctamente");
  };

  return (
    <div className="p-6 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h2>Configuración</h2>
        <Button onClick={handleSaveSettings}>
          <Save className="h-4 w-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>

      <div className="max-w-2xl space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3>Notificaciones</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">
                  Notificaciones por email
                </Label>
                <p className="text-muted-foreground">
                  Recibir recordatorios de turnos
                </p>
              </div>
              <Switch id="email-notifications" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notifications">
                  Notificaciones push
                </Label>
                <p className="text-muted-foreground">
                  Alertas en tiempo real
                </p>
              </div>
              <Switch id="push-notifications" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h3>Apariencia</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dark-mode">Modo oscuro</Label>
                <p className="text-muted-foreground">
                  Cambiar entre tema claro y oscuro
                </p>
              </div>
              <Switch id="dark-mode" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h3>Idioma y región</h3>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Idioma</Label>
              <p className="text-muted-foreground">Español (Argentina)</p>
            </div>
            <div>
              <Label>Zona horaria</Label>
              <p className="text-muted-foreground">
                GMT-3 (Buenos Aires)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h3>Seguridad</h3>
          </div>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start rounded-full h-9">
              Cambiar contraseña
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-full h-9">
              Autenticación de dos factores
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
