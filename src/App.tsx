import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, useTransition, useRef, useLayoutEffect } from "react";
import { Menu, Calendar, Home, Users, Settings, DollarSign, Building2, MapPin, LogOut, Sun, Moon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SalonCarousel } from "./components/SalonCarousel";
import { AppointmentCard, Appointment } from "./components/features/appointments/AppointmentCard";
import { AppointmentGroup } from "./components/features/appointments/AppointmentGroup";
import { turnosStore } from './stores/turnosStore';
import { AppointmentDialog } from "./components/features/appointments/AppointmentDialog";
import { AppointmentActionBar } from "./components/features/appointments/AppointmentActionBar";
import { FloatingQuickActions } from "./components/FloatingQuickActions";
import { FilterBar } from "./components/FilterBar";
import { ShortcutBanner } from "./components/ShortcutBanner";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./components/ui/sheet";
import { useIsMobile } from "./components/ui/use-mobile";
import { toastSuccess, toastError, toastWarning, toastInfo } from "./lib/toast";
import { Toaster } from "./components/ui/sonner";
import { useAuth } from "./contexts/AuthContext";
import type { User } from "./contexts/AuthContext";
import DemoDataBubble from "./components/DemoDataBubble";
import DemoWelcomeModal from "./components/DemoWelcomeModal";
import { useTurnos } from "./hooks/useTurnos";
import { useSalons as useDbSalons } from "./hooks/useSalons";
import { useEmployees } from "./hooks/useEmployees";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { OnboardingModal } from "./components/OnboardingModal";
import { PaymentLinkModal } from "./components/PaymentLinkModal";
import { LoadingView } from "./components/layout/LoadingView";
import { SidebarContent } from "./components/layout/SidebarContent";
import { PageContainer } from "./components/layout/PageContainer";
import { Card, CardContent } from "./components/ui/card";
import { SkeletonList } from "./components/ui/SkeletonLoader";
import type { Salon, SalonService } from "./types/salon";
import { sampleSalons } from "./constants/salons";
import { CommandPaletteProvider, CommandAction } from "./contexts/CommandPaletteContext";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "./components/ui/command";
import { applyTheme } from "./lib/theme";

// Lazy-loaded views
const HomeView = lazy(() => {
  const module = import("./components/views/HomeView");
  (window as any).__preloadedViews = (window as any).__preloadedViews || {};
  (window as any).__preloadedViews.home = module;
  return module;
});
const ClientsView = lazy(() => import("./components/sections/ClientsView"));
const FinancesView = lazy(() => import("./components/views/FinancesView"));
const SettingsView = lazy(() => import("./components/views/SettingsView"));
const SalonsManagementView = lazy(() => import("./components/views/SalonsManagementView"));
const OrganizationView = lazy(() => import("./components/views/OrganizationView"));

import { ProfileModal } from "./components/ProfileModal";

// ============================================================================
// CONSTANTES - Datos de demostración
// ============================================================================

// Tipo para demo appointments
interface DemoAppointment {
  id: string;
  clientName: string;
  service: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  stylist: string;
  salonId: string;
}

// Datos de ejemplo de turnos (importados desde constantes)
const sampleAppointments: DemoAppointment[] = [
  { id: "1", clientName: "Mía Delgado", service: "Keratina", date: "2025-10-30", time: "08:30", status: "confirmed", stylist: "Patricia Gómez", salonId: "3" },
  { id: "2", clientName: "Joaquín Blanco", service: "Barba y Cejas", date: "2025-10-30", time: "09:30", status: "confirmed", stylist: "Roberto Silva", salonId: "2" },
  { id: "3", clientName: "Valentina Castro", service: "Corte", date: "2025-10-30", time: "09:00", status: "confirmed", stylist: "María García", salonId: "1" },
  { id: "4", clientName: "Mateo Flores", service: "Coloración", date: "2025-10-30", time: "10:30", status: "pending", stylist: "Ana Martínez", salonId: "1" },
  { id: "5", clientName: "Isabella Romero", service: "Tratamiento Capilar", date: "2025-10-30", time: "11:00", status: "confirmed", stylist: "María García", salonId: "2" },
];

// Mapa para pre-cargar vistas
const viewPreloadMap: Record<string, () => void> = {
  home: () => { (window as any).__preloadedViews?.home; },
  clients: () => { import("./components/sections/ClientsView"); },
  finances: () => { import("./components/views/FinancesView"); },
  settings: () => { import("./components/views/SettingsView"); },
  salons: () => { import("./components/views/SalonsManagementView"); },
  organization: () => { import("./components/views/OrganizationView"); },
};

const NAVIGATION_DESCRIPTIONS: Record<string, string> = {
  home: "Ver el tablero principal",
  appointments: "Gestionar turnos y agenda",
  clients: "Administrar la base de clientes",
  organization: "Gestionar la organización y su equipo",
  salons: "Configurar locales y recursos",
  finances: "Revisar reportes financieros",
  settings: "Ajustar preferencias generales",
};

// ============================================================================
// COMPONENTE PRINCIPAL: App
// ============================================================================
export default function App() {
  // =========================================================================
  // AUTENTICACIÓN Y CONTEXTO
  // =========================================================================
  const { user, session, signOut, currentRole, currentOrgId, isDemo } = useAuth() as any;
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const [nextViewName, setNextViewName] = useState<string | null>(null);

  // =========================================================================
  // ESTADO LOCAL
  // =========================================================================
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedSalon, setSelectedSalon] = useState<string | null>(() => {
    if (typeof window === 'undefined') return 'all';
    try {
      const saved = localStorage.getItem('selectedSalon');
      return saved || 'all';
    } catch {
      return 'all';
    }
  });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollPositionRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  // unsyncedAppointments ya no es necesario - todo se sincroniza con turnosStore
  const [demoName, setDemoName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem('demo:name'); } catch { return null; }
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [stylistFilter, setStylistFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [activeNavItem, setActiveNavItem] = useState("home");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDemoWelcome, setShowDemoWelcome] = useState(false);
  const [prevUser, setPrevUser] = useState<User | null>(null);
  const [services, setServices] = useState<SalonService[]>([
    { id: 's1', name: 'Corte', price: 1200, durationMinutes: 30 },
    { id: 's2', name: 'Coloración', price: 3000, durationMinutes: 90 },
  ]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [viewActions, setViewActions] = useState<CommandAction[]>([]);

  const isMobile = useIsMobile();

  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);
  const handleSetActions = useCallback((actions: CommandAction[]) => {
    setViewActions(actions);
  }, []);
  const handleClearActions = useCallback(() => {
    setViewActions([]);
  }, []);

  const commandPaletteValue = useMemo(
    () => ({
      openPalette: openCommandPalette,
      closePalette: closeCommandPalette,
      setActions: handleSetActions,
      clearActions: handleClearActions,
    }),
    [openCommandPalette, closeCommandPalette, handleSetActions, handleClearActions],
  );

  const handleCommandSelect = useCallback(
    (action: CommandAction) => {
      action.onSelect?.();
      closeCommandPalette();
    },
    [closeCommandPalette],
  );

  // =========================================================================
  // DATOS REMOTOS (Supabase) - Usando useTurnos como fuente única de verdad
  // =========================================================================
  const { turnos: remoteTurnos, loading: loadingTurnos, createTurno, updateTurno, deleteTurno, setSelectedSalon: setTurnosSelectedSalon, turnosByDate, turnosByStatus } = useTurnos({
    salonId: selectedSalon === 'all' ? undefined : selectedSalon || undefined,
    enabled: !!session
  });
  const { salons: remoteSalons, createSalon: createRemoteSalon, updateSalon: updateRemoteSalon, deleteSalon: deleteRemoteSalon } = useDbSalons(
    currentOrgId ?? undefined,
    { enabled: !!session && !!currentOrgId }
  );
  const { employees } = useEmployees(currentOrgId ?? undefined, { enabled: !!session && !!currentOrgId && currentRole === 'employee' });

  // =========================================================================
  // REFRESH COORDINADO AL CAMBIAR ORGANIZACIÓN
  // =========================================================================
  useEffect(() => {
    // Los hooks de salons, employees y turnos se refrescan automáticamente por currentOrgId
    // No necesitamos refrescar manualmente ya que useTurnos se actualiza automáticamente
  }, [currentOrgId, session]);

  // =========================================================================
  // DATOS EFECTIVOS (Demo vs Real)
  // =========================================================================
  // Para modo demo: usar appointments locales
  // Para modo real: usar turnosStore directamente (no necesitamos effectiveAppointments)
  const effectiveSalons: Salon[] = isDemo ? salons : (remoteSalons as any);

  // =========================================================================
  // PERSISTIR Y PRE-SELECCIONAR SALÓN
  // =========================================================================
  // Persistir selectedSalon en localStorage
  useEffect(() => {
    if (selectedSalon && typeof window !== 'undefined') {
      try {
        localStorage.setItem('selectedSalon', selectedSalon);
      } catch {}
    }
  }, [selectedSalon]);

  // Pre-seleccionar primer salón disponible solo si no hay selección válida Y no es 'all'
  useEffect(() => {
    // Solo ejecutar si no hay selectedSalon (null o undefined), NO si es 'all'
    if (effectiveSalons.length > 0 && (selectedSalon === null || selectedSalon === undefined)) {
      // Si el salón guardado no existe en la lista, usar el primero
      const savedSalon = typeof window !== 'undefined' 
        ? localStorage.getItem('selectedSalon') 
        : null;
      
      if (savedSalon && savedSalon !== 'all' && effectiveSalons.some(s => s.id === savedSalon)) {
        // El salón guardado existe, mantenerlo
        setSelectedSalon(savedSalon);
        return;
      }
      
      // Si savedSalon es 'all', respetarlo
      if (savedSalon === 'all') {
        setSelectedSalon('all');
        return;
      }
      
      // Pre-seleccionar primer salón disponible solo si no hay selección guardada
      const firstSalon = effectiveSalons[0];
      if (firstSalon && (!selectedSalon || selectedSalon !== firstSalon.id)) {
        setSelectedSalon(firstSalon.id);
      }
    }
  }, [effectiveSalons, selectedSalon]);

  // =========================================================================
  // EFECTOS
  // =========================================================================
  useEffect(() => {
    if (isDemo && !demoName) setShowDemoWelcome(true);
  }, [isDemo, demoName]);

  // =========================================================================
  // ATAJOS DE TECLADO
  // =========================================================================
  useKeyboardShortcuts({
    onNewAppointment: () => {
      if (!dialogOpen && activeNavItem === 'appointments') {
        setEditingAppointment(null);
        setDialogOpen(true);
      }
    },
    onSearch: () => {
      // Focus en el input de búsqueda si existe
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="Buscar"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
    enabled: !dialogOpen && activeNavItem === 'appointments',
  });

  // Eliminar la lógica del welcome screen aquí - ahora se maneja en LoginView
  // Mostrar toast de bienvenida cuando el usuario ingresa al dashboard
  const welcomeToastShownRef = useRef(false);
  useEffect(() => {
    if (user && !prevUser && !welcomeToastShownRef.current) {
      // Usuario acaba de hacer login
      setPrevUser(user);
      welcomeToastShownRef.current = true;
      
      // Esperar a que los turnos se carguen antes de mostrar el toast
      const showWelcomeToast = () => {
        const userName = user?.email?.split('@')[0] || 'Usuario';
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        // Usar turnosStore para contar turnos pendientes de hoy
        const today = new Date().toISOString().split('T')[0];
        const todayTurnos = turnosStore.getByDate(today);
        const pendingCount = todayTurnos.filter(t => t.status === 'pending' || t.status === 'confirmed').length;
        
        // Mostrar toast completo
        toastSuccess(
          `Bienvenido ${userName}, son las ${hours}:${minutes}, hoy te esperan ${pendingCount} turno${pendingCount !== 1 ? 's' : ''}`,
          4000
        );
      };
      
      // Esperar un momento para que los turnos se carguen y se hidraten en el store
      // Verificar periódicamente hasta que haya datos o timeout
      let attempts = 0;
      const maxAttempts = 10;
      let toastShown = false;
      
      const checkInterval = setInterval(() => {
        const turnos = turnosStore.appointments;
        attempts++;
        
        if (turnos.length > 0 || attempts >= maxAttempts) {
          clearInterval(checkInterval);
          if (!toastShown) {
            toastShown = true;
            showWelcomeToast();
          }
        }
      }, 300);
      
      // Timeout de seguridad
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        if (!toastShown) {
          toastShown = true;
          showWelcomeToast();
        }
      }, 3000);
      
      // Cleanup: limpiar timers si el componente se desmonta o cambia el usuario
      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
      };
    } else if (!user) {
      setPrevUser(null);
      welcomeToastShownRef.current = false;
    }
  }, [user, prevUser, isDemo]);

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    sync();
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent<'light' | 'dark'>).detail;
        if (detail === 'light' || detail === 'dark') setTheme(detail);
        else sync();
      } catch { sync(); }
    };
    window.addEventListener('theme:changed', handler as EventListener);
    return () => window.removeEventListener('theme:changed', handler as EventListener);
  }, []);

  useEffect(() => {
    if (!isDemo) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ salonName?: string; salonAddress?: string; salonPhone?: string }>).detail || {};
      const name = detail.salonName && detail.salonName.trim().length > 0 ? detail.salonName.trim() : 'Mi Peluquería';
      const address = detail.salonAddress && detail.salonAddress.trim().length > 0 ? detail.salonAddress.trim() : '';
      const phone = detail.salonPhone && detail.salonPhone.trim().length > 0 ? detail.salonPhone.trim() : '';

      setSalons((prev) => {
        if (prev.length >= 1) return prev;
        const id = Date.now().toString();
        const image = 'https://images.unsplash.com/photo-1562322140-8baeececf3df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
        setSelectedSalon(id);
        return [...prev, { id, name, address, image, phone, email: '', notes: '', openingHours: '', staff: [], services: [] }];
      });
    };
    window.addEventListener('demo:create-org', handler as EventListener);
    return () => window.removeEventListener('demo:create-org', handler as EventListener);
  }, [isDemo]);

  // Sincronizar selectedAppointment cuando cambian los turnos en el store
  useEffect(() => {
    if (selectedAppointment && !isDemo) {
      const updated = turnosStore.appointments.find(apt => apt.id === selectedAppointment.id);
      if (updated) {
        const updatedAppointment = {
          id: updated.id,
          clientName: updated.clientName,
          service: updated.service,
          date: updated.date,
          time: updated.time,
          status: updated.status,
          stylist: updated.stylist,
          salonId: updated.salonId,
          notes: updated.notes,
          created_by: updated.created_by,
        } as Appointment;
        if (JSON.stringify(updatedAppointment) !== JSON.stringify(selectedAppointment)) {
          setSelectedAppointment(updatedAppointment);
        }
      }
    } else if (selectedAppointment && isDemo) {
      const updated = appointments.find(apt => apt.id === selectedAppointment.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedAppointment)) {
        setSelectedAppointment(updated);
      }
    }
  }, [turnosStore.appointments, appointments, selectedAppointment?.id, isDemo]);

  useEffect(() => {
    // Solo mostrar onboarding si NO hay membresía aún ni org seleccionada.
    // Previene flicker cuando el usuario reclamó invitación y ya tiene org.
    const noMemberships = !user?.memberships || user.memberships.length === 0;
    const shouldShowOnboarding = !!user?.isNewUser &&
                                 !showOnboarding &&
                                 noMemberships &&
                                 currentRole !== 'employee' &&
                                 !isDemo &&
                                 !currentOrgId; // si ya hay org, no mostrar

    if (shouldShowOnboarding) {
      setShowOnboarding(true);
    }
  }, [user?.isNewUser, user?.memberships, currentRole, showOnboarding, isDemo, currentOrgId]);

  // El empleado no necesita completar ningún perfil - el owner se encarga de todo

  // localStorage para unsyncedAppointments ya no es necesario - todo se sincroniza con turnosStore

  // =========================================================================
  // CALLBACKS
  // =========================================================================
  const handleSaveDemoName = useCallback((name: string) => {
    setDemoName(name);
    try { localStorage.setItem('demo:name', name); } catch {}
    setShowDemoWelcome(false);
    try { setShowOnboarding(true); } catch {}
  }, []);

  const handleSelectAppointment = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowQuickActions(false);
  }, []);

  const handleSelectSalon = useCallback((salonId: string, salonName: string) => {
    if (scrollContainerRef.current) {
      lastScrollPositionRef.current = scrollContainerRef.current.scrollTop;
      shouldRestoreScrollRef.current = true;
    }
    setSelectedSalon(salonId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('selectedSalon', salonId);
      } catch {}
    }
    toastSuccess(`${salonName} seleccionado`);
  }, []);

  useLayoutEffect(() => {
    if (!shouldRestoreScrollRef.current) {
      return;
    }

    const node = scrollContainerRef.current;
    if (!node) {
      shouldRestoreScrollRef.current = false;
      return;
    }

    node.scrollTop = lastScrollPositionRef.current;
    shouldRestoreScrollRef.current = false;
  }, [selectedSalon]);

  const handleLogout = async () => {
    // Mostrar toast de despedida antes de cerrar sesión
    const userName = user?.email?.split('@')[0] || 'Usuario';
    toastError(`¡Hasta pronto ${userName}!`);
    
    // Esperar un momento antes de cerrar sesión
    setTimeout(async () => {
    await signOut();
    setActiveNavItem("home");
    setSelectedSalon(null);
    setSelectedAppointment(null);
    setShowQuickActions(false);
    // Limpiar localStorage ya no es necesario - todo se sincroniza con turnosStore
      // Redirigir al login después de cerrar sesión
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }, 500);
  };

  const handleSaveAppointment = useCallback(async (appointmentData: Partial<Appointment>) => {
    try {
      // Validar campos requeridos
      if (!appointmentData.clientName || !appointmentData.date || !appointmentData.time) {
        toastError('Por favor completa todos los campos requeridos');
        return;
      }

      // Determinar el salón a usar: si viene en appointmentData, usarlo; si no, usar selectedSalon si no es 'all'; si es 'all', usar el primer salón disponible
      let salonToUse: string | undefined = appointmentData.salonId;
      if (!salonToUse || salonToUse === 'all') {
        salonToUse = selectedSalon !== 'all' && selectedSalon ? selectedSalon : undefined;
        // Si aún no hay salón y hay salones disponibles, usar el primero
        if (!salonToUse && salons && salons.length > 0) {
          salonToUse = salons[0].id;
        }
      }
      
      if (!salonToUse) {
        toastError('Debes seleccionar una peluquería');
        return;
      }

      if (isDemo) {
        if (editingAppointment) {
          setAppointments((prev) =>
            prev.map((apt) => (apt.id === editingAppointment.id ? { ...apt, ...appointmentData } : apt))
          );
          setEditingAppointment(null);
          toastSuccess("Turno actualizado correctamente");
        } else {
          const newAppointment: Appointment = {
            id: Date.now().toString(),
            clientName: appointmentData.clientName || "",
            service: appointmentData.service || "",
            date: appointmentData.date || "",
            time: appointmentData.time || "",
            status: appointmentData.status || "pending",
            stylist: appointmentData.stylist || "",
            salonId: salonToUse,
          };
          setAppointments((prev) => [newAppointment, ...prev]);
          toastSuccess("Turno creado correctamente");
        }
        return;
      }
      
      // Remote - Usar useTurnos
      
      if (editingAppointment) {
        await updateTurno(editingAppointment.id, {
          ...appointmentData,
          salonId: salonToUse,
        } as any);
        setEditingAppointment(null);
        toastSuccess("Turno actualizado correctamente");
      } else {
        await createTurno({
          ...appointmentData,
          salonId: salonToUse,
        } as any);
        toastSuccess("Turno creado correctamente");
      }
    } catch (e: any) {
      console.error('Error al guardar turno:', e);
      toastError(e?.message || 'No se pudo guardar el turno');
    }
  }, [isDemo, editingAppointment, selectedSalon, createTurno, updateTurno]);

  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setEditingAppointment(appointment);
    setDialogOpen(true);
  }, []);

  const handleCancelAppointment = useCallback(async (id: string) => {
    if (isDemo) {
      setAppointments((prev) => {
        const updated = prev.map((apt) =>
          apt.id === id ? { ...apt, status: "cancelled" as const } : apt
        );
        const updatedAppointment = updated.find(apt => apt.id === id);
        if (updatedAppointment && selectedAppointment?.id === id) {
          setSelectedAppointment(updatedAppointment);
        }
        return updated;
      });
      try { (await import('./stores/appointments')).appointmentsStore.updateStatus(id, 'cancelled' as any); } catch {}
      toastSuccess("Turno cancelado");
    } else {
      try {
        // Usar updateTurno que ya incluye todas las validaciones
        const updated = await updateTurno(id, { status: 'cancelled' as const } as any);
        if (updated) {
          setSelectedAppointment(updated as any);
          turnosStore.updateStatus(id, 'cancelled');
          toastSuccess("Turno cancelado correctamente");
        } else {
          toastError('No se pudo cancelar el turno');
        }
      } catch (e: any) {
        console.error('Error cancelling appointment:', e);
        const errorMessage = e?.message || 'No se pudo cancelar el turno';
        toastError(errorMessage);
      }
    }
  }, [isDemo, updateTurno, selectedAppointment]);

  const handleCompleteAppointment = useCallback(async (id: string) => {
    if (isDemo) {
      setAppointments((prev) => {
        const updated = prev.map((apt) =>
        apt.id === id ? { ...apt, status: "completed" as const } : apt
        );
        const updatedAppointment = updated.find(apt => apt.id === id);
        if (updatedAppointment && selectedAppointment?.id === id) {
          setSelectedAppointment(updatedAppointment);
        }
        return updated;
      });
      try { (await import('./stores/appointments')).appointmentsStore.updateStatus(id, 'completed' as any); } catch {}
      toastSuccess("Turno completado");
    } else {
      try {
        // Usar updateTurno que ya incluye todas las validaciones
        const updated = await updateTurno(id, { status: 'completed' as const } as any);
        if (updated) {
          setSelectedAppointment(updated as any);
          turnosStore.updateStatus(id, 'completed');
          // Disparar evento para refrescar comisiones
          window.dispatchEvent(new CustomEvent('appointment:completed', { detail: { appointmentId: id } }));
          toastSuccess("Turno completado correctamente");
        } else {
          toastError("No se pudo completar el turno");
        }
      } catch (error: any) {
        console.error('Error completing appointment:', error);
        const errorMessage = error?.message || "Error al completar el turno";
        toastError(errorMessage);
      }
    }
  }, [isDemo, updateTurno, selectedAppointment]);

  const handleDeleteAppointment = useCallback(async () => {
    if (!selectedAppointment) {
      toastError("No hay turno seleccionado para eliminar");
      return;
    }
    
    // Confirmar antes de eliminar
    const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar el turno de ${selectedAppointment.clientName}?`);
    if (!confirmed) return;
    
    if (isDemo) {
      setAppointments((prev) => prev.filter(apt => apt.id !== selectedAppointment.id));
      toastSuccess("Turno eliminado correctamente");
      setSelectedAppointment(null);
    } else {
      try {
        // Usar deleteTurno que ya incluye todas las validaciones
        await deleteTurno(selectedAppointment.id);
        toastSuccess("Turno eliminado correctamente");
        setSelectedAppointment(null);
      } catch (error: any) {
        console.error('Error deleting appointment:', error);
        const errorMessage = error?.message || "Error al eliminar el turno";
        toastError(errorMessage);
      }
    }
  }, [selectedAppointment, isDemo, deleteTurno]);

  const handleUpdateAppointment = useCallback(() => {
    let salonAppointments: Appointment[] = [];
    if (isDemo) {
      salonAppointments = !selectedSalon
        ? appointments
        : appointments.filter(apt => apt.salonId === selectedSalon);
    } else {
      const turnos = !selectedSalon
        ? turnosStore.appointments
        : turnosStore.appointments.filter(t => t.salonId === selectedSalon);
      salonAppointments = turnos.map(t => ({
        id: t.id,
        clientName: t.clientName,
        service: t.service,
        date: t.date,
        time: t.time,
        status: t.status,
        stylist: t.stylist,
        salonId: t.salonId,
        notes: t.notes,
        created_by: t.created_by,
      } as Appointment));
    }
    if (salonAppointments.length === 0) {
      toastError("No hay turnos para actualizar");
      return;
    }
    const lastAppointment = salonAppointments[0];
    setEditingAppointment(lastAppointment);
    setDialogOpen(true);
    setShowQuickActions(false);
  }, [appointments, selectedSalon, isDemo]);

  // Usar filtros del store cuando no es demo, usar filtrado local para demo
  const filteredAppointments = useMemo(() => {
    if (isDemo) {
      return appointments.filter((apt) => {
        if (selectedSalon && selectedSalon !== 'all' && apt.salonId !== selectedSalon) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            apt.clientName.toLowerCase().includes(query) ||
            apt.service.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }
        if (statusFilter !== "all" && apt.status !== statusFilter) return false;
        if (stylistFilter !== "all" && apt.stylist !== stylistFilter) return false;
        if (dateFilter !== "all") {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const aptDate = new Date(apt.date);
          aptDate.setHours(0, 0, 0, 0);
          if (dateFilter === "today") {
            if (aptDate.getTime() !== today.getTime()) return false;
          } else if (dateFilter === "tomorrow") {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (aptDate.getTime() !== tomorrow.getTime()) return false;
          } else if (dateFilter === "week") {
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            if (aptDate < today || aptDate > weekFromNow) return false;
          } else if (dateFilter === "month") {
            const monthFromNow = new Date(today);
            monthFromNow.setMonth(monthFromNow.getMonth() + 1);
            if (aptDate < today || aptDate > monthFromNow) return false;
          }
        }
        return true;
      });
    }
    
    // Para modo real, usar los filtros del store
    turnosStore.setFilters({
      salonId: selectedSalon === 'all' ? 'all' : selectedSalon || 'all',
      status: statusFilter as any,
      employeeId: stylistFilter === 'all' ? 'all' : stylistFilter,
      text: searchQuery || '',
      date: dateFilter === 'all' ? undefined : dateFilter,
    });
    
    return turnosStore.getFiltered() as any as Appointment[];
  }, [isDemo, appointments, selectedSalon, searchQuery, statusFilter, stylistFilter, dateFilter]);

  const handleAddSalon = useCallback(async (salonData: Omit<Salon, 'id'>) => {
    if (isDemo) {
      if (salons.length >= 1) {
        toastError('En modo demo solo se permite 1 peluquería');
        return;
      }
      const newSalon: Salon = {
        ...salonData,
        id: Date.now().toString(),
      };
      setSalons(prev => [...prev, newSalon]);
      return;
    }
    if (!currentOrgId) {
      throw new Error('Organización no seleccionada');
    }
    await createRemoteSalon({
      org_id: currentOrgId,
      name: salonData.name,
      address: salonData.address ?? '',
      phone: salonData.phone ?? '',
      active: true,
    });
  }, [isDemo, salons.length, currentOrgId, createRemoteSalon]);

  const handleEditSalon = useCallback(async (id: string, salonData: Partial<Salon>) => {
    if (isDemo) {
      setSalons(prev => prev.map(salon =>
        salon.id === id ? { ...salon, ...salonData } : salon
      ));
      return;
    }
    await updateRemoteSalon(id, {
      name: salonData.name,
      address: salonData.address,
      phone: salonData.phone,
    });
  }, [isDemo, updateRemoteSalon]);

  const handleDeleteSalon = useCallback(async (id: string) => {
    if (isDemo) {
      setSalons(prev => prev.filter(salon => salon.id !== id));
      if (selectedSalon === id) {
        setSelectedSalon(null);
      }
      return;
    }
    await deleteRemoteSalon(id);
    if (selectedSalon === id) {
      setSelectedSalon(null);
    }
  }, [isDemo, selectedSalon, deleteRemoteSalon]);

  // =========================================================================
  // DEFINICIONES DE NAVEGACIÓN
  // =========================================================================
  const today = new Date().toISOString().split('T')[0];
  const todayTurnos = turnosStore.getByDate ? turnosStore.getByDate(today) : [];
  const pendingToday = todayTurnos.filter(t => 
    (t.status === 'pending' || t.status === 'confirmed') &&
    (!selectedSalon || selectedSalon === 'all' || t.salonId === selectedSalon)
  ).length;
  const allNavItems = [
    { id: "home", label: "Inicio", icon: Home },
    { id: "appointments", label: pendingToday > 0 ? `Turnos (${pendingToday})` : "Turnos", icon: Calendar },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "organization", label: "Organización", icon: Building2 },
    { id: "salons", label: "Locales", icon: MapPin },
    { id: "finances", label: "Finanzas", icon: DollarSign },
    { id: "settings", label: "Configuración", icon: Settings },
  ];

  const viewNames: Record<string, string> = {
    home: "Inicio",
    appointments: "Turnos",
    clients: "Clientes",
    organization: "Organización",
    salons: "Locales",
    finances: "Finanzas",
    settings: "Configuración"
  };

  const navItems = useMemo(() => {
    const role = isDemo ? 'demo' : (currentRole ?? 'viewer');
    if (role === 'demo') return allNavItems;
    
    // Empleados pueden ver: Inicio, Turnos, Clientes, Organización (solo lectura)
    if (role === 'employee') {
      return allNavItems.filter(it => 
        ['home', 'appointments', 'clients', 'organization'].includes(it.id)
      );
    }
    
    // Solo owners pueden ver finanzas
    if (role === 'admin') {
      return allNavItems.filter(it => it.id !== 'finances');
    }
    
    // Owners ven todo
    return allNavItems;
  }, [currentRole, isDemo]);

  const navigateToView = useCallback((itemId: string) => {
    if (itemId === activeNavItem) return;
    try {
      viewPreloadMap[itemId]?.();
    } catch {}
    setNextViewName(viewNames[itemId] || itemId);
    setIsNavigating(true);
    startTransition(() => {
      setActiveNavItem(itemId);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set('view', itemId);
        window.history.replaceState({}, '', url.toString());
      }
      setTimeout(() => {
        setIsNavigating(false);
        setNextViewName(null);
      }, 2000);
    });
  }, [activeNavItem, viewNames, startTransition]);

  const moveView = useCallback((direction: "next" | "prev") => {
    if (!navItems.length) return;
    const ids = navItems.map((item) => item.id);
    const currentIndex = ids.indexOf(activeNavItem);
    if (currentIndex === -1) return;
    const nextIndex = direction === "next"
      ? (currentIndex + 1) % ids.length
      : (currentIndex - 1 + ids.length) % ids.length;
    const targetId = ids[nextIndex];
    if (targetId) {
      navigateToView(targetId);
    }
  }, [navItems, activeNavItem, navigateToView]);

  const navigationActions = useMemo<CommandAction[]>(() => {
    return navItems.map((item) => {
      const Icon = item.icon;
      return {
        id: `nav-${item.id}`,
        group: "Navegación",
        label: item.label,
        description: NAVIGATION_DESCRIPTIONS[item.id] || "Ir a la vista seleccionada",
        icon: <Icon className="size-4" aria-hidden="true" />,
        onSelect: () => navigateToView(item.id),
      } satisfies CommandAction;
    });
  }, [navItems, navigateToView]);

  const handleToggleTheme = useCallback(() => {
    const isCurrentlyDark = typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : theme === "dark";
    const nextTheme: "light" | "dark" = isCurrentlyDark ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<"light" | "dark">("theme:changed", { detail: nextTheme }));
    }
  }, [theme]);

  const systemActions = useMemo<CommandAction[]>(() => {
    const actions: CommandAction[] = [
      {
        id: "toggle-theme",
        group: "Preferencias",
        label: "Alternar tema (claro/oscuro)",
        description: "Cambia entre los modos claro y oscuro",
        shortcut: "Ctrl+Alt+T",
        icon: theme === "dark" ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />,
        onSelect: handleToggleTheme,
      },
    ];

    if (user) {
      actions.push({
        id: "logout",
        group: "Cuenta",
        label: "Cerrar sesión",
        description: "Finaliza tu sesión actual",
        icon: <LogOut className="size-4" aria-hidden="true" />,
        onSelect: () => {
          handleLogout();
        },
      });
    }

    return actions;
  }, [theme, handleToggleTheme, user, handleLogout]);

  const allActions = useMemo(() => {
    const combined = [...navigationActions, ...systemActions, ...viewActions];
    const unique = new Map<string, CommandAction>();
    combined.forEach((action) => {
      unique.set(action.id, action);
    });
    return Array.from(unique.values());
  }, [navigationActions, systemActions, viewActions]);

  const commandActionGroups = useMemo(() => {
    const map = new Map<string, CommandAction[]>();
    allActions.forEach((action) => {
      if (!map.has(action.group)) {
        map.set(action.group, []);
      }
      map.get(action.group)!.push(action);
    });
    return Array.from(map.entries()).map(([group, actions]) => [group, actions.sort((a, b) => a.label.localeCompare(b.label))] as [string, CommandAction[]]);
  }, [allActions]);

  // Leer parámetro view de la URL al inicializar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam && allNavItems.some(n => n.id === viewParam)) {
      setActiveNavItem(viewParam);
    }
  }, []);

  useEffect(() => {
    const isTypingElement = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return target.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isMod = event.metaKey || event.ctrlKey;

      if (isMod && (key === "k" || key === "b")) {
        event.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (isTypingElement(event.target)) return;

      if (isMod && event.key === "ArrowRight") {
        event.preventDefault();
        moveView("next");
        return;
      }

      if (isMod && event.key === "ArrowLeft") {
        event.preventDefault();
        moveView("prev");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveView]);

  const selectedSalonName = useMemo(() => {
    if (selectedSalon === "all") return "Todos los salones";
    if (!selectedSalon) return "Ninguna peluquería seleccionada";
    const found = effectiveSalons.find(s => s.id === selectedSalon);
    return found?.name || "";
  }, [selectedSalon, effectiveSalons]);

  // =========================================================================
  // RENDERIZADO DE CONTENIDO
  // =========================================================================
  const renderContent = useCallback(() => {
    switch (activeNavItem) {
      case "home":
        return (
          <Suspense fallback={<LoadingView />}>
            <HomeView
              selectedSalon={selectedSalon}
              salons={effectiveSalons}
              onSelectSalon={handleSelectSalon}
              onAppointmentClick={handleSelectAppointment}
              onAddAppointment={() => {
                setEditingAppointment(null);
                setDialogOpen(true);
              }}
              orgName={user?.memberships?.[0]?.org_id ? 'tu local' : undefined}
              isNewUser={user?.isNewUser}
            />
          </Suspense>
        );
      case "finances": {
        const normalizedSalonId = selectedSalon === "all" ? null : selectedSalon;
        const financesSalonName = normalizedSalonId ? selectedSalonName : "Todos los salones";

        // Empleados no pueden acceder a finanzas
        if (currentRole === 'employee') {
          return (
            <div className="pb-20 p-4 md:p-6">
              <Card className="rounded-2xl">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
                </CardContent>
              </Card>
            </div>
          );
        }
        return (
          <Suspense fallback={<LoadingView />}>
            <FinancesView 
              selectedSalon={normalizedSalonId} 
              salonName={financesSalonName}
              salons={effectiveSalons}
              onSelectSalon={handleSelectSalon}
            />
          </Suspense>
        );
      }
      case "clients":
        return (
          <Suspense fallback={<LoadingView />}>
            <ClientsView />
          </Suspense>
        );
      case "salons":
        // Empleados no pueden acceder a gestión de locales
        if (currentRole === 'employee') {
          return (
            <div className="pb-20 p-4 md:p-6">
              <Card className="rounded-2xl">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
                </CardContent>
              </Card>
            </div>
          );
        }
        return (
          <Suspense fallback={<LoadingView />}>
            <SalonsManagementView
              salons={effectiveSalons}
              onAddSalon={handleAddSalon}
              onEditSalon={handleEditSalon}
              onDeleteSalon={handleDeleteSalon}
            />
          </Suspense>
        );
      case "organization":
        // Empleados pueden ver pero solo en modo lectura (OrganizationView maneja permisos internamente)
        return (
          <Suspense fallback={<LoadingView />}>
            <OrganizationView isDemo={isDemo} />
          </Suspense>
        );
      case "settings":
        // Empleados no pueden acceder a configuración
        if (currentRole === 'employee') {
          return (
            <div className="pb-20 p-4 md:p-6">
              <Card className="rounded-2xl">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
                </CardContent>
              </Card>
            </div>
          );
        }
        return (
          <Suspense fallback={<LoadingView />}>
            <SettingsView />
          </Suspense>
        );
      default:
        return (
          <PageContainer>
            <div className="flex flex-col gap-4">
              <ShortcutBanner
                icon={<Sparkles className="size-4 text-primary" aria-hidden="true" />}
                message={(
                  <>
                    Usa <span className="font-semibold">Ctrl + K</span> o <span className="font-semibold">Ctrl + B</span> para abrir la paleta de comandos.
                  </>
                )}
              />
              <div className="p-4 sm:p-6">
                <div className="mb-4">
                  <div>
                    <SalonCarousel 
                      salons={effectiveSalons}
                      selectedSalon={selectedSalon}
                      onSelectSalon={handleSelectSalon}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <FilterBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    dateFilter={dateFilter}
                    onDateFilterChange={setDateFilter}
                    stylistFilter={stylistFilter}
                    onStylistFilterChange={setStylistFilter}
                  />
                </div>
                <div className="mt-4">
                  {selectedSalon === null ? (
                    <div className="text-center py-16 px-4">
                      <div className="text-muted-foreground mb-2">
                        Por favor selecciona una peluquería para ver los turnos
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Usa el carrusel superior para elegir una sucursal
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 py-4">
                        <h2 className="text-xl md:text-2xl">Lista de Turnos</h2>
                      </div>
                      <div className="space-y-6">
                        {loadingTurnos ? (
                          <SkeletonList count={5} />
                        ) : filteredAppointments.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            {selectedSalon === 'all' ? (
                              <>
                                <p className="mb-2">No se encontraron turnos</p>
                                <p className="text-sm">Intenta seleccionar un local específico o cambia los filtros</p>
                              </>
                            ) : (
                              "No se encontraron turnos"
                            )}
                          </div>
                        ) : (
                          (() => {
                            // Agrupar turnos por fecha
                            const today = new Date().toISOString().split('T')[0];
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            const tomorrowStr = tomorrow.toISOString().split('T')[0];
                            
                            const todayAppointments = filteredAppointments.filter(apt => apt.date === today);
                            const tomorrowAppointments = filteredAppointments.filter(apt => apt.date === tomorrowStr);
                            const thisWeekAppointments = filteredAppointments.filter(apt => {
                              const aptDate = new Date(apt.date);
                              const todayDate = new Date(today);
                              const weekFromToday = new Date(todayDate);
                              weekFromToday.setDate(todayDate.getDate() + 7);
                              return aptDate > tomorrow && aptDate < weekFromToday && apt.date !== today && apt.date !== tomorrowStr;
                            });
                            const laterAppointments = filteredAppointments.filter(apt => {
                              const aptDate = new Date(apt.date);
                              const weekFromToday = new Date();
                              weekFromToday.setDate(weekFromToday.getDate() + 7);
                              return aptDate >= weekFromToday;
                            });
                            
                            const groups = [];
                            if (todayAppointments.length > 0) {
                              groups.push({ title: 'Hoy', appointments: todayAppointments });
                            }
                            if (tomorrowAppointments.length > 0) {
                              groups.push({ title: 'Mañana', appointments: tomorrowAppointments });
                            }
                            if (thisWeekAppointments.length > 0) {
                              groups.push({ title: 'Esta semana', appointments: thisWeekAppointments });
                            }
                            if (laterAppointments.length > 0) {
                              groups.push({ title: 'Próximamente', appointments: laterAppointments });
                            }
                            
                            return groups.length > 0 ? (
                              groups.map((group, idx) => (
                                <AppointmentGroup
                                  key={idx}
                                  title={group.title}
                                  appointments={group.appointments}
                                  onAppointmentClick={handleSelectAppointment}
                                  selectedAppointmentId={selectedAppointment?.id}
                                />
                              ))
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                No se encontraron turnos
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </PageContainer>
        );
    }
  }, [activeNavItem, effectiveSalons, selectedSalon, selectedSalonName, handleSelectSalon, handleSelectAppointment, handleAddSalon, handleEditSalon, handleDeleteSalon, isDemo, user, searchQuery, statusFilter, dateFilter, stylistFilter, filteredAppointments, selectedAppointment, currentRole]);


  // =========================================================================
  // RENDERIZADO PRINCIPAL
  // =========================================================================
  return (
    <CommandPaletteProvider value={commandPaletteValue}>
      <Toaster position="top-right" />
      <div className={`flex h-screen bg-background overflow-hidden`}>
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64">
          <SidebarContent
            demoName={demoName}
            userEmail={user?.email}
            isDemo={isDemo}
            activeNavItem={activeNavItem}
            navItems={navItems}
            showQuickActions={showQuickActions}
            isMobile={isMobile}
            onProfileClick={() => setIsProfileModalOpen(true)}
            onNavItemClick={(itemId) => navigateToView(itemId)}
            onLogout={handleLogout}
            onQuickActionsToggle={() => setShowQuickActions(!showQuickActions)}
          />
        </div>

        {/* Mobile Drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <SheetDescription className="sr-only">
              Navegue por las diferentes secciones de la aplicación
            </SheetDescription>
            <SidebarContent
              demoName={demoName}
              userEmail={user?.email}
              isDemo={isDemo}
              activeNavItem={activeNavItem}
              navItems={navItems}
              showQuickActions={showQuickActions}
              isMobile={isMobile}
              onProfileClick={() => {
                setIsProfileModalOpen(true);
                setMobileMenuOpen(false);
              }}
              onNavItemClick={(itemId) => {
                if (itemId === activeNavItem) {
                  setMobileMenuOpen(false);
                  return;
                }
                navigateToView(itemId);
                setMobileMenuOpen(false);
              }}
              onLogout={handleLogout}
              onQuickActionsToggle={() => setShowQuickActions(!showQuickActions)}
            />
          </SheetContent>
        </Sheet>

        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden fixed top-4 left-4 z-30 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-background"
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}

        {/* Main Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto h-screen relative">
          <div className="md:hidden h-20" />
          
          {/* Content wrapper with fade animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNavItem}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pt-[20px]"
            >
          {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

      {/* Floating Quick Actions */}
      <FloatingQuickActions
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onGeneratePaymentLink={() => {
          setShowPaymentLinkModal(true);
        }}
      />

      {/* Floating Theme Bubble */}
      {isDemo && (
        <DemoDataBubble
          onSeed={() => {
            if (salons.length !== 1) {
              toastError('Crea un único local para cargar datos demo');
              return;
            }
            const targetSalonId = salons[0].id;
            setAppointments(sampleAppointments.map((a) => ({ ...a, salonId: targetSalonId })));
            if (typeof window !== 'undefined' && (window as any).__loadOrganizationDemoData) {
              (window as any).__loadOrganizationDemoData();
            }
            toastSuccess('Datos de ejemplo cargados en tu local demo');
          }}
        />
      )}

      {/* Appointment Dialog */}
      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingAppointment(null);
        }}
        onSave={handleSaveAppointment}
        appointment={editingAppointment}
        salonId={selectedSalon}
        salons={effectiveSalons}
      />

      {/* Appointment Action Bar - Mostrar en cualquier sección cuando hay turno seleccionado */}
      {selectedAppointment && (
        <AppointmentActionBar
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onEdit={() => {
          if (selectedAppointment) {
            handleEditAppointment(selectedAppointment);
            setSelectedAppointment(null);
          }
        }}
        onComplete={() => {
          if (selectedAppointment) {
            handleCompleteAppointment(selectedAppointment.id);
          }
        }}
        onCancel={() => {
          if (selectedAppointment) {
            handleCancelAppointment(selectedAppointment.id);
          }
        }}
        onDelete={handleDeleteAppointment}
        onRestore={(id: string) => {
          if (isDemo) {
            setAppointments(prev => {
              const updated = prev.map(apt => apt.id === id ? { ...apt, status: 'pending' as const } : apt);
              const updatedAppointment = updated.find(apt => apt.id === id);
              if (updatedAppointment && selectedAppointment?.id === id) {
                setSelectedAppointment(updatedAppointment);
              }
              return updated;
            });
            toastSuccess('Turno restaurado a pendiente');
          } else {
            (async () => { 
              try { 
                // Restaurar a estado pendiente (más común que confirmado)
                const updated = await updateTurno(id, { status: 'pending' as const } as any);
                if (updated) {
                  setSelectedAppointment(updated as any);
                  turnosStore.updateStatus(id, 'pending');
                  toastSuccess('Turno restaurado a pendiente'); 
                } else {
                  toastError('No se pudo restaurar el turno');
                }
              } catch (e: any) {
                console.error('Error restoring appointment:', e);
                const errorMessage = e?.message || 'No se pudo restaurar el turno';
                toastError(errorMessage); 
              } 
            })();
          }
        }}
        onSetStatus={(status) => {
          if (!selectedAppointment) return;
          const statusLabels = {
            pending: 'Pendiente',
            confirmed: 'Confirmado',
            completed: 'Completado',
            cancelled: 'Cancelado',
          };
          const statusLabel = statusLabels[status] || status;
          
          if (isDemo) {
            setAppointments(prev => {
              const updated = prev.map(apt => apt.id === selectedAppointment.id ? { ...apt, status } : apt);
              const updatedAppointment = updated.find(apt => apt.id === selectedAppointment.id);
              if (updatedAppointment) {
                setSelectedAppointment(updatedAppointment);
              }
              return updated;
            });
            (async () => { try { (await import('./stores/appointments')).appointmentsStore.updateStatus(selectedAppointment.id, status as any); } catch {} })();
            toastSuccess(`Estado actualizado a ${statusLabel}`);
          } else {
            (async () => { 
              try { 
                // Usar updateTurno que ya incluye todas las validaciones
                const updated = await updateTurno(selectedAppointment.id, { status } as any);
                if (updated) {
                  setSelectedAppointment(updated as any);
                  turnosStore.updateStatus(selectedAppointment.id, status as any);
                  // Disparar evento si se completó
                  if (status === 'completed') {
                    window.dispatchEvent(new CustomEvent('appointment:completed', { detail: { appointmentId: selectedAppointment.id } }));
                  }
                  try { (await import('./stores/appointments')).appointmentsStore.updateStatus(selectedAppointment.id, status as any); } catch {}
                  toastSuccess(`Estado actualizado a ${statusLabel}`); 
                } else {
                  toastError('No se pudo actualizar el estado');
                }
              } catch (e: any) {
                console.error('Error updating status:', e);
                const errorMessage = e?.message || 'No se pudo actualizar el estado';
                toastError(errorMessage); 
              } 
            })();
          }
        }}
      />
      )}

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
      {isDemo && (
        <DemoWelcomeModal
          isOpen={showDemoWelcome}
          onSave={handleSaveDemoName}
          onClose={() => setShowDemoWelcome(false)}
        />
      )}
      <ProfileModal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
      />
      <PaymentLinkModal
        isOpen={showPaymentLinkModal}
        onClose={() => setShowPaymentLinkModal(false)}
      />
      </div>

      <CommandDialog
        open={isCommandPaletteOpen}
        onOpenChange={(open) => (open ? openCommandPalette() : closeCommandPalette())}
        title="Paleta de comandos"
        description="Busca vistas o acciones disponibles"
      >
        <CommandInput placeholder="Buscar acción o vista..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          {commandActionGroups.map(([group, actions], index) => (
            <React.Fragment key={group}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {actions.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={`${group}-${action.id}`}
                    onSelect={() => handleCommandSelect(action)}
                    className="gap-3"
                  >
                    {action.icon}
                    <div className="flex flex-col items-start">
                      <span className="font-medium leading-none">{action.label}</span>
                      {action.description && (
                        <span className="text-xs text-muted-foreground">{action.description}</span>
                      )}
                    </div>
                    {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </CommandPaletteProvider>
  );
}

