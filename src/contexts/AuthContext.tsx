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
      // localStorage no disponible (modo incÃ³gnito, polÃ­ticas de seguridad, etc.)
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
  role: 'owner' | 'admin' | 'employee' | 'viewer';
  is_primary?: boolean;
};

export type User = {
  id: string;
  email?: string | null;
  memberships: Membership[];
  current_org_id?: string;
  isNewUser?: boolean; // Flag para detectar usuarios nuevos
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, secretToken?: string) => Promise<void>;
  signInAsDemo: () => void;
  signOut: () => Promise<void>;
  switchOrganization: (org_id: string) => void;
  currentOrgId: string | null;
  currentRole: string | null;
  createOrganization: (orgData: { name: string; salonName: string; salonAddress?: string; salonPhone?: string }) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_ORG_ID = 'demo-org-00000000000000000000';
const DEMO_USER_ID = 'demo-user-000000000000000000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

// NO restaurar sesiÃ³n automÃ¡ticamente - solo cuando el usuario haga login explÃ­cito
  useEffect(() => {

setLoading(false);

// Escuchar cambios de autenticaciÃ³n
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {

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

// Obtener todas las membresÃ­as del usuario
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('org_id, role, is_primary')
        .eq('user_id', userId);

if (error) {

return;
      }

const { data: { user: authUser } } = await supabase.auth.getUser();

if (!authUser) return;

// Detectar si es usuario nuevo (sin membresÃ­as)
      const isNewUser = !memberships || memberships.length === 0;

// Si tiene membresÃ­as, seleccionar la primaria o la primera como org actual
      const primaryOrg = memberships?.find(m => m.is_primary) || memberships?.[0];

const userData = {
        id: userId,
        email: authUser.email,
        memberships: memberships || [],
        current_org_id: primaryOrg?.org_id,
        isNewUser,
      };

setUser(userData);
    } catch (e) {

}
  };

const signIn = async (email: string, password: string) => {

try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

if (error) {

throw error;
      }

if (data?.session) {

setSession(data.session);
        safeLocalStorage.setItem('sb-session', JSON.stringify(data.session));
        await fetchUserMemberships(data.session.user.id);
      }
    } finally {
      setLoading(false);
    }
  };

const signUp = async (email: string, password: string, secretToken?: string) => {

try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
          data: secretToken ? { signup_token: secretToken } : undefined,
        },
      });
      if (error) throw error;
      // Si la confirmaciÃ³n por email estÃ¡ activa, no habrÃ¡ sesiÃ³n inmediata
      if (data?.session?.user) {
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

const sendMagicLink = async (email: string) => {

try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

if (error) {

throw error;
      }

} catch (error: any) {

throw error;
    }
  };

const resetPassword = async (email: string) => {

try {
      const redirect = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
      if (error) throw error;

} catch (e:any) {

throw e;
    }
  };

const switchOrganization = (org_id: string) => {
    if (user) {
      setUser({ ...user, current_org_id: org_id });
    }
  };

const createOrganization = async (orgData: { name: string; salonName: string; salonAddress?: string; salonPhone?: string }) => {
  if (!user) throw new Error('Usuario no autenticado');

  const isDemoUser = user.email === 'demo@coreboard.local' || !session;
  if (isDemoUser) {
    setUser(prev => (prev ? { ...prev, isNewUser: false } : prev));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('demo:create-org', {
          detail: {
            salonName: orgData.salonName,
            salonAddress: orgData.salonAddress,
            salonPhone: orgData.salonPhone,
          },
        }),
      );
    }
    return;
  }

  try {
    setLoading(true);

    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .insert({ name: orgData.name })
      .select()
      .single();

    if (orgError) throw orgError;

    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'owner',
        is_primary: true,
      });

    if (membershipError) throw membershipError;

    const { error: salonError } = await supabase
      .from('salons')
      .insert({
        org_id: org.id,
        name: orgData.salonName,
        address: orgData.salonAddress,
        phone: orgData.salonPhone,
      });

    if (salonError) throw salonError;

    await fetchUserMemberships(user.id);
  } finally {
    setLoading(false);
  }
};

const currentOrgId = user?.current_org_id || null;
  const currentRole = user?.memberships?.find(m => m.org_id === currentOrgId)?.role || null;

return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInAsDemo, signOut, switchOrganization, currentOrgId, currentRole, createOrganization, sendMagicLink, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};





