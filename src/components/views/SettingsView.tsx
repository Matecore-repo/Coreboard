import React, { useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";
import { PageContainer } from "../layout/PageContainer";
import { Section } from "../layout/Section";
import { useAuth } from "../../contexts/AuthContext";
import { useMercadoPago } from "../../hooks/useMercadoPago";
import { CreditCard, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DISABLED_CLASS =
  "opacity-50 pointer-events-none cursor-not-allowed";
const noop = () => {};

type GeneralSettings = {
  brandName: string;
  timezone: string;
  currency: string;
  language: string;
  autoAssignStylist: boolean;
  showPricesOnKiosk: boolean;
};

type NotificationSettings = {
  emailDailySummary: boolean;
  emailSameDayReminder: boolean;
  smsReminders: boolean;
  pushLowStock: boolean;
};

type SecuritySettings = {
  enforce2fa: boolean;
  sessionTimeoutMinutes: number;
  alertNewDevices: boolean;
  autoLockInactivity: boolean;
  requireStrongPasswords: boolean;
};

type IntegrationSettings = {
  googleCalendar: boolean;
  whatsappBusiness: boolean;
  metaAds: boolean;
  hubspot: boolean;
};

const createGeneralDefaults = (email?: string | null): GeneralSettings => {
  const rawName = email?.split("@")[0] ?? "";
  const formatted =
    rawName.trim().length > 0
      ? rawName.replace(/[\W_]+/g, " ").replace(/\s+/g, " ").trim()
      : "Mi negocio";

  return {
    brandName: formatted || "Mi negocio",
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    language: "es-AR",
    autoAssignStylist: IS_PRODUCTION,
    showPricesOnKiosk: true,
  };
};

const createNotificationDefaults = (): NotificationSettings => ({
  emailDailySummary: true,
  emailSameDayReminder: true,
  smsReminders: IS_PRODUCTION,
  pushLowStock: IS_PRODUCTION,
});

const createSecurityDefaults = (): SecuritySettings => ({
  enforce2fa: IS_PRODUCTION,
  sessionTimeoutMinutes: IS_PRODUCTION ? 15 : 45,
  alertNewDevices: true,
  autoLockInactivity: IS_PRODUCTION,
  requireStrongPasswords: true,
});

const createIntegrationDefaults = (): IntegrationSettings => ({
  googleCalendar: true,
  whatsappBusiness: IS_PRODUCTION,
  metaAds: false,
  hubspot: false,
});

// Componente para sección de Mercado Pago
function MercadoPagoSection() {
  const { currentOrgId, currentRole } = useAuth();
  const { isConnected, credentials, isLoading, connectMercadoPago, disconnectMercadoPago } = useMercadoPago();

  // Verificar si hay mensaje de éxito/error en la URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const mpStatus = urlParams.get('mp');
      const mpError = urlParams.get('mp_error');

      if (mpStatus === 'connected') {
        // Recargar la conexión
        setTimeout(() => {
          window.history.replaceState({}, '', window.location.pathname);
        }, 2000);
      } else if (mpError) {
        // Mostrar error
        console.error('Error conectando Mercado Pago:', mpError);
        // Aquí podrías mostrar un toast o alert
      }
    }
  }, []);

  if (currentRole !== 'owner') {
    return null;
  }

  return (
    <Card role="region" aria-label="Integración con Mercado Pago">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Mercado Pago</CardTitle>
          {isConnected ? (
            <Badge variant="default" className="bg-green-600" aria-label="Estado: Conectado">
              <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="outline" aria-label="Estado: Desconectado">Desconectado</Badge>
          )}
        </div>
        <CardDescription>
          Conecta tu cuenta de Mercado Pago para recibir pagos online. Los clientes podrán pagar sus turnos directamente desde el link de pago.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && credentials ? (
          <>
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Cuenta conectada</p>
                  <p className="text-xs text-muted-foreground">
                    Collector ID: {credentials.collector_id}
                    {credentials.expires_at && (
                      <span className="ml-2">
                        • Expira: {new Date(credentials.expires_at).toLocaleDateString('es-AR')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={disconnectMercadoPago}
              disabled={isLoading}
              className="w-full sm:w-auto"
              aria-label="Desconectar cuenta de Mercado Pago"
              data-action="disconnect-mercadopago"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Desconectando...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                  Desconectar cuenta
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">No hay cuenta conectada</p>
                  <p className="text-xs text-muted-foreground">
                    Conecta tu cuenta de Mercado Pago para habilitar pagos online
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={connectMercadoPago}
              disabled={isLoading}
              className="w-full sm:w-auto"
              aria-label="Conectar cuenta de Mercado Pago"
              data-action="connect-mercadopago"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Conectando...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" aria-hidden="true" />
                  Conectar Mercado Pago
                </>
              )}
            </Button>
          </>
        )}
        <Alert>
          <AlertDescription className="text-xs">
            Al conectar tu cuenta, serás redirigido a Mercado Pago para autorizar la aplicación.
            Solo necesitas hacerlo una vez por organización.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default function SettingsView() {
  const { isDemo, currentOrgId, user, currentRole } = useAuth();

  const generalSettings = useMemo(
    () => createGeneralDefaults(user?.email),
    [user?.email],
  );
  const notificationSettings = useMemo(createNotificationDefaults, []);
  const securitySettings = useMemo(createSecurityDefaults, []);
  const integrationSettings = useMemo(createIntegrationDefaults, []);

  return (
    <PageContainer>
      <Section 
        title="Configuración de la aplicación"
        description="Visualiza qué ajustes estarán disponibles cuando lancemos la consola de producción."
        action={
          <Badge variant={IS_PRODUCTION ? "default" : "secondary"} aria-label={`Entorno: ${IS_PRODUCTION ? "Producción" : "Previsualización"}`}>
            Entorno: {IS_PRODUCTION ? "Producción" : "Previsualización"}
          </Badge>
        }
      >
      <section className="space-y-4" role="region" aria-label="Configuración de la aplicación">
        <div className="mb-4">
          {isDemo && (
            <Alert>
              <AlertTitle>Modo demostración activo</AlertTitle>
              <AlertDescription>
                Algunas opciones se muestran solo como vista previa. Las acciones
                reales se habilitarán cuando tu organización esté migrada a
                producción.
              </AlertDescription>
            </Alert>
          )}

          {!isDemo && !currentOrgId && (
            <Alert variant="destructive">
              <AlertTitle>Sin organización seleccionada</AlertTitle>
              <AlertDescription>
                Vincula una organización para habilitar ajustes críticos en
                producción. Mientras tanto, todos los cambios permanecen
                deshabilitados.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="mb-4 space-y-4" role="group" aria-label="Sección de preferencias generales">
        <Card className={DISABLED_CLASS} role="region" aria-label="Preferencias generales">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Preferencias generales</CardTitle>
            <Badge variant="outline" aria-label="En desarrollo">En desarrollo</Badge>
          </div>
          <CardDescription>
            Define la identidad de tu marca y reglas globales. Estas opciones se
            habilitarán cuando concluyamos la integración con el backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`space-y-2 ${DISABLED_CLASS}`}>
              <Label htmlFor="brandName">Nombre comercial</Label>
              <Input
                id="brandName"
                value={generalSettings.brandName}
                readOnly
                disabled
                placeholder="Ej: Core Studio Palermo"
              />
            </div>
            <div className={`space-y-2 ${DISABLED_CLASS}`}>
              <Label htmlFor="language">Idioma por defecto</Label>
              <Select
                value={generalSettings.language}
                onValueChange={noop}
                disabled
              >
                <SelectTrigger id="language" disabled>
                  <SelectValue placeholder="Selecciona un idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es-AR">Español (Argentina)</SelectItem>
                  <SelectItem value="es-CL">Español (Chile)</SelectItem>
                  <SelectItem value="en-US">Inglés</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={`space-y-2 ${DISABLED_CLASS}`}>
              <Label htmlFor="timezone">Zona horaria</Label>
              <Select
                value={generalSettings.timezone}
                onValueChange={noop}
                disabled
              >
                <SelectTrigger id="timezone" disabled>
                  <SelectValue placeholder="Selecciona zona horaria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Argentina/Buenos_Aires">
                    Buenos Aires (GMT-3)
                  </SelectItem>
                  <SelectItem value="America/Santiago">
                    Santiago (GMT-3)
                  </SelectItem>
                  <SelectItem value="America/Mexico_City">
                    Ciudad de México (GMT-6)
                  </SelectItem>
                  <SelectItem value="America/Bogota">
                    Bogotá (GMT-5)
                  </SelectItem>
                  <SelectItem value="Europe/Madrid">
                    Madrid (GMT+1)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={`space-y-2 ${DISABLED_CLASS}`}>
              <Label htmlFor="currency">Moneda principal</Label>
              <Select
                value={generalSettings.currency}
                onValueChange={noop}
                disabled
              >
                <SelectTrigger id="currency" disabled>
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">Peso argentino (ARS)</SelectItem>
                  <SelectItem value="CLP">Peso chileno (CLP)</SelectItem>
                  <SelectItem value="USD">Dólar estadounidense (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Optimizar la agenda automáticamente
              </p>
              <p className="text-xs text-muted-foreground">
                Coreboard asignará el estilista con mejor disponibilidad.
              </p>
            </div>
            <Switch
              checked={generalSettings.autoAssignStylist}
              onCheckedChange={noop}
              disabled
              aria-label="Activar asignación automática de estilista"
            />
          </div>
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Mostrar precios en kiosco / pantalla cliente
              </p>
              <p className="text-xs text-muted-foreground">
                Ideal para puntos de venta: muestra tarifas actualizadas en
                tiempo real.
              </p>
            </div>
            <Switch
              checked={generalSettings.showPricesOnKiosk}
              onCheckedChange={noop}
              disabled
              aria-label="Mostrar precios en kiosco"
            />
          </div>
        </CardContent>
      </Card>
        </div>

        <div className="mb-4 space-y-4">
      <Card className={DISABLED_CLASS}>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Notificaciones</CardTitle>
            <Badge variant="outline">En desarrollo</Badge>
          </div>
          <CardDescription>
            Mantén a tu equipo y clientes informados. Las integraciones de correo
            y SMS se activarán más adelante.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">Resumen diario por email</p>
              <p className="text-xs text-muted-foreground">
                Envía un resumen de turnos confirmados y tareas pendientes cada
                mañana.
              </p>
            </div>
            <Switch
              checked={notificationSettings.emailDailySummary}
              onCheckedChange={noop}
              disabled
              aria-label="Activar resumen diario por email"
            />
          </div>
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">
                Recordatorio por email el mismo día
              </p>
              <p className="text-xs text-muted-foreground">
                Notifica a los clientes horas antes del turno para reducir
                ausencias.
              </p>
            </div>
            <Switch
              checked={notificationSettings.emailSameDayReminder}
              onCheckedChange={noop}
              disabled
              aria-label="Activar recordatorio por email"
            />
          </div>
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">Recordatorios por SMS / WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                Requiere saldo de mensajería y aprobaciones regulatorias.
              </p>
            </div>
            <Switch
              checked={notificationSettings.smsReminders}
              onCheckedChange={noop}
              disabled
              aria-label="Activar recordatorios por SMS"
            />
          </div>
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">Alertas de stock bajo</p>
              <p className="text-xs text-muted-foreground">
                Recibe notificaciones push cuando un producto necesite
                reposición.
              </p>
            </div>
            <Switch
              checked={notificationSettings.pushLowStock}
              onCheckedChange={noop}
              disabled
              aria-label="Activar alertas de stock bajo"
            />
          </div>
        </CardContent>
      </Card>
        </div>

        <div className="mb-4 space-y-4">
      <Card className={DISABLED_CLASS}>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Seguridad y cumplimiento</CardTitle>
            <Badge variant="outline">En desarrollo</Badge>
          </div>
          <CardDescription>
            Establece políticas robustas para proteger datos y accesos. El
            backend validará todas estas opciones una vez que la ruta esté
            disponible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">
                Forzar doble factor de autenticación
              </p>
              <p className="text-xs text-muted-foreground">
                Recomendado para producción: solicita 2FA a todo el equipo.
              </p>
            </div>
            <Switch
              checked={securitySettings.enforce2fa}
              onCheckedChange={noop}
              disabled
              aria-label="Forzar doble factor de autenticación"
            />
          </div>
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">
                Tiempo de expiración de sesión (minutos)
              </p>
              <p className="text-xs text-muted-foreground">
                Reduce la ventana de riesgo en dispositivos compartidos.
              </p>
            </div>
            <Input
              type="number"
              min={10}
              max={240}
              value={securitySettings.sessionTimeoutMinutes}
              readOnly
              disabled
              className="w-24 text-right"
            />
          </div>
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">Alertar nuevos dispositivos</p>
              <p className="text-xs text-muted-foreground">
                Notifica por email cuando alguien inicia sesión desde un equipo
                desconocido.
              </p>
            </div>
            <Switch
              checked={securitySettings.alertNewDevices}
              onCheckedChange={noop}
              disabled
              aria-label="Alertar nuevos dispositivos"
            />
          </div>
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">
                Bloqueo automático por inactividad
              </p>
              <p className="text-xs text-muted-foreground">
                Protege la aplicación cuando se deja abierta en recepción o caja.
              </p>
            </div>
            <Switch
              checked={securitySettings.autoLockInactivity}
              onCheckedChange={noop}
              disabled
              aria-label="Bloqueo automático por inactividad"
            />
          </div>
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">
                Exigir contraseñas robustas
              </p>
              <p className="text-xs text-muted-foreground">
                Obliga a usar mayúsculas, números y longitud mínima.
              </p>
            </div>
            <Switch
              checked={securitySettings.requireStrongPasswords}
              onCheckedChange={noop}
              disabled
              aria-label="Exigir contraseñas robustas"
            />
          </div>
        </CardContent>
      </Card>
        </div>

        <div className="mb-4 space-y-4">
      <Card className={DISABLED_CLASS}>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Integraciones</CardTitle>
            <Badge variant="outline">En desarrollo</Badge>
          </div>
          <CardDescription>
            Conecta herramientas clave para automatizar la operación. Estamos
            preparando los conectores oficiales para producción.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">Google Calendar</p>
              <p className="text-xs text-muted-foreground">
                Sincroniza turnos automáticamente con agendas personales.
              </p>
            </div>
            <Switch
              checked={integrationSettings.googleCalendar}
              onCheckedChange={noop}
              disabled
              aria-label="Activar integración con Google Calendar"
            />
          </div>
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">WhatsApp Business API</p>
              <p className="text-xs text-muted-foreground">
                Activa campañas de seguimiento y confirmaciones automáticas.
              </p>
            </div>
            <Switch
              checked={integrationSettings.whatsappBusiness}
              onCheckedChange={noop}
              disabled
              aria-label="Activar integración con WhatsApp Business"
            />
          </div>
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">Meta Ads / Facebook Pixel</p>
              <p className="text-xs text-muted-foreground">
                Traza conversiones de campañas para medir reservas generadas.
              </p>
            </div>
            <Switch
              checked={integrationSettings.metaAds}
              onCheckedChange={noop}
              disabled
              aria-label="Activar Meta Ads"
            />
          </div>
          <div className={`flex items-center justify-between rounded-lg border p-3 ${DISABLED_CLASS}`}>
            <div>
              <p className="text-sm font-medium">HubSpot CRM</p>
              <p className="text-xs text-muted-foreground">
                Envía nuevos clientes a tu pipeline comercial automáticamente.
              </p>
            </div>
            <Switch
              checked={integrationSettings.hubspot}
              onCheckedChange={noop}
              disabled
              aria-label="Activar integración con HubSpot"
            />
          </div>
        </CardContent>
      </Card>
        </div>

        {/* Mercado Pago Integration */}
        {currentRole === 'owner' && (
          <div className="mb-4 space-y-4">
            <MercadoPagoSection />
          </div>
        )}

        <div className="mb-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Apariencia</CardTitle>
            <Badge>Cargado</Badge>
          </div>
          <CardDescription>
            El cambio de tema está activo. Usa el botón flotante (☀️ / 🌙) en la
            esquina inferior derecha para alternar entre modos claro y oscuro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Estamos ajustando el layout para que la burbuja de tema no se
            superponga con otros componentes. Mientras tanto, los accesos
            deshabilitados se muestran en gris para indicar que aún no están
            disponibles.
          </p>
        </CardContent>
      </Card>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end" role="group" aria-label="Acciones de configuración">
        <Button
          variant="outline"
          disabled
          className={DISABLED_CLASS}
          aria-label="Restaurar valores por defecto"
          data-action="reset-settings"
        >
          Restaurar valores por defecto
        </Button>
        <Button 
          disabled 
          className={DISABLED_CLASS}
          aria-label="Guardar cambios de configuración"
          data-action="save-settings"
        >
          Guardar cambios
        </Button>
      </div>
      </section>
      </Section>
    </PageContainer>
  );
}
