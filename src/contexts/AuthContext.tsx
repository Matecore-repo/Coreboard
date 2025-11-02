﻿// ============================================================================
// IMPORTS - Importaciones necesarias para la autenticación
// ============================================================================
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
// ^ createContext: crea el contexto para compartir autenticación en toda la app
// ^ useContext: hook para acceder al contexto desde cualquier componente
// ^ useEffect: hook para ejecutar efectos secundarios (restaurar sesión, etc)
// ^ useState: hook para manejar estado local (usuario, sesión, loading)
// ^ useCallback: hook para memorizar funciones callback

import { Session, User as SupabaseUser } from '@supabase/supabase-js';
// ^ Session: tipo que representa una sesión de autenticación de Supabase
// ^ SupabaseUser: tipo que representa un usuario de Supabase

import supabase from '../lib/supabase';
// ^ Cliente de Supabase inicializado para hacer queries a la BD

import { useRouter } from 'next/router';
// ^ Hook de Next.js para navegar entre páginas (redireccionamientos)

import { DEMO_ORG_ID, DEMO_USER_EMAIL, DEMO_USER_ID, DEMO_FEATURE_FLAG } from '../demo/constants';
// ^ Constantes de demostración para usar la app sin autenticación real

// ============================================================================
// FLAG DE MODO DEMO
// ============================================================================
// Indica si la aplicación se ejecuta en modo demostración
// Si es true, no hace requests reales a Supabase
// Se controla desde variables de entorno
const isDemoModeFlag = DEMO_FEATURE_FLAG;

// ============================================================================
// UTILIDAD PARA ACCESO SEGURO A LOCALSTORAGE
// ============================================================================
// Evita errores si localStorage no está disponible (SSR, navegador sin soporte, etc)
const safeLocalStorage = {
  // Obtener un valor de localStorage de forma segura
  getItem: (key: string): string | null => {
    // Verificar que estamos en el navegador (no en servidor)
    if (typeof window === 'undefined') return null;
    try {
      // Intentar obtener el valor
      return localStorage.getItem(key);
    } catch (e) {
      // Si hay error (localStorage deshabilitado, etc), retornar null
      return null;
    }
  },

  // Guardar un valor en localStorage de forma segura
  setItem: (key: string, value: string): void => {
    // Verificar que estamos en el navegador (no en servidor)
    if (typeof window === 'undefined') return;
    try {
      // Intentar guardar el valor
      localStorage.setItem(key, value);
    } catch (e) {
      // Si hay error (localStorage lleno, deshabilitado, etc), ignorar silenciosamente
    }
  },

  // Eliminar un valor de localStorage de forma segura
  removeItem: (key: string): void => {
    // Verificar que estamos en el navegador (no en servidor)
    if (typeof window === 'undefined') return;
    try {
      // Intentar eliminar el valor
      localStorage.removeItem(key);
    } catch (e) {
      // Si hay error, ignorar silenciosamente
    }
  }
};

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

// Tipo que define la estructura de una membresía de usuario en una organización
export type Membership = {
  org_id: string;                                    // ID de la organización
  role: 'owner' | 'admin' | 'employee' | 'viewer'; // Rol del usuario en esa org
  is_primary?: boolean;                             // Si es la organización principal
};

// Tipo que define la estructura del usuario en el contexto de autenticación
export type User = {
  id: string;                     // ID único del usuario
  email?: string | null;          // Email del usuario
  memberships: Membership[];       // Lista de organizaciones a las que pertenece
  current_org_id?: string;        // ID de la organización actualmente seleccionada
  isNewUser?: boolean;            // Flag para saber si es un usuario nuevo
};

// Tipo que define todos los valores disponibles en el contexto de autenticación
type AuthContextValue = {
  user: User | null;                                                           // Usuario actual (null si no está autenticado)
  session: Session | null;                                                     // Sesión de Supabase actual
  loading: boolean;                                                            // Flag para saber si se está cargando (restaurando sesión)
  isDemo: boolean;                                                             // Flag que indica si se está en modo demostración
  signIn: (email: string, password: string) => Promise<void>;                 // Función para iniciar sesión
  signInWithGoogle: () => Promise<void>;                                       // Función para iniciar sesión con Google OAuth
  signUp: (email: string, password: string, signupToken?: string) => Promise<void>; // Función para registrarse
  signInAsDemo: () => void;                                                    // Función para iniciar sesión como demostración
  signOut: () => Promise<void>;                                                // Función para cerrar sesión
  switchOrganization: (org_id: string) => void;                               // Función para cambiar de organización
  currentOrgId: string | null;                                                 // ID de la organización actual
  currentRole: string | null;                                                  // Rol del usuario en la organización actual
  createOrganization: (orgData: { name: string; salonName: string; salonAddress?: string; salonPhone?: string }) => Promise<void>; // Función para crear nueva organización
  sendMagicLink: (email: string) => Promise<void>;                            // Función para enviar link mágico para iniciar sesión
  resetPassword: (email: string) => Promise<void>;                            // Función para solicitar recuperación de contraseña
  updatePassword: (newPassword: string) => Promise<void>;                     // Función para actualizar contraseña
  claimInvitation: (token: string) => Promise<{ organization_id: string; role: string }>; // Función para reclamar una invitación a una org
};

// Crear el contexto de autenticación que será compartido en toda la aplicación
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// CONSTANTES DE ALMACENAMIENTO
// ============================================================================
// Claves que usamos para guardar datos en localStorage
// Esto centraliza los nombres para evitar errores de tipeo
const STORAGE_KEYS = {
  session: 'sb-session',           // Llave para guardar la sesión actual
  currentOrg: 'sb-current-org',     // Llave para guardar la org actualmente seleccionada
  selectedSalon: 'sb-selected-salon', // Llave para guardar el salón actualmente seleccionado
} as const;

// ============================================================================
// HELPER: withTimeout
// ============================================================================
// Envuelve una promise con un timeout para evitar que se quede bloqueada indefinidamente
// Si la promise no resuelve en el tiempo especificado, lanza un error
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

// ============================================================================
// PROVEEDOR DE AUTENTICACIÓN - AuthProvider
// ============================================================================
// Componente que envuelve toda la aplicación para proporcionar contexto de autenticación
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // =========================================================================
  // ESTADO LOCAL DEL PROVEEDOR
  // =========================================================================
  
  // Estado: usuario actualmente autenticado (null si no está logueado)
  const [user, setUser] = useState<User | null>(null);
  
  // Estado: sesión de Supabase actual (contiene token JWT, etc)
  const [session, setSession] = useState<Session | null>(null);
  
  // Estado: indica si estamos cargando (restaurando sesión al cargar la página)
  const [loading, setLoading] = useState(true);
  
  // Ref para user para usar en listeners sin dependencias
  const userRef = useRef<User | null>(null);
  
  // Hook de Next.js para navegar entre páginas
  const router = useRouter();
  
  // Actualizar ref cuando user cambie
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  
  // Calcular si estamos en modo demo (ya sea por flag o porque es el usuario demo)
  const isDemo = useMemo(() => {
    const isDemoUser = user?.id === DEMO_USER_ID;
    return isDemoModeFlag || isDemoUser;
  }, [user?.id]);

  // =========================================================================
  // FUNCIÓN: fetchUserMemberships
  // =========================================================================
  // Obtiene las membresías (organizaciones) del usuario desde la base de datos
  // Esto define a qué organizaciones pertenece el usuario y qué roles tiene
  const fetchUserMemberships = useCallback(async (userId: string, authUser: SupabaseUser): Promise<string | null> => {
    // En modo demo, no hacer queries reales a la BD, solo devolver null
    if (isDemoModeFlag) {
      return null;
    }

    try {
      // Obtener el perfil del usuario para ver si tiene una org favorita guardada
      // Envolver con timeout de 10 segundos para evitar bloqueo infinito
      let profile: any = null;
      try {
        const profileResult = await withTimeout(
          supabase
            .from('profiles')
            .select('raw_app_meta_data')
            .eq('id', userId)
            .single(),
          10000
        );
        profile = profileResult.data;
      } catch (profileError) {
        // Si falla la query de profiles, continuar sin profile (no es crítico)
        console.warn('Error al obtener perfil (no crítico):', profileError);
      }

      // Obtener todas las membresías (organizaciones) del usuario
      // Envolver con timeout de 10 segundos para evitar bloqueo infinito
      let memberships: any[] | null = null;
      let error: any = null;
      try {
        const membershipsResult = await withTimeout(
          supabase
            .from('memberships')
            .select('org_id, role, is_primary')
            .eq('user_id', userId),
          10000
        );
        memberships = membershipsResult.data;
        error = membershipsResult.error;
      } catch (membershipsError) {
        // Si falla por timeout u otro error, tratar como error
        error = membershipsError;
        console.error('Error al obtener membresías:', membershipsError);
      }

      // Si hay error al obtener membresías
      if (error) {
        // Loguear el error
        console.error('Error al obtener membresías:', error);
        // Crear un usuario sin membresías (usuario nuevo)
        setUser({
          id: authUser.id,
          email: authUser.email,
          memberships: [],
          isNewUser: true  // Marcar como usuario nuevo
        });
        return null;
      }

      // Determinar si es un usuario nuevo (no tiene membresías)
      const isNewUser = !memberships || memberships.length === 0;
      
      // Buscar la membresía primaria (si existe) o usar la primera
      const primaryOrg = memberships?.find(m => m.is_primary) || memberships?.[0];

      // Determinar cuál debe ser la organización actual:
      // 1. Usar la que estaba guardada en el perfil (current_org_id)
      // 2. Si no, usar la organización primaria
      // 3. Si no, usar la primera membresía
      const savedOrgId = profile?.raw_app_meta_data?.current_org_id;
      const currentOrgId = savedOrgId || primaryOrg?.org_id;

      // Construir el objeto de usuario con toda la información
      const userData: User = {
        id: authUser.id,                  // ID del usuario
        email: authUser.email,            // Email del usuario
        memberships: memberships || [],   // Lista de orgs a las que pertenece
        current_org_id: currentOrgId,     // Org actualmente seleccionada
        isNewUser,                        // Flag de usuario nuevo
      };

      // Guardar el usuario en el estado
      setUser(userData);
      
      // Guardar la org actual en localStorage para persistencia
      if (currentOrgId) {
        safeLocalStorage.setItem(STORAGE_KEYS.currentOrg, currentOrgId);
      } else {
        safeLocalStorage.removeItem(STORAGE_KEYS.currentOrg);
      }
      
      // Retornar la org actual
      return currentOrgId || null;
    } catch (e) {
      // Si hay error general
      console.error('Error al construir contexto de usuario:', e);
      // Limpiar el estado
      setUser(null);
      safeLocalStorage.removeItem(STORAGE_KEYS.currentOrg);
      return null;
    }
  }, []);

  // =========================================================================
  // FUNCIÓN: handleSignedOut
  // =========================================================================
  // Limpia toda la sesión y redirige al login
  const handleSignedOut = useCallback(() => {
    // Limpiar datos de localStorage
    safeLocalStorage.removeItem(STORAGE_KEYS.session);      // Eliminar sesión
    safeLocalStorage.removeItem(STORAGE_KEYS.currentOrg);   // Eliminar org actual
    safeLocalStorage.removeItem(STORAGE_KEYS.selectedSalon); // Eliminar salón actual
    
    // Limpiar estado
    setUser(null);        // No hay usuario
    setSession(null);     // No hay sesión
    
    // Redirigir a login
    router.push('/login');
  }, [router]);

  // =========================================================================
  // FUNCIÓN: handleSignedIn
  // =========================================================================
  // Maneja el evento cuando un usuario inicia sesión correctamente
  const handleSignedIn = useCallback(async (newSession: Session | null) => {
    try {
      // Mostrar estado de carga mientras procesamos
      setLoading(true);

      // Si no hay sesión válida, tratar como signed out
      if (!newSession?.user) {
        handleSignedOut();
        return;
      }

      // Guardar la sesión en estado
      setSession(newSession);
      
      // Guardar la sesión en localStorage para persistencia
      safeLocalStorage.setItem(STORAGE_KEYS.session, JSON.stringify(newSession));
      
      // Obtener las membresías (organizaciones) del usuario
      // Si esto falla, aún así continuamos para no bloquear la UI
      try {
        await fetchUserMemberships(newSession.user.id, newSession.user as SupabaseUser);
      } catch (membershipsError) {
        // Si falla fetchUserMemberships, crear usuario mínimo para que no se quede bloqueado
        console.error('Error al obtener membresías (continuando con usuario mínimo):', membershipsError);
        setUser({
          id: newSession.user.id,
          email: newSession.user.email,
          memberships: [],
          isNewUser: true
        });
      }
      
      // Redirigir al dashboard
      router.push('/dashboard');
    } catch (e) {
      // Si hay error general, loguearlo pero aún así limpiar loading
      console.error('Error en handleSignedIn:', e);
      // Aún así, setear usuario mínimo si tenemos sesión
      if (newSession?.user) {
        setUser({
          id: newSession.user.id,
          email: newSession.user.email,
          memberships: [],
          isNewUser: true
        });
        setSession(newSession);
      }
    } finally {
      // SIEMPRE marcar que terminó la carga (incluso si falló)
      setLoading(false);
    }
  }, [handleSignedOut, router, fetchUserMemberships]);

  // =========================================================================
  // REFS: Para mantener referencias estables a las funciones callbacks
  // =========================================================================
  // Usamos refs para evitar que el listener de onAuthStateChange se re-instale
  // cada vez que handleSignedIn o handleSignedOut cambien
  const handleSignedInRef = useRef(handleSignedIn);
  const handleSignedOutRef = useRef(handleSignedOut);

  // Actualizar las refs cuando las funciones cambien
  useEffect(() => {
    handleSignedInRef.current = handleSignedIn;
    handleSignedOutRef.current = handleSignedOut;
  }, [handleSignedIn, handleSignedOut]);

  // =========================================================================
  // EFECTO: Restaurar sesión y escuchar cambios de autenticación
  // =========================================================================
  // Este efecto se ejecuta cuando el componente se monta
  // Se encarga de:
  // 1. Restaurar la sesión si la app se refresca
  // 2. Escuchar cambios de autenticación en Supabase
  useEffect(() => {
    // Flag para evitar actualizar estado en componente desmontado
    let isMounted = true;
    
    // Función async para restaurar la sesión
    const restoreSession = async () => {
      // ===================================================================
      // PASO 1: Intentar restaurar usuario demo del localStorage
      // ===================================================================
      // Si la app se cierra y se abre de nuevo, el usuario demo sigue logueado
      const storedSession = safeLocalStorage.getItem(STORAGE_KEYS.session);
      if (storedSession) {
        try {
          // Parsear el JSON guardado
          const parsedSession = JSON.parse(storedSession);
          // Si es la sesión del usuario demo
          if (parsedSession?.user?.id === DEMO_USER_ID) {
            // Es una sesión de demo guardada, restaurarla
            const currentOrg = safeLocalStorage.getItem(STORAGE_KEYS.currentOrg) || DEMO_ORG_ID;
            if (isMounted) {
              setUser({
                id: DEMO_USER_ID,
                email: DEMO_USER_EMAIL,
                memberships: [{ org_id: currentOrg, role: 'owner' }],
                current_org_id: currentOrg,
              });
              setSession(null);         // Demo no tiene sesión real
              setLoading(false);        // Fin de la carga
            }
            return;  // Salir, no hacer más cosas
          }
        } catch (e) {
          // Si no es JSON válido, continuar con la lógica normal (ignorar error)
        }
      }

      // ===================================================================
      // PASO 2: En modo demo, no restaurar sesiones reales
      // ===================================================================
      if (isDemoModeFlag) {
        if (isMounted) setLoading(false);  // Fin de la carga
        return;  // Salir
      }

      try {
        // =================================================================
        // PASO 3: Obtener la sesión actual de Supabase
        // =================================================================
        // Envolver con timeout de 10 segundos para evitar bloqueo infinito
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          10000
        );
        const { data: { session: activeSession } } = sessionResult;

        if (isMounted && activeSession?.user) {
          // Si hay sesión válida, usarla
          await handleSignedInRef.current(activeSession);
        } else if (isMounted) {
          // Si no hay sesión, limpiar estado
          setUser(null);
          setSession(null);
        }
      } catch (e) {
        // Error al obtener la sesión (puede ser timeout, CORS, red lenta, etc.)
        console.error('Error al restaurar sesión:', e);
        // Asegurar que siempre limpiamos el estado si falla
        if (isMounted) {
          setUser(null);
          setSession(null);
        }
      } finally {
        // Siempre marcar que terminó la carga (incluso si falló)
        if (isMounted) setLoading(false);
      }
    };

    // Ejecutar la función de restauración
    restoreSession();

    // =====================================================================
    // Escuchar cambios en el estado de autenticación de Supabase
    // =====================================================================
    // Supabase nos avisa cuando:
    // - Usuario inicia sesión (SIGNED_IN)
    // - Usuario cierra sesión (SIGNED_OUT)
    // - Token se refresca (TOKEN_REFRESHED)
    const { data: listener } = isDemoModeFlag
      ? // En modo demo, crear un listener dummy (que no hace nada)
        ({ subscription: { unsubscribe: () => {} } } as any)
      : // En modo real, escuchar cambios reales de Supabase
        supabase.auth.onAuthStateChange(async (event, newSession) => {
          // Si el componente se desmontó, no hacer nada
          if (!isMounted) return;
          
          // Si el usuario cerró sesión
          if (event === 'SIGNED_OUT') {
            handleSignedOutRef.current();
          } 
          // Si el usuario inició sesión o el token se refrescó
          else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await handleSignedInRef.current(newSession ?? null);
          }
        });

    // =====================================================================
    // Escuchar cambios de visibilidad de la pestaña
    // =====================================================================
    // Si el usuario cambia de pestaña y vuelve, verificar que la sesión sigue válida
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isDemoModeFlag) {
        // Solo verificar si ya tenemos user, para evitar loops
        if (!isMounted || !userRef.current) return;
        
        // Validar que la sesión de Supabase sigue vigente
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!isMounted) return;
          if (!session && userRef.current) {
            // La sesión expiró pero tenemos user en estado local
            console.warn('Sesión expirada al volver a la pestaña');
            handleSignedOutRef.current();
          } else if (session && !userRef.current) {
            // Tenemos sesión pero perdimos el user, restaurarlo
            handleSignedInRef.current(session);
          }
        }).catch((error) => {
          console.error('Error al verificar sesión al volver a la pestaña:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // =====================================================================
    // LIMPIEZA: cuando el componente se desmonta
    // =====================================================================
    return () => {
      // Marcar el componente como desmontado
      isMounted = false;
      // Desuscribirse de los cambios de autenticación
      listener?.subscription?.unsubscribe?.();
      // Quitar listener de visibilidad
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);  // Sin dependencias: el efecto se ejecuta solo una vez

  // =========================================================================
  // FUNCIÓN: signIn
  // =========================================================================
  // Inicia sesión con email y contraseña
  const signIn = async (email: string, password: string): Promise<void> => {
    // En modo demo, no permitir iniciar sesión real
    if (isDemoModeFlag) {
      throw new Error('Modo demo: usa "Iniciar Demo" para probar la aplicación');
    }

    // Llamar a Supabase para iniciar sesión
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // Si hay error, lanzarlo
    if (error) {
      throw error;
    }

    // Si no hay sesión en la respuesta, error
    if (!data.session) {
      throw new Error('No se pudo iniciar sesión. Intenta de nuevo.');
    }

    // El evento 'SIGNED_IN' de onAuthStateChange se encargará del resto
    // No modificamos loading aquí porque handleSignedIn lo maneja
  };

  // =========================================================================
  // FUNCIÓN: signInWithGoogle
  // =========================================================================
  // Inicia sesión con Google OAuth
  const signInWithGoogle = async (): Promise<void> => {
    // En modo demo, no permitir iniciar sesión real
    if (isDemoModeFlag) {
      throw new Error('Modo demo: usa "Iniciar Demo" para probar la aplicación');
    }

    // Determinar la URL de redirección
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

    // Llamar a Supabase para iniciar sesión con Google
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    // Si hay error, lanzarlo
    if (error) {
      throw error;
    }

    // El navegador será redirigido a Google y luego volverá al callback
    // El callback manejará la sesión automáticamente
  };

  // =========================================================================
  // FUNCIÓN: signUp
  // =========================================================================
  // Registra un nuevo usuario con email y contraseña
  const signUp = async (email: string, password: string, signupToken?: string): Promise<void> => {
    // En modo demo, no permitir registrarse real
    if (isDemoModeFlag) {
      throw new Error('Modo demo: usa "Iniciar Demo" para probar la aplicación');
    }

    try {
      // Mostrar estado de carga
      setLoading(true);

      // Llamar a Supabase para crear nuevo usuario
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // URL a la que redirigir después de confirmar email
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
          // Si hay un token de invitación, incluirlo en los datos
          data: signupToken ? { invite_token: signupToken } : undefined,
        },
      });

      // Si hay error, lanzarlo
      if (error) {
        throw error;
      }

      // ===================================================================
      // Si hay sesión inmediata y token de invitación
      // ===================================================================
      if (data.session && signupToken) {
        try {
          // Reclamar la invitación automáticamente
          const { data: claimData, error: claimError } = await supabase.rpc('claim_invitation', { p_token: signupToken });
          
          if (claimError) {
            throw claimError;
          }

          // Si el claim fue exitoso, refrescar las membresías del usuario
          if (claimData && data.session.user) {
            // Esperar un momento para que la BD procese la inserción
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Refrescar las membresías para actualizar el estado del usuario
            await fetchUserMemberships(data.session.user.id, data.session.user);
            
            // Si hay organización_id, establecerla como current_org_id
            if (claimData.organization_id) {
              await supabase
                .from('profiles')
                .update({ raw_app_meta_data: { current_org_id: claimData.organization_id } })
                .eq('id', data.session.user.id);
              
              // Actualizar el usuario en memoria también
              setUser(prev => prev ? {
                ...prev,
                current_org_id: claimData.organization_id,
                isNewUser: false // Ya no es usuario nuevo, tiene membresía
              } : null);
            }
          }
        } catch (claimError) {
          // Si falla el claim, lanzar error para que el usuario sepa
          console.error('Error reclamando invitación:', claimError);
          throw new Error('No se pudo reclamar la invitación. Verifica que el token sea válido.');
        }
      }

      // ===================================================================
      // Si no hay token, el usuario debe crear su propia organización
      // a través del onboarding modal (no crear automáticamente)
      // ===================================================================
    } finally {
      // Siempre terminar la carga
      setLoading(false);
    }
  };

  // =========================================================================
  // FUNCIÓN: signInAsDemo
  // =========================================================================
  // Inicia sesión como usuario de demostración (sin usar Supabase)
  const signInAsDemo = () => {
    // Crear usuario demo en memoria
    setUser({
      id: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      memberships: [{ org_id: DEMO_ORG_ID, role: 'owner' }],
      current_org_id: DEMO_ORG_ID,
    });
    
    // No hay sesión real en demo
    setSession(null);
    
    // Guardar en localStorage para que persista al refrescar
    safeLocalStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ user: { id: DEMO_USER_ID, email: DEMO_USER_EMAIL } }));
    safeLocalStorage.setItem(STORAGE_KEYS.currentOrg, DEMO_ORG_ID);
    safeLocalStorage.removeItem(STORAGE_KEYS.selectedSalon);
    
    // Redirigir al dashboard
    router.push('/dashboard');
  };

  // =========================================================================
  // FUNCIÓN: signOut
  // =========================================================================
  // Cierra sesión del usuario actual
  const signOut = async (): Promise<void> => {
    // Si es modo demo o usuario demo, solo limpiar (no hacer signout en Supabase)
    if (isDemo) {
      handleSignedOut();
      return;
    }

    try {
      // Llamar a Supabase para cerrar sesión (invalida token)
      await supabase.auth.signOut();
      // Limpiar estado local
      handleSignedOut();
    } catch (error) {
      // Si hay error en Supabase, igual limpiar localmente
      console.error('Error al cerrar sesión:', error);
      handleSignedOut();
    }
  };

  // =========================================================================
  // FUNCIÓN: sendMagicLink
  // =========================================================================
  // Envía un link mágico al email para iniciar sesión sin contraseña
  const sendMagicLink = async (email: string): Promise<void> => {
    try {
      // Llamar a Supabase para enviar OTP (One Time Password) por email
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // URL a la que redirigir después de hacer clic en el link
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      // Si hay error, lanzarlo
      if (error) {
        throw error;
      }
    } catch (error: any) {
      // Lanzar el error para que se maneje en el componente
      throw error;
    }
  };

  // =========================================================================
  // FUNCIÓN: resetPassword
  // =========================================================================
  // Envía email para recuperar/resetear contraseña
  const resetPassword = async (email: string): Promise<void> => {
    try {
      // Determinar la URL de redirección (donde aterrizará el usuario al resetear)
      const redirect = typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined;
      
      // Llamar a Supabase para enviar email de reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });

      // Si hay error, lanzarlo
      if (error) {
        throw error;
      }
    } catch (e: any) {
      // Lanzar el error para que se maneje en el componente
      throw e;
    }
  };

  // =========================================================================
  // FUNCIÓN: updatePassword
  // =========================================================================
  // Actualiza la contraseña del usuario autenticado
  const updatePassword = async (newPassword: string): Promise<void> => {
    try {
      // Llamar a Supabase para actualizar la contraseña
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      // Si hay error, lanzarlo
      if (error) {
        throw error;
      }
    } catch (e: any) {
      // Lanzar el error para que se maneje en el componente
      throw e;
    }
  };

  // =========================================================================
  // FUNCIÓN: claimInvitation
  // =========================================================================
  // Reclama una invitación a una organización usando un token
  const claimInvitation = async (token: string): Promise<{ organization_id: string; role: string }> => {
    // En modo demo, no permitir reclamar invitaciones reales
    if (isDemoModeFlag) {
      throw new Error('Modo demo: no se pueden reclamar invitaciones reales');
    }

    try {
      // Llamar a función RPC en Supabase para reclamar la invitación
      const { data, error } = await supabase.rpc('claim_invitation', { p_token: token });

      // Si hay error, lanzarlo
      if (error) {
        throw error;
      }

      // ===================================================================
      // Refrescar memberships después de reclamar
      // ===================================================================
      if (session?.user) {
        // Esperar un momento para que la BD procese la inserción
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Obtener las membresías actualizadas
        await fetchUserMemberships(session.user.id, session.user);

        // Si se reclamó una invitación y se obtuvo una nueva org
        if (data.organization_id) {
          // Guardar esa org como la current_org_id en el perfil del usuario
          await supabase
            .from('profiles')
            .update({ raw_app_meta_data: { current_org_id: data.organization_id } })
            .eq('id', session.user.id);
          
          // Actualizar el usuario en memoria para que no sea considerado nuevo
          setUser(prev => prev ? {
            ...prev,
            current_org_id: data.organization_id,
            isNewUser: false // Ya tiene membresía, no es nuevo
          } : null);
        }
      }

      // Retornar los datos de la invitación reclamada
      return data;
    } catch (e: any) {
      // Lanzar el error para que se maneje en el componente
      throw e;
    }
  };

  // =========================================================================
  // FUNCIÓN: switchOrganization
  // =========================================================================
  // Cambia la organización actualmente seleccionada
  const switchOrganization = async (org_id: string) => {
    // Solo funciona si hay un usuario autenticado
    if (user) {
      // En modo demo, solo guardar en localStorage (no en BD)
      if (isDemo) {
        // Guardar la nueva org en localStorage
        safeLocalStorage.setItem(STORAGE_KEYS.currentOrg, org_id);
        // Actualizar el usuario en memoria
        setUser({ ...user, current_org_id: org_id });
        // Limpiar salón seleccionado al cambiar de org
        safeLocalStorage.removeItem(STORAGE_KEYS.selectedSalon);
        return;
      }
      
      // En modo real, guardar en la BD para que persista
      // Actualizar el perfil del usuario con la nueva org actual
      await supabase
        .from('profiles')
        .update({ raw_app_meta_data: { current_org_id: org_id } })
        .eq('id', user.id);

      // Guardar también en localStorage
      safeLocalStorage.setItem(STORAGE_KEYS.currentOrg, org_id);
      // Actualizar el usuario en memoria
      setUser({ ...user, current_org_id: org_id });
      // Limpiar salón seleccionado al cambiar de org
      safeLocalStorage.removeItem(STORAGE_KEYS.selectedSalon);
    }
  };

  // =========================================================================
  // FUNCIÓN: createOrganization
  // =========================================================================
  // Crea una nueva organización con salón
  const createOrganization = async (orgData: { name: string; salonName: string; salonAddress?: string; salonPhone?: string }): Promise<void> => {
    // Verificar que hay usuario autenticado
    if (!user) throw new Error('Usuario no autenticado');

    // Determinar si estamos en modo demo
    const isDemoUserMode = user.email === DEMO_USER_EMAIL || !session || isDemoModeFlag;
    
    if (isDemoUserMode) {
      // En modo demo, solo actualizar estado local
      setUser(prev => (prev ? { ...prev, isNewUser: false } : prev));
      safeLocalStorage.setItem(STORAGE_KEYS.currentOrg, DEMO_ORG_ID);
      
      // Disparar un evento personalizado que la app de demo escucha
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
      // Mostrar estado de carga
      setLoading(true);

      // ===================================================================
      // PASO 1: Crear la organización
      // ===================================================================
      const { data: org, error: orgError } = await supabase
        .from('orgs')
        .insert({ name: orgData.name })  // Insertar con el nombre
        .select()                         // Devolver los datos insertados
        .single();                        // Esperar un solo resultado

      // Si hay error al crear org
      if (orgError) throw orgError;

      // ===================================================================
      // PASO 2: Crear membresía del usuario en esa org como owner
      // ===================================================================
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          org_id: org.id,
          user_id: user.id,
          role: 'owner',           // El usuario es propietario
          is_primary: true,        // Es su org principal
        });

      // Si hay error al crear membresía
      if (membershipError) throw membershipError;

      // ===================================================================
      // PASO 3: Crear salón de prueba en esa org
      // ===================================================================
      const { error: salonError } = await supabase
        .from('salons')
        .insert({
          org_id: org.id,
          name: orgData.salonName,
          address: orgData.salonAddress,
          phone: orgData.salonPhone,
        });

      // Si hay error al crear salón
      if (salonError) throw salonError;

      // ===================================================================
      // PASO 4: Refrescar memberships del usuario en el contexto
      // ===================================================================
      await fetchUserMemberships(user.id, { id: user.id, email: user.email } as SupabaseUser);
    } finally {
      // Siempre terminar la carga
      setLoading(false);
    }
  };

  // =========================================================================
  // CALCULAR VALORES DERIVADOS
  // =========================================================================
  
  // ID de la organización actualmente seleccionada (null si no hay)
  const currentOrgId = user?.current_org_id || null;
  
  // Rol del usuario en la organización actual (null si no hay)
  const currentRole = user?.memberships?.find(m => m.org_id === currentOrgId)?.role || null;

  // =========================================================================
  // RETORNAR PROVEEDOR CON CONTEXTO
  // =========================================================================
  // Envolver el contenido de la app con el contexto y todos los valores
  return (
    <AuthContext.Provider value={{
      user,                    // Usuario actual
      session,                 // Sesión de Supabase
      loading,                 // Flag de carga
      isDemo,                  // Flag de modo demo
      signIn,                  // Función para iniciar sesión
      signInWithGoogle,        // Función para iniciar sesión con Google
      signUp,                  // Función para registrarse
      signInAsDemo,            // Función para iniciar sesión como demo
      signOut,                 // Función para cerrar sesión
      switchOrganization,      // Función para cambiar org
      currentOrgId,            // ID de org actual
      currentRole,             // Rol en org actual
      createOrganization,      // Función para crear org
      sendMagicLink,           // Función para enviar link mágico
      resetPassword,           // Función para resetear contraseña
      updatePassword,          // Función para actualizar contraseña
      claimInvitation          // Función para reclamar invitación
    }}>
      {/* Renderizar los componentes hijos con acceso al contexto */}
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// HOOK: useAuth
// ============================================================================
// Hook personalizado para acceder al contexto de autenticación desde cualquier componente
// Uso: const { user, signIn, signOut } = useAuth();
export const useAuth = () => {
  // Obtener el contexto actual
  const ctx = useContext(AuthContext);
  
  // Si no hay contexto, significa que se está usando fuera de AuthProvider
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  
  // Devolver el contexto
  return ctx;
};





