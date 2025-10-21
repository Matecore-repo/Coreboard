﻿import React, { createContext, useContext, useEffect, useState } from 'react';
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
  signUp: (email: string, password: string) => Promise<void>;
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
    console.log('ðŸš€ AUTH: Iniciando AuthContext - SIN restauraciÃ³n automÃ¡tica');
    setLoading(false);
    console.log('âœ… AUTH: AuthContext listo - esperando login explÃ­cito');

    // Escuchar cambios de autenticaciÃ³n
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('ðŸ”„ AUTH: onAuthStateChange - Event:', event, 'Session:', !!newSession);
      
      setSession(newSession);
      
      if (newSession?.user) {
        console.log('ðŸ” AUTH: Nueva sesiÃ³n detectada para:', newSession.user.email);
        safeLocalStorage.setItem('sb-session', JSON.stringify(newSession));
        await fetchUserMemberships(newSession.user.id);
      } else {
        console.log('ðŸšª AUTH: SesiÃ³n cerrada - limpiando usuario');
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
      console.log('ðŸ” Fetching memberships for user:', userId);
      
      // Obtener todas las membresÃ­as del usuario
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('org_id, role, is_primary')
        .eq('user_id', userId);

      console.log('ðŸ“Š Memberships result:', { memberships, error });

      if (error) {
        console.error('Error fetching memberships:', error);
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('ðŸ‘¤ Auth user:', authUser?.email);
      
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
      
      console.log('âœ… Setting user data:', userData);
      setUser(userData);
    } catch (e) {
      console.error('Error loading user memberships:', e);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('ðŸ”‘ AUTH: ðŸ–±ï¸ BOTÃ“N "INICIAR SESIÃ“N" PRESIONADO');
    console.log('ðŸ”‘ AUTH: Intentando login con email:', email);
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('âŒ AUTH: Error en login:', error.message);
        throw error;
      }
      
      if (data?.session) {
        console.log('âœ… AUTH: Login exitoso para:', data.session.user.email);
        setSession(data.session);
        safeLocalStorage.setItem('sb-session', JSON.stringify(data.session));
        await fetchUserMemberships(data.session.user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    console.log('ðŸ“ AUTH: Registro de usuario', email);
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined },
      });
      if (error) throw error;
      // Si la confirmaciÃ³n por email estÃ¡ activa, no habrÃ¡ sesiÃ³n inmediata
      if (data?.session?.user) {
        setSession(data.session);
        safeLocalStorage.setItem('sb-session', JSON.stringify(data.session));
        await fetchUserMemberships(data.session.user.id);
      }
      console.log('âœ… AUTH: SignUp enviado. Verifique email si corresponde.');
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemo = () => {
    console.log('ðŸŽ­ AUTH: ðŸ–±ï¸ BOTÃ“N "EXPLORAR DEMO" PRESIONADO');
    console.log('ðŸŽ­ AUTH: Usuario seleccionÃ³ MODO DEMO');
    setUser({
      id: DEMO_USER_ID,
      email: 'demo@coreboard.local',
      memberships: [{ org_id: DEMO_ORG_ID, role: 'owner' }],
      current_org_id: DEMO_ORG_ID,
    });
    setSession(null);
    safeLocalStorage.setItem('sb-session', JSON.stringify({ user: { id: DEMO_USER_ID, email: 'demo@coreboard.local' } }));
    console.log('âœ… AUTH: Usuario DEMO configurado correctamente');
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
    console.log('ðŸ”— AUTH: Enviando magic link a:', email);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        console.error('âŒ AUTH: Error enviando magic link:', error.message);
        throw error;
      }
      
      console.log('âœ… AUTH: Magic link enviado correctamente');
    } catch (error: any) {
      console.error('âŒ AUTH: Error en sendMagicLink:', error.message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    console.log('ðŸ” AUTH: Reset password para:', email);
    try {
      const redirect = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
      if (error) throw error;
      console.log('âœ… AUTH: Email de reset enviado');
    } catch (e:any) {
      console.error('âŒ AUTH: Error en resetPassword:', e.message);
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

    try {
      setLoading(true);

      // Crear organizaciÃ³n
      const { data: org, error: orgError } = await supabase
        .from('orgs')
        .insert({ name: orgData.name })
        .select()
        .single();

      if (orgError) throw orgError;

      // Crear membresÃ­a como owner
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          org_id: org.id,
          user_id: user.id,
          role: 'owner',
          is_primary: true
        });

      if (membershipError) throw membershipError;

      // Crear primer salÃ³n
      const { error: salonError } = await supabase
        .from('salons')
        .insert({
          org_id: org.id,
          name: orgData.salonName,
          address: orgData.salonAddress,
          phone: orgData.salonPhone
        });

      if (salonError) throw salonError;

      // Actualizar el usuario con la nueva organizaciÃ³n
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



