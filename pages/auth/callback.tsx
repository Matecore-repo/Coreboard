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
        // Verificar si hay un token de invitación en los query params (nuevo sistema)
        const inviteToken = router.query.invitation || router.query.token;
        
        // También verificar legacy token en metadata (sistema antiguo)
        const legacyToken = session.user.user_metadata?.invite_token;

        // Priorizar token de query params (nuevo sistema)
        const tokenToUse = (inviteToken && typeof inviteToken === 'string') 
          ? inviteToken 
          : legacyToken;

        if (tokenToUse) {
          try {
            await claimInvitation(tokenToUse);
            toast.success('¡Bienvenido! Tu invitación ha sido aceptada.');
          } catch (error: any) {
            console.error('Error reclamando invitación:', error);
            // No bloquear el login si el claim falla
            toast.warning('Te has registrado correctamente. Si tuviste problemas con tu invitación, contacta al administrador.');
          }
        }

        // Verificar si hay token de invitación pendiente en sessionStorage
        // (cuando usuario no estaba logueado y ahora sí)
        const pendingToken = typeof window !== 'undefined' 
          ? sessionStorage.getItem('pending_invitation_token')
          : null;

        if (pendingToken && !tokenToUse) {
          try {
            await claimInvitation(pendingToken);
            sessionStorage.removeItem('pending_invitation_token');
            toast.success('¡Bienvenido! Tu invitación ha sido aceptada.');
          } catch (error: any) {
            console.error('Error reclamando invitación pendiente:', error);
            sessionStorage.removeItem('pending_invitation_token');
          }
        }

        // Verificar si es vinculación de Google
        const isLinking = router.query.link === 'true';
        if (isLinking) {
          toast.success('Cuenta de Google vinculada correctamente');
        }

        // Redirigir a dashboard (o accept-invite si hay token pendiente)
        if (pendingToken && !tokenToUse) {
          // Ya procesamos el token, ir a dashboard
          router.push('/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else if (!loading && !session) {
        // Si no hay sesión después de cargar, podría ser error
        toast.error('No se pudo autenticar. Intenta de nuevo.');
        router.push('/login');
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
