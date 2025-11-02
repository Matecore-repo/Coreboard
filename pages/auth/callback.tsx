import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/contexts/AuthContext';
import { toast } from 'sonner';

export default function AuthCallback() {
  const router = useRouter();
  const { session, loading, claimInvitation } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Esperar a que la sesión se restaure
      if (!loading && session?.user) {
        // Verificar si hay un token de invitación para reclamar (opcional)
        const inviteToken = session.user.user_metadata?.invite_token;
        if (inviteToken) {
          try {
            await claimInvitation(inviteToken);
            toast.success('¡Bienvenido! Tu invitación ha sido aceptada.');
          } catch (error: any) {
            console.error('Error reclamando invitación:', error);
            // No bloquear el login si el claim falla
            toast.warning('Te has registrado correctamente. Si tuviste problemas con tu invitación, contacta al administrador.');
          }
        } else {
          // Usuario nuevo sin invitación - redirigir para crear su organización
          toast.success('¡Bienvenido! Puedes crear tu organización ahora.');
        }

        // Redirigir a home (el usuario podrá crear su organización si no tiene una)
        router.push('/');
      } else if (!loading && !session) {
        // Si no hay sesión después de cargar, podría ser error
        toast.error('No se pudo autenticar. Intenta de nuevo.');
        router.push('/');
      }
    };

    handleCallback();
  }, [session, loading, router, claimInvitation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Procesando autenticación...</p>
      </div>
    </div>
  );
}
