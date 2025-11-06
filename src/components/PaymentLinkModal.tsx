import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Copy, Check, Link as LinkIcon } from "lucide-react";
import { toastSuccess, toastError } from "../lib/toast";
import { usePaymentLinks } from "../hooks/usePaymentLinks";
import { useAuth } from "../contexts/AuthContext";
import { useSalons } from "../hooks/useSalons";
import { supabase } from "../lib/supabase";

interface PaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentLinkModal({ isOpen, onClose }: PaymentLinkModalProps) {
  const { currentOrgId, user } = useAuth();
  const { salons, isLoading: salonsLoading } = useSalons(currentOrgId || undefined);
  const [selectedSalonId, setSelectedSalonId] = useState<string>('');
  const [title, setTitle] = useState('Reserva tu turno');
  const [description, setDescription] = useState('');
  const [paymentLink, setPaymentLink] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPaymentLink(undefined);
      setCopied(false);
      setSelectedSalonId('');
      setTitle('Reserva tu turno');
      setDescription('');
    }
  }, [isOpen]);

  const handleGenerateLink = async () => {
    if (!currentOrgId || !selectedSalonId) {
      toastError('Selecciona un salón');
      return;
    }

    try {
      setIsGenerating(true);
      
      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Llamar a Edge Function
      const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
      
      const response = await fetch(`${functionsUrl}/create-payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          org_id: currentOrgId,
          salon_id: selectedSalonId,
          title,
          description: description || undefined,
          metadata: {},
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error generando link');
      }

      const data = await response.json();
      setPaymentLink(data.url);
      toastSuccess('Link de pago generado correctamente');
    } catch (error: any) {
      console.error('Error generando link de pago:', error);
      toastError(error.message || 'Error al generar link de pago');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!paymentLink) return;
    
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      toastSuccess('Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copiando link:', error);
      toastError('Error al copiar link');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-lg w-[90vw] sm:w-full"
        role="dialog"
        aria-labelledby="payment-link-title"
        aria-describedby="payment-link-description"
        aria-modal="true"
        data-modal="payment-link"
      >
        <DialogHeader className="mb-4">
          <DialogTitle id="payment-link-title" className="mb-2">Generar link de pago</DialogTitle>
          <DialogDescription id="payment-link-description" className="text-sm">
            Genera un link público para que tus clientes puedan reservar turnos y pagar online.
          </DialogDescription>
        </DialogHeader>
        
        <section className="space-y-6 py-2" role="region" aria-label="Formulario de link de pago">
          {!paymentLink ? (
            <div className="space-y-4" role="form" aria-label="Configuración del link de pago">
              <div className="space-y-2">
                <Label htmlFor="salon">Salón</Label>
                <Select value={selectedSalonId} onValueChange={setSelectedSalonId} disabled={salonsLoading}>
                  <SelectTrigger id="salon" aria-label="Seleccionar salón">
                    <SelectValue placeholder="Selecciona un salón" />
                  </SelectTrigger>
                  <SelectContent>
                    {salons.map((salon) => (
                      <SelectItem key={salon.id} value={salon.id} aria-label={`Salón: ${salon.name}`}>
                        {salon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Reserva tu turno"
                  aria-label="Título del link de pago"
                  data-field="title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción del link de pago"
                  rows={3}
                  aria-label="Descripción del link de pago (opcional)"
                  data-field="description"
                />
              </div>

              <Button 
                onClick={handleGenerateLink} 
                disabled={isGenerating || !selectedSalonId || salonsLoading}
                className="w-full mt-4"
                aria-label="Generar link de pago"
                data-action="generate-payment-link"
              >
                <LinkIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                {isGenerating ? 'Generando...' : 'Generar link'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6" role="region" aria-label="Link de pago generado">
              <div className="space-y-3">
                <Label className="mb-2 block" htmlFor="payment-link-input">Link de pago</Label>
                <div className="flex gap-3">
                  <Input
                    id="payment-link-input"
                    value={paymentLink}
                    readOnly
                    className="flex-1 font-mono text-sm px-3 py-2"
                    aria-label="Link de pago generado"
                    data-field="payment-link"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label={copied ? "Link copiado" : "Copiar link de pago"}
                    data-action="copy-payment-link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="rounded-lg bg-muted p-4 space-y-3" role="region" aria-label="Instrucciones de uso">
                <p className="text-sm font-medium mb-2">Instrucciones:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside ml-1" role="list">
                  <li className="pl-1" role="listitem">Comparte este link con tus clientes</li>
                  <li className="pl-1" role="listitem">Ellos podrán ver todos los locales, profesionales y servicios disponibles</li>
                  <li className="pl-1" role="listitem">Podrán reservar turnos y pagar online</li>
                  <li className="pl-1" role="listitem">Los turnos se reflejarán automáticamente en tu CRM</li>
                </ol>
              </div>

              <div className="flex gap-3 pt-2" role="group" aria-label="Acciones del link generado">
                <Button
                  onClick={() => {
                    setPaymentLink(undefined);
                  }}
                  variant="outline"
                  className="flex-1"
                  aria-label="Generar nuevo link de pago"
                  data-action="new-payment-link"
                >
                  Generar nuevo link
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1"
                  aria-label="Cerrar modal de link de pago"
                  data-action="close-payment-link"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

