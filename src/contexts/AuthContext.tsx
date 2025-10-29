﻿import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import supabase from '../lib/supabase';
import { useRouter } from 'next/router';
import { DEMO_ORG_ID, DEMO_USER_EMAIL, DEMO_USER_ID, DEMO_FEATURE_FLAG } from '../demo/constants';

// Demo mode: si está activado, no hacer requests reales
const isDemoModeFlag = DEMO_FEATURE_FLAG;

// Gestión segura de localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // localStorage no disponible
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // localStorage no disponible
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
  isNewUser?: boolean;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, signupToken?: string) => Promise<void>;
  signInAsDemo: () => void;
  signOut: () => Promise<void>;
  switchOrganization: (org_id: string) => void;
  currentOrgId: string | null;
  currentRole: string | null;
  createOrganization: (orgData: { name: string; salonName: string; salonAddress?: string; salonPhone?: string }) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  claimInvitation: (token: string) => Promise<{ organization_id: string; role: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  session: 'sb-session',
  currentOrg: 'sb-current-org',
  selectedSalon: 'sb-selected-salon',
} as const;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isDemoUser = user?.id === DEMO_USER_ID;
  const isDemo = isDemoModeFlag || isDemoUser;

  // Obtener membresías del usuario
  const fetchUserMemberships = useCallback(async (userId: string, authUser: SupabaseUser): Promise<string | null> => {
    // En modo demo, no hacer queries reales
    if (isDemoModeFlag) {
      return null;
    }

    try {
      // Obtener perfil del usuario para current_org_id guardado
      const { data: profile } = await supabase
        .from('profiles')
        .select('raw_app_meta_data')
        .eq('id', userId)
        .single();

      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('org_id, role, is_primary')
        .eq('user_id', userId);

      if (error) {
        console.error('Error al obtener membresías:', error);
        setUser({
          id: authUser.id,
          email: authUser.email,
          memberships: [],
          isNewUser: true
        });
        return null;
      }

      const isNewUser = !memberships || memberships.length === 0;
      const primaryOrg = memberships?.find(m => m.is_primary) || memberships?.[0];

      // Usar current_org_id guardado, o primary org, o primera membresía
      const savedOrgId = profile?.raw_app_meta_data?.current_org_id;
      const currentOrgId = savedOrgId || primaryOrg?.org_id;

      const userData: User = {
        id: authUser.id,
        email: authUser.email,
        memberships: memberships || [],
        current_org_id: currentOrgId,
        isNewUser,
      };

      setUser(userData);
      if (currentOrgId) {
        safeLocalStorage.setItem(STORAGE_KEYS.currentOrg, currentOrgId);
      } else {
        safeLocalStorage.removeItem(STORAGE_KEYS.currentOrg);
      }
      return currentOrgId || null;
    } catch (e) {
      console.error('Error al construir contexto de usuario:', e);
      setUser(null);
      safeLocalStorage.removeItem(STORAGE_KEYS.currentOrg);
      return null;
    }
  }, []);

  const handleSignedOut = useCallback(() => {
    safeLocalStorage.removeItem(STORAGE_KEYS.session);
    safeLocalStorage.removeItem(STORAGE_KEYS.currentOrg);
    safeLocalStorage.removeItem(STORAGE_KEYS.selectedSalon);
    setUser(null);
    setSession(null);
    router.push('/login');
  }, [router]);

  const handleSignedIn = useCallback(async (newSession: Session | null) => {
    if (!newSession?.user) {
      handleSignedOut();
      return;
    }

    setSession(newSession);
    safeLocalStorage.setItem(STORAGE_KEYS.session, JSON.stringify(newSession));
    await fetchUserMemberships(newSession.user.id, newSession.user as SupabaseUser);
    router.push('/dashboard');
  }, [handleSignedOut, router, fetchUserMemberships]);

  // Restaurar sesión y escuchar cambios de autenticación
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      // En modo demo, no restaurar sesiones reales
      if (isDemoModeFlag) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();

        if (isMounted && activeSession?.user) {
          await handleSignedIn(activeSession);
        } else if (isMounted) {
          setUser(null);
          setSession(null);
        }
      } catch (e) {
        console.error('Error al restaurar sesión:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    restoreSession();

    // Escuchar cambios de autenticación (solo si no es demo mode)
    const { data: listener } = isDemoModeFlag
      ? ({ subscription: { unsubscribe: () => {} } } as any)
      : supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!isMounted) return;
          if (event === 'SIGNED_OUT') {
            handleSignedOut();
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await handleSignedIn(newSession ?? null);
          }
        });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [handleSignedIn, handleSignedOut]);

  const signIn = async (email: string, password: string): Promise<void> => {
    if (isDemoModeFlag) {
      throw new Error('Modo demo: usa "Iniciar Demo" para probar la aplicación');
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error('No se pudo iniciar sesión. Intenta de nuevo.');
      }

      // onAuthStateChange se encargará del resto
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, signupToken?: string): Promise<void> => {
    if (isDemoModeFlag) {
      throw new Error('Modo demo: usa "Iniciar Demo" para probar la aplicación');
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
          data: signupToken ? { invite_token: signupToken } : undefined,
        },
      });

      if (error) {
        throw error;
      }

      // Si hay sesión inmediata y token, intentar claim inmediatamente
      if (data.session && signupToken) {
        try {
          await supabase.rpc('claim_invitation', { p_token: signupToken });
        } catch (claimError) {
          // Claim falló, pero el usuario ya se creó. Podrá intentar claim después.
          console.warn('Claim automático falló, el usuario podrá reclamar manualmente:', claimError);
        }
      }

      // TEMPORAL: Si no hay token, crear una membresía básica para testing
      if (data.session && !signupToken) {
        try {
          // Verificar si ya existe una membresía para este usuario
          const { data: existingMembership } = await supabase
            .from('memberships')
            .select('id')
            .eq('user_id', data.session.user.id)
            .single();

          if (!existingMembership) {
            // Crear una organización de prueba si no existe
            const { data: org, error: orgError } = await supabase
              .from('orgs')
              .insert({ name: 'Test Organization' })
              .select()
              .single();

            if (!orgError && org) {
              // Crear membresía como owner
              await supabase
                .from('memberships')
                .insert({
                  org_id: org.id,
                  user_id: data.session.user.id,
                  role: 'owner',
                  is_primary: true,
                });

              // Crear un salón de prueba
              await supabase
                .from('salons')
                .insert({
                  org_id: org.id,
                  name: 'Test Salon',
                  address: 'Test Address',
                });
            }
          }
        } catch (setupError) {
          console.warn('Error creando setup inicial:', setupError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemo = () => {
    setUser({
      id: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      memberships: [{ org_id: DEMO_ORG_ID, role: 'owner' }],
      current_org_id: DEMO_ORG_ID,
    });
    setSession(null);
    safeLocalStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ user: { id: DEMO_USER_ID, email: DEMO_USER_EMAIL } }));
    safeLocalStorage.setItem(STORAGE_KEYS.currentOrg, DEMO_ORG_ID);
    safeLocalStorage.removeItem(STORAGE_KEYS.selectedSalon);
    router.push('/dashboard');
  };

  const signOut = async (): Promise<void> => {
    if (isDemoModeFlag || isDemoUser) {
      handleSignedOut();
      return;
    }

    try {
      await supabase.auth.signOut();
      handleSignedOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      handleSignedOut();
    }
  };

  const sendMagicLink = async (email: string): Promise<void> => {
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

  const resetPassword = async (email: string): Promise<void> => {
    try {
      const redirect = typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });

      if (error) {
        throw error;
      }
    } catch (e: any) {
      throw e;
    }
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        throw error;
      }
    } catch (e: any) {
      throw e;
    }
  };

  const claimInvitation = async (token: string): Promise<{ organization_id: string; role: string }> => {
    if (isDemoModeFlag) {
      throw new Error('Modo demo: no se pueden reclamar invitaciones reales');
    }

    try {
      const { data, error } = await supabase.rpc('claim_invitation', { p_token: token });

      if (error) {
        throw error;
      }

      // Refrescar memberships después del claim
      if (session?.user) {
        await fetchUserMemberships(session.user.id, session.user);

        // Si se reclamó una invitación y se obtuvo una organización, guardarla como current_org_id
        if (data.organization_id) {
          await supabase
            .from('profiles')
            .update({ raw_app_meta_data: { current_org_id: data.organization_id } })
            .eq('id', session.user.id);
        }
      }

      return data;
    } catch (e: any) {
      throw e;
    }
  };

  const switchOrganization = async (org_id: string) => {
    if (user) {
      if (isDemo) {
        safeLocalStorage.setItem(STORAGE_KEYS.currentOrg, org_id);
        setUser({ ...user, current_org_id: org_id });
        safeLocalStorage.removeItem(STORAGE_KEYS.selectedSalon);
        return;
      }
      // Guardar en BD para que persista
      await supabase
        .from('profiles')
        .update({ raw_app_meta_data: { current_org_id: org_id } })
        .eq('id', user.id);

      safeLocalStorage.setItem(STORAGE_KEYS.currentOrg, org_id);
      setUser({ ...user, current_org_id: org_id });
      safeLocalStorage.removeItem(STORAGE_KEYS.selectedSalon);
    }
  };

  const createOrganization = async (orgData: { name: string; salonName: string; salonAddress?: string; salonPhone?: string }): Promise<void> => {
    if (!user) throw new Error('Usuario no autenticado');

    const isDemoUserMode = user.email === DEMO_USER_EMAIL || !session || isDemoModeFlag;
    if (isDemoUserMode) {
      setUser(prev => (prev ? { ...prev, isNewUser: false } : prev));
      safeLocalStorage.setItem(STORAGE_KEYS.currentOrg, DEMO_ORG_ID);
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

      await fetchUserMemberships(user.id, { id: user.id, email: user.email } as SupabaseUser);
    } finally {
      setLoading(false);
    }
  };

  const currentOrgId = user?.current_org_id || null;
  const currentRole = user?.memberships?.find(m => m.org_id === currentOrgId)?.role || null;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isDemo,
      signIn,
      signUp,
      signInAsDemo,
      signOut,
      switchOrganization,
      currentOrgId,
      currentRole,
      createOrganization,
      sendMagicLink,
      resetPassword,
      updatePassword,
      claimInvitation
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};





