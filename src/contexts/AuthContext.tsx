import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabase';

type User = {
  id: string;
  email?: string | null;
  role?: 'admin' | 'owner' | 'employee' | 'demo' | null;
  salon_id?: string | null;
};

type AuthContextValue = {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInAsDemo: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Restaurar sesión desde Supabase si hay un session en localStorage
    const sessionJson = localStorage.getItem('sb-session');
    if (sessionJson) {
      try {
        const session = JSON.parse(sessionJson);
        if (session?.user) {
          // Special local demo session (no Supabase requests)
          if (session.user.id === 'demo') {
            setUser({ id: 'demo', email: session.user.email || 'demo@demo.local', role: 'demo', salon_id: null });
          } else {
            // set session first
            supabase.auth.setSession(session);
            // fetch profile (role + salon_id)
            (async () => {
              try {
                const { data: profile } = await supabase.from('profiles').select('role, salon_id').eq('id', session.user.id).single();
                setUser({ id: session.user.id, email: session.user.email, role: profile?.role || 'demo', salon_id: profile?.salon_id || null });
              } catch (e) {
                console.warn('Error fetching profile', e);
                setUser({ id: session.user.id, email: session.user.email, role: 'demo', salon_id: null });
              }
            })();
          }
        }
      } catch (e) {
        console.warn('Error parsing sb-session', e);
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Guardar session en localStorage
        localStorage.setItem('sb-session', JSON.stringify(session));
        // If demo user skip Supabase lookup
        if (session.user.id === 'demo') {
          setUser({ id: 'demo', email: session.user.email || 'demo@demo.local', role: 'demo', salon_id: null });
          return;
        }
        // obtener profile
        (async () => {
          try {
            const { data: profile } = await supabase.from('profiles').select('role, salon_id').eq('id', session.user!.id).single();
            setUser({ id: session.user!.id, email: session.user!.email, role: profile?.role || 'demo', salon_id: profile?.salon_id || null });
          } catch (e) {
            console.warn('Error fetching profile onAuthStateChange', e);
            setUser({ id: session.user!.id, email: session.user!.email, role: 'demo', salon_id: null });
          }
        })();
      } else {
        setUser(null);
        localStorage.removeItem('sb-session');
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data?.session) {
      localStorage.setItem('sb-session', JSON.stringify(data.session));
      // fetch profile to populate role + salon_id immediately
      try {
        const { data: profile } = await supabase.from('profiles').select('role, salon_id').eq('id', data.session.user.id).single();
        setUser({ id: data.session.user.id, email: data.session.user.email, role: profile?.role || 'demo', salon_id: profile?.salon_id || null });
      } catch (e) {
        console.warn('Error fetching profile on signIn', e);
        setUser({ id: data.session.user.id, email: data.session.user.email, role: 'demo', salon_id: null });
      }
    }
  };

  const signInAsDemo = () => {
    const demoUser: User = { id: 'demo', email: 'demo@demo.local', role: 'demo', salon_id: null };
    setUser(demoUser);
    // store a lightweight session so reload keeps demo mode
    try {
      localStorage.setItem('sb-session', JSON.stringify({ user: { id: demoUser.id, email: demoUser.email } }));
    } catch (e) {
      // ignore
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('sb-session');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signInAsDemo, signOut }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};


