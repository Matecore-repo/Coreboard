import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Copy, Check, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
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
      toast.error('Selecciona un salón');
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
      toast.success('Link de pago generado correctamente');
    } catch (error: any) {
      console.error('Error generando link de pago:', error);
      toast.error(error.message || 'Error al generar link de pago');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!paymentLink) return;
    
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      toast.success('Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copiando link:', error);
      toast.error('Error al copiar link');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[90vw] sm:w-full">
        <DialogHeader className="mb-4">
          <DialogTitle className="mb-2">Generar link de pago</DialogTitle>
          <DialogDescription className="text-sm">
            Genera un link público para que tus clientes puedan reservar turnos y pagar online.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          {!paymentLink ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="salon">Salón</Label>
                <Select value={selectedSalonId} onValueChange={setSelectedSalonId} disabled={salonsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un salón" />
                  </SelectTrigger>
                  <SelectContent>
                    {salons.map((salon) => (
                      <SelectItem key={salon.id} value={salon.id}>
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
                />
              </div>

              <Button 
                onClick={handleGenerateLink} 
                disabled={isGenerating || !selectedSalonId || salonsLoading}
                className="w-full mt-4"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generando...' : 'Generar link'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="mb-2 block">Link de pago</Label>
                <div className="flex gap-3">
                  <Input
                    value={paymentLink}
                    readOnly
                    className="flex-1 font-mono text-sm px-3 py-2"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="rounded-lg bg-muted p-4 space-y-3">
                <p className="text-sm font-medium mb-2">Instrucciones:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside ml-1">
                  <li className="pl-1">Comparte este link con tus clientes</li>
                  <li className="pl-1">Ellos podrán ver todos los locales, profesionales y servicios disponibles</li>
                  <li className="pl-1">Podrán reservar turnos y pagar online</li>
                  <li className="pl-1">Los turnos se reflejarán automáticamente en tu CRM</li>
                </ol>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    setPaymentLink(undefined);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Generar nuevo link
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

