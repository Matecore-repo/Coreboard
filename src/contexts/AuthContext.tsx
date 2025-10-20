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
  signInAsDemo: () => void;
  signOut: () => Promise<void>;
  switchOrganization: (org_id: string) => void;
  currentOrgId: string | null;
  currentRole: string | null;
  createOrganization: (orgData: { name: string; salonName: string; salonAddress?: string; salonPhone?: string }) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_ORG_ID = 'demo-org-00000000000000000000';
const DEMO_USER_ID = 'demo-user-000000000000000000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // NO restaurar sesión automáticamente - solo cuando el usuario haga login explícito
  useEffect(() => {
    console.log('🚀 AUTH: Iniciando AuthContext - SIN restauración automática');
    setLoading(false);
    console.log('✅ AUTH: AuthContext listo - esperando login explícito');

    // Escuchar cambios de autenticación
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('🔄 AUTH: onAuthStateChange - Event:', event, 'Session:', !!newSession);
      
      setSession(newSession);
      
      if (newSession?.user) {
        console.log('🔐 AUTH: Nueva sesión detectada para:', newSession.user.email);
        safeLocalStorage.setItem('sb-session', JSON.stringify(newSession));
        await fetchUserMemberships(newSession.user.id);
      } else {
        console.log('🚪 AUTH: Sesión cerrada - limpiando usuario');
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
      console.log('🔍 Fetching memberships for user:', userId);
      
      // Obtener todas las membresías del usuario
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('org_id, role, is_primary')
        .eq('user_id', userId);

      console.log('📊 Memberships result:', { memberships, error });

      if (error) {
        console.error('Error fetching memberships:', error);
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('👤 Auth user:', authUser?.email);
      
      if (!authUser) return;

      // Detectar si es usuario nuevo (sin membresías)
      const isNewUser = !memberships || memberships.length === 0;
      
      // Si tiene membresías, seleccionar la primaria o la primera como org actual
      const primaryOrg = memberships?.find(m => m.is_primary) || memberships?.[0];
      
      const userData = {
        id: userId,
        email: authUser.email,
        memberships: memberships || [],
        current_org_id: primaryOrg?.org_id,
        isNewUser,
      };
      
      console.log('✅ Setting user data:', userData);
      setUser(userData);
    } catch (e) {
      console.error('Error loading user memberships:', e);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔑 AUTH: 🖱️ BOTÓN "INICIAR SESIÓN" PRESIONADO');
    console.log('🔑 AUTH: Intentando login con email:', email);
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('❌ AUTH: Error en login:', error.message);
        throw error;
      }
      
      if (data?.session) {
        console.log('✅ AUTH: Login exitoso para:', data.session.user.email);
        setSession(data.session);
        safeLocalStorage.setItem('sb-session', JSON.stringify(data.session));
        await fetchUserMemberships(data.session.user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemo = () => {
    console.log('🎭 AUTH: 🖱️ BOTÓN "EXPLORAR DEMO" PRESIONADO');
    console.log('🎭 AUTH: Usuario seleccionó MODO DEMO');
    setUser({
      id: DEMO_USER_ID,
      email: 'demo@coreboard.local',
      memberships: [{ org_id: DEMO_ORG_ID, role: 'owner' }],
      current_org_id: DEMO_ORG_ID,
    });
    setSession(null);
    safeLocalStorage.setItem('sb-session', JSON.stringify({ user: { id: DEMO_USER_ID, email: 'demo@coreboard.local' } }));
    console.log('✅ AUTH: Usuario DEMO configurado correctamente');
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
    console.log('🔗 AUTH: Enviando magic link a:', email);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        console.error('❌ AUTH: Error enviando magic link:', error.message);
        throw error;
      }
      
      console.log('✅ AUTH: Magic link enviado correctamente');
    } catch (error: any) {
      console.error('❌ AUTH: Error en sendMagicLink:', error.message);
      throw error;
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

      // Crear organización
      const { data: org, error: orgError } = await supabase
        .from('orgs')
        .insert({ name: orgData.name })
        .select()
        .single();

      if (orgError) throw orgError;

      // Crear membresía como owner
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          org_id: org.id,
          user_id: user.id,
          role: 'owner',
          is_primary: true
        });

      if (membershipError) throw membershipError;

      // Crear primer salón
      const { error: salonError } = await supabase
        .from('salons')
        .insert({
          org_id: org.id,
          name: orgData.salonName,
          address: orgData.salonAddress,
          phone: orgData.salonPhone
        });

      if (salonError) throw salonError;

      // Actualizar el usuario con la nueva organización
      await fetchUserMemberships(user.id);
    } finally {
      setLoading(false);
    }
  };

  const currentOrgId = user?.current_org_id || null;
  const currentRole = user?.memberships?.find(m => m.org_id === currentOrgId)?.role || null;

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signInAsDemo, signOut, switchOrganization, currentOrgId, currentRole, createOrganization, sendMagicLink }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};


