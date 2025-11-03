import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../src/lib/supabase';
import { toast } from 'sonner';
import { PaymentGateway } from '../../src/components/views/PaymentGateway';

export default function PaymentPage() {
  const router = useRouter();
  const { token } = router.query;
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentLink, setPaymentLink] = useState<any>(null);

  useEffect(() => {
    if (!token || typeof token !== 'string') {
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        // Calcular hash del token
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Buscar payment link por hash
        const { data: link, error } = await supabase
          .from('payment_links')
          .select('*, org_id, organizations(*)')
          .eq('token_hash', tokenHash)
          .eq('active', true)
          .single();

        if (error || !link) {
          setIsValid(false);
          setLoading(false);
          return;
        }

        // Verificar que no esté expirado
        if (new Date(link.expires_at) < new Date()) {
          setIsValid(false);
          setLoading(false);
          return;
        }

        setPaymentLink(link);
        setIsValid(true);
      } catch (error) {
        console.error('Error validando token:', error);
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Validando link de pago...</p>
        </div>
      </div>
    );
  }

  if (!isValid || !paymentLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold">Link de pago inválido o expirado</h1>
          <p className="text-muted-foreground">
            El link de pago no es válido o ha expirado. Por favor, contacta con el establecimiento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PaymentGateway 
      orgId={paymentLink.org_id} 
      paymentLinkToken={token as string}
    />
  );
}

