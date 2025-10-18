import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import supabase from '../lib/supabase';

// Helper functions para manejar localStorage de manera segura
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      // localStorage no disponible (modo incógnito, políticas de seguridad, etc.)
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // localStorage no disponible - continuar sin persistir
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // localStorage no disponible - continuar sin limpiar
    }
  }
};

export type Membership = {
  org_id: string;
  role: 'admin' | 'owner' | 'employee' | 'viewer';
};

export type User = {
  id: string;
  email?: string | null;
  memberships: Membership[];
  current_org_id?: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInAsDemo: () => void;
  signOut: () => Promise<void>;
  switchOrganization: (org_id: string) => void;
  currentOrgId: string | null;
  currentRole: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_ORG_ID = 'demo-org-00000000000000000000';
const DEMO_USER_ID = 'demo-user-000000000000000000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión y cargar membresías
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Intentar restaurar sesión desde localStorage
        const sessionJson = safeLocalStorage.getItem('sb-session');
        if (sessionJson) {
          try {
            const parsed = JSON.parse(sessionJson);
            
            // Demo session
            if (parsed.user?.id === DEMO_USER_ID) {
              setUser({
                id: DEMO_USER_ID,
                email: 'demo@coreboard.local',
                memberships: [{ org_id: DEMO_ORG_ID, role: 'owner' }],
                current_org_id: DEMO_ORG_ID,
              });
              setSession(null);
              setLoading(false);
              return;
            }

            // Real session
            if (parsed.access_token) {
              await supabase.auth.setSession(parsed);
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              if (currentSession?.user) {
                setSession(currentSession);
                await fetchUserMemberships(currentSession.user.id);
              }
            }
          } catch (e) {
            console.warn('Error restoring session:', e);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Escuchar cambios de autenticación
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      
      if (newSession?.user) {
        safeLocalStorage.setItem('sb-session', JSON.stringify(newSession));
        await fetchUserMemberships(newSession.user.id);
      } else {
        setUser(null);
        safeLocalStorage.removeItem('sb-session');
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const fetchUserMemberships = async (userId: string) => {
    try {
      // Obtener todas las membresías del usuario
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('org_id, role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching memberships:', error);
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Si tiene membresías, seleccionar la primera como org actual
      const primaryOrg = memberships?.[0];
      
      setUser({
        id: userId,
        email: authUser.email,
        memberships: memberships || [],
        current_org_id: primaryOrg?.org_id,
      });
    } catch (e) {
      console.error('Error loading user memberships:', e);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      if (data?.session) {
        setSession(data.session);
        safeLocalStorage.setItem('sb-session', JSON.stringify(data.session));
        await fetchUserMemberships(data.session.user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemo = () => {
    setUser({
      id: DEMO_USER_ID,
      email: 'demo@coreboard.local',
      memberships: [{ org_id: DEMO_ORG_ID, role: 'owner' }],
      current_org_id: DEMO_ORG_ID,
    });
    setSession(null);
    safeLocalStorage.setItem('sb-session', JSON.stringify({ user: { id: DEMO_USER_ID, email: 'demo@coreboard.local' } }));
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      safeLocalStorage.removeItem('sb-session');
      setUser(null);
      setSession(null);
    }
  };

  const switchOrganization = (org_id: string) => {
    if (user) {
      setUser({ ...user, current_org_id: org_id });
    }
  };

  const currentOrgId = user?.current_org_id || null;
  const currentRole = user?.memberships?.find(m => m.org_id === currentOrgId)?.role || null;

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signInAsDemo, signOut, switchOrganization, currentOrgId, currentRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};


