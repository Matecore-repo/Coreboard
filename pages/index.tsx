import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/contexts/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [loading, user, router]);

  return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Redirigiendo…</div>;
}
