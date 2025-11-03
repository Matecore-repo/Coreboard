import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Copy, Check, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { usePaymentLinks } from "../hooks/usePaymentLinks";
import { useAuth } from "../contexts/AuthContext";

interface PaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentLinkModal({ isOpen, onClose }: PaymentLinkModalProps) {
  const { currentOrgId } = useAuth();
  const { generatePaymentLink, isLoading } = usePaymentLinks();
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPaymentLink(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleGenerateLink = async () => {
    if (!currentOrgId) {
      toast.error('No hay organización seleccionada');
      return;
    }

    try {
      const link = await generatePaymentLink(currentOrgId);
      setPaymentLink(link);
      toast.success('Link de pago generado correctamente');
    } catch (error) {
      console.error('Error generando link de pago:', error);
      toast.error('Error al generar link de pago');
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

  const fullPaymentUrl = paymentLink 
    ? `${window.location.origin}/payment/${paymentLink.split('/').pop()}`
    : '';

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
              <p className="text-sm text-muted-foreground px-1">
                Al generar el link, se creará un token único que puedes compartir con tus clientes.
              </p>
              <Button 
                onClick={handleGenerateLink} 
                disabled={isLoading}
                className="w-full mt-4"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {isLoading ? 'Generando...' : 'Generar link'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="mb-2 block">Link de pago</Label>
                <div className="flex gap-3">
                  <Input
                    value={fullPaymentUrl}
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
                    setPaymentLink(null);
                    handleGenerateLink();
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

