import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useAuth } from '../src/contexts/AuthContext';

const OrganizationView = dynamic(() => import('../src/components/views/OrganizationView'), { ssr: false });

export default function OrganizationPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // no-op: solo esperamos a que cargue el contexto
  }, [loading]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando...</div>;
  }

  return <OrganizationView />;
}


