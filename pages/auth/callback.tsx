import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/contexts/AuthContext';
import { toast } from 'sonner';

export default function AuthCallback() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    // Esperar a que la sesión se restaure
    if (!loading && session) {
      // Si hay sesión, redirigir a home
      router.push('/');
    } else if (!loading && !session) {
      // Si no hay sesión después de cargar, podría ser error
      toast.error('No se pudo autenticar. Intenta de nuevo.');
      router.push('/');
    }
  }, [session, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Procesando autenticación...</p>
      </div>
    </div>
  );
}
