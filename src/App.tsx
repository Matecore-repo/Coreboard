import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, useTransition, useRef } from "react";
import { Menu, Calendar, Home, Users, Settings, DollarSign, Building2, UserCog, Scissors } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import { SalonCarousel } from "./components/SalonCarousel";
import { AppointmentCard, Appointment } from "./components/features/appointments/AppointmentCard";
import { AppointmentDialog } from "./components/features/appointments/AppointmentDialog";
import { AppointmentActionBar } from "./components/features/appointments/AppointmentActionBar";
import { FloatingQuickActions } from "./components/FloatingQuickActions";
import { FilterBar } from "./components/FilterBar";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./components/ui/sheet";
import { useIsMobile } from "./components/ui/use-mobile";
import { toast } from "sonner";
import { Toaster as Sonner } from "sonner";
import { useAuth } from "./contexts/AuthContext";
import type { User } from "./contexts/AuthContext";
import ThemeBubble from "./components/ThemeBubble";
import DemoDataBubble from "./components/DemoDataBubble";
import DemoWelcomeModal from "./components/DemoWelcomeModal";
import { useAppointments as useDbAppointments } from "./hooks/useAppointments";
import { useSalons as useDbSalons } from "./hooks/useSalons";
import { OnboardingModal } from "./components/OnboardingModal";
import { LoadingView } from "./components/layout/LoadingView";
import { SidebarContent } from "./components/layout/SidebarContent";
import { Card, CardContent } from "./components/ui/card";
import type { Salon, SalonService } from "./types/salon";
import { sampleSalons } from "./constants/salons";

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
const ProfileView = lazy(() => import("./components/views/ProfileView"));

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
  profile: () => { import("./components/views/ProfileView"); },
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

  // =========================================================================
  // ESTADO LOCAL
  // =========================================================================
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedSalon, setSelectedSalon] = useState<string | null>('all');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [unsyncedAppointments, setUnsyncedAppointments] = useState<Appointment[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const key = `unsynced:appointments:${user?.id || 'local'}`;
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Appointment[]) : [];
    } catch { return []; }
  });
  const [demoName, setDemoName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem('demo:name'); } catch { return null; }
  });

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDemoWelcome, setShowDemoWelcome] = useState(false);
  const [prevUser, setPrevUser] = useState<User | null>(null);
  const [services, setServices] = useState<SalonService[]>([
    { id: 's1', name: 'Corte', price: 1200, durationMinutes: 30 },
    { id: 's2', name: 'Coloración', price: 3000, durationMinutes: 90 },
  ]);

  const isMobile = useIsMobile();

  // =========================================================================
  // DATOS REMOTOS (Supabase)
  // =========================================================================
  const { appointments: remoteAppointments, createAppointment, updateAppointment, deleteAppointment, fetchAppointments } = useDbAppointments(
    undefined,
    { enabled: !!session }
  );
  const { salons: remoteSalons, createSalon: createRemoteSalon, updateSalon: updateRemoteSalon, deleteSalon: deleteRemoteSalon } = useDbSalons(
    currentOrgId ?? undefined,
    { enabled: !!session && !!currentOrgId }
  );

  // =========================================================================
  // DATOS EFECTIVOS (Demo vs Real)
  // =========================================================================
  const effectiveAppointments: Appointment[] = isDemo
    ? appointments
    : ([...unsyncedAppointments, ...((remoteAppointments as any) || [])] as Appointment[]);
  const effectiveSalons: Salon[] = isDemo ? salons : (remoteSalons as any);

  // =========================================================================
  // EFECTOS
  // =========================================================================
  useEffect(() => {
    if (isDemo && !demoName) setShowDemoWelcome(true);
  }, [isDemo, demoName]);

  // Eliminar la lógica del welcome screen aquí - ahora se maneja en LoginView
  // Mostrar toast de bienvenida cuando el usuario ingresa al dashboard
  const welcomeToastShownRef = useRef(false);
  useEffect(() => {
    if (user && !prevUser && !welcomeToastShownRef.current) {
      // Usuario acaba de hacer login
      setPrevUser(user);
      welcomeToastShownRef.current = true;
      
      // Esperar a que los appointments se carguen antes de mostrar el toast
      const showWelcomeToast = () => {
        const userName = user?.email?.split('@')[0] || 'Usuario';
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        // Contar turnos de hoy - comparar fechas en formato YYYY-MM-DD
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todayAppointments = effectiveAppointments.filter(
          (apt) => {
            // Asegurar que apt.date esté en formato YYYY-MM-DD
            const aptDateStr = apt.date || '';
            return aptDateStr === todayStr && apt.status !== 'cancelled';
          }
        );
        const appointmentsCount = todayAppointments.length;
        
        // Mostrar toast completo
        toast.success(
          `Bienvenido ${userName}, son las ${hours}:${minutes}, hoy te esperan ${appointmentsCount} turno${appointmentsCount !== 1 ? 's' : ''}`,
          { duration: 4000 }
        );
      };
      
      // Esperar un momento para que los appointments se carguen
      // Si hay appointments disponibles, mostrar inmediatamente
      // Si no, esperar hasta 2 segundos máximo
      if (effectiveAppointments.length > 0 || isDemo) {
        setTimeout(showWelcomeToast, 500);
      } else {
        // Esperar un poco más si no hay appointments aún
        setTimeout(showWelcomeToast, 1500);
      }
    } else if (!user) {
      setPrevUser(null);
      welcomeToastShownRef.current = false;
    }
  }, [user, prevUser, effectiveAppointments, isDemo]);

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

  // Sincronizar selectedAppointment cuando cambian los effectiveAppointments
  useEffect(() => {
    if (selectedAppointment) {
      const updated = effectiveAppointments.find(apt => apt.id === selectedAppointment.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedAppointment)) {
        setSelectedAppointment(updated);
      }
    }
  }, [effectiveAppointments, selectedAppointment?.id]);

  useEffect(() => {
    // Solo mostrar onboarding si:
    // 1. El usuario no tiene membresías (isNewUser)
    // 2. NO es un empleado (empleados ya tienen organización asignada)
    // 3. No está en modo demo
    const shouldShowOnboarding = user?.isNewUser && 
                                 !showOnboarding && 
                                 (!user.memberships || user.memberships.length === 0) &&
                                 currentRole !== 'employee' &&
                                 !isDemo;
    
    if (shouldShowOnboarding) {
      setShowOnboarding(true);
    }
  }, [user?.isNewUser, user?.memberships, currentRole, showOnboarding, isDemo]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const key = `unsynced:appointments:${user?.id || 'local'}`;
      localStorage.setItem(key, JSON.stringify(unsyncedAppointments));
    } catch {}
  }, [unsyncedAppointments, user?.id]);

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
    setSelectedSalon(salonId);
    toast.success(`${salonName} seleccionado`);
  }, []);

  const handleLogout = async () => {
    // Mostrar toast de despedida antes de cerrar sesión
    const userName = user?.email?.split('@')[0] || 'Usuario';
    toast.info(`¡Hasta pronto ${userName}!`);
    
    // Esperar un momento antes de cerrar sesión
    setTimeout(async () => {
    await signOut();
    setActiveNavItem("home");
    setSelectedSalon(null);
    setSelectedAppointment(null);
    setShowQuickActions(false);
    try { localStorage.removeItem(`unsynced:appointments:${user?.id || 'local'}`); } catch {}
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
        toast.error('Por favor completa todos los campos requeridos');
        return;
      }

      if (isDemo) {
        if (editingAppointment) {
          setAppointments((prev) =>
            prev.map((apt) => (apt.id === editingAppointment.id ? { ...apt, ...appointmentData } : apt))
          );
          setEditingAppointment(null);
          toast.success("Turno actualizado correctamente");
        } else {
          const salonToUse = appointmentData.salonId || (selectedSalon !== 'all' ? selectedSalon : null);
          if (!salonToUse) {
            toast.error('Debes seleccionar una peluquería');
            return;
          }
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
          toast.success("Turno creado correctamente");
        }
        return;
      }
      
      // Remote - Usar el hook correctamente
      if (editingAppointment) {
        await (updateAppointment as any)(editingAppointment.id, appointmentData);
        setEditingAppointment(null);
        toast.success("Turno actualizado correctamente");
      } else {
        const salonToUse = appointmentData.salonId || (selectedSalon !== 'all' ? selectedSalon : null);
        if (!salonToUse) {
          toast.error('Debes seleccionar una peluquería');
          return;
        }
        
        // Agregar org_id y created_by al payload
        const payloadWithOrg = {
          ...appointmentData,
          salonId: salonToUse,
        };
        
        await (createAppointment as any)(payloadWithOrg);
        toast.success("Turno creado correctamente");
      }
    } catch (e: any) {
      console.error('Error al guardar turno:', e);
      toast.error(e?.message || 'No se pudo guardar el turno');
    }
  }, [isDemo, editingAppointment, selectedSalon, createAppointment, updateAppointment]);

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
      toast.success("Turno cancelado");
    } else {
      try {
        const updated = await (updateAppointment as any)(id, { status: 'cancelled' as const });
        if (updated) {
          setSelectedAppointment(updated);
    }
    toast.success("Turno cancelado");
      } catch (e) {
        console.error('Error cancelling appointment:', e);
        toast.error('No se pudo cancelar el turno');
      }
    }
  }, [isDemo, updateAppointment, selectedAppointment]);

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
    toast.success("Turno completado");
    } else {
      try {
        const updated = await (updateAppointment as any)(id, { status: 'completed' as const });
        if (updated) {
          setSelectedAppointment(updated);
        }
        toast.success("Turno completado");
      } catch (error) {
        console.error('Error completing appointment:', error);
        toast.error("Error al completar el turno");
      }
    }
  }, [isDemo, updateAppointment, selectedAppointment]);

  const handleDeleteAppointment = useCallback(async () => {
    if (!selectedAppointment) {
      toast.error("No hay turno seleccionado para eliminar");
      return;
    }
    
    if (isDemo) {
      setAppointments((prev) => prev.filter(apt => apt.id !== selectedAppointment.id));
      toast.success("Turno eliminado correctamente");
      setSelectedAppointment(null);
    } else {
      try {
        await deleteAppointment(selectedAppointment.id);
        toast.success("Turno eliminado correctamente");
        setSelectedAppointment(null);
      } catch (error) {
        console.error('Error deleting appointment:', error);
        toast.error("Error al eliminar el turno");
      }
    }
  }, [selectedAppointment, isDemo, deleteAppointment]);

  const handleUpdateAppointment = useCallback(() => {
    const salonAppointments = !selectedSalon
      ? effectiveAppointments
      : effectiveAppointments.filter(apt => apt.salonId === selectedSalon);
    if (salonAppointments.length === 0) {
      toast.error("No hay turnos para actualizar");
      return;
    }
    const lastAppointment = salonAppointments[0];
    setEditingAppointment(lastAppointment);
    setDialogOpen(true);
    setShowQuickActions(false);
  }, [effectiveAppointments, selectedSalon]);

  const filteredAppointments = useMemo(() => {
    return effectiveAppointments.filter((apt) => {
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
  }, [effectiveAppointments, selectedSalon, searchQuery, statusFilter, stylistFilter, dateFilter]);

  const handleAddSalon = useCallback(async (salonData: Omit<Salon, 'id'>) => {
    if (isDemo) {
      if (salons.length >= 1) {
        toast.error('En modo demo solo se permite 1 peluquería');
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
  const allNavItems = [
    { id: "home", label: "Inicio", icon: Home },
    { id: "appointments", label: "Turnos", icon: Calendar },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "profile", label: "Mi Perfil", icon: UserCog },
    { id: "organization", label: "Organización", icon: Building2 },
    { id: "salons", label: "Peluquerías", icon: Scissors },
    { id: "finances", label: "Finanzas", icon: DollarSign },
    { id: "settings", label: "Configuración", icon: Settings },
  ];

  const viewNames: Record<string, string> = {
    home: "Inicio",
    appointments: "Turnos",
    clients: "Clientes",
    profile: "Mi Perfil",
    organization: "Organización",
    salons: "Peluquerías",
    finances: "Finanzas",
    settings: "Configuración"
  };

  const navItems = useMemo(() => {
    const role = isDemo ? 'demo' : (currentRole ?? 'viewer');
    if (role === 'demo') return allNavItems;
    
    // Empleados pueden ver: Inicio, Turnos, Clientes, Mi Perfil, Organización (solo lectura)
    if (role === 'employee') {
      return allNavItems.filter(it => 
        ['home', 'appointments', 'clients', 'profile', 'organization'].includes(it.id)
      );
    }
    
    // Owners y admins ven todo
    return allNavItems;
  }, [currentRole, isDemo]);

  const selectedSalonName = useMemo(() => {
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
              appointments={effectiveAppointments}
              selectedSalon={selectedSalon}
              salons={effectiveSalons}
              onSelectSalon={handleSelectSalon}
              onAppointmentClick={handleSelectAppointment}
              onAddAppointment={() => {
                setEditingAppointment(null);
                setDialogOpen(true);
              }}
              orgName={user?.memberships?.[0]?.org_id ? 'tu peluquería' : undefined}
              isNewUser={user?.isNewUser}
            />
          </Suspense>
        );
      case "finances":
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
            <FinancesView appointments={effectiveAppointments} selectedSalon={selectedSalon} salonName={selectedSalonName} />
          </Suspense>
        );
      case "clients":
        return (
          <Suspense fallback={<LoadingView />}>
            <ClientsView />
          </Suspense>
        );
      case "salons":
        // Empleados no pueden acceder a gestión de peluquerías
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
      case "profile":
        return (
          <Suspense fallback={<LoadingView />}>
            <ProfileView />
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
          <>
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
            <div className="bg-muted/20">
              <div className="p-4 md:p-6 pb-20">
                {!selectedSalon ? (
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
                      <h2>Lista de Turnos</h2>
                    </div>
                    <div className="space-y-3">
                    {filteredAppointments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No se encontraron turnos
                      </div>
                    ) : (
                      filteredAppointments.map((appointment) => (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          onClick={handleSelectAppointment}
                          isSelected={selectedAppointment?.id === appointment.id}
                        />
                      ))
                    )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        );
    }
  }, [activeNavItem, effectiveAppointments, effectiveSalons, selectedSalon, selectedSalonName, handleSelectSalon, handleSelectAppointment, handleAddSalon, handleEditSalon, handleDeleteSalon, isDemo, user, searchQuery, statusFilter, dateFilter, stylistFilter, filteredAppointments, selectedAppointment, currentRole]);

  // =========================================================================
  // RENDERIZADO PRINCIPAL
  // =========================================================================
  return (
    <>
      <Sonner theme={theme} position="top-right" />
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
            onNavItemClick={(itemId) => {
              if (itemId === activeNavItem) return;
              try { viewPreloadMap[itemId]?.(); } catch {}
              startTransition(() => {
                setActiveNavItem(itemId);
                const url = new URL(window.location.href);
                url.searchParams.set('view', itemId);
                window.history.replaceState({}, '', url.toString());
              });
            }}
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
              onNavItemClick={(itemId) => {
                if (itemId === activeNavItem) {
                  setMobileMenuOpen(false);
                  return;
                }
                startTransition(() => {
                  setActiveNavItem(itemId);
                  setMobileMenuOpen(false);
                });
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
        <div className="flex-1 overflow-y-auto h-screen relative">
          <div className="md:hidden h-20" />

          {/* Content wrapper with modern fade animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNavItem}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ 
                duration: 0.25, 
                ease: [0.4, 0, 0.2, 1],
                opacity: { duration: 0.2 }
              }}
              className="h-full"
            >
          { ["appointments", "finances", "clients"].includes(activeNavItem) && (
            <div className="p-4 md:p-6 pb-4 border-b border-border">
              <h2 className="mb-3">Seleccionar Peluquería</h2>
              <SalonCarousel 
                salons={effectiveSalons}
                selectedSalon={selectedSalon}
                onSelectSalon={handleSelectSalon}
              />
            </div>
          )}

          {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

      {/* Floating Quick Actions */}
      <FloatingQuickActions
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onAddAppointment={() => {
          setEditingAppointment(null);
          setDialogOpen(true);
        }}
        onDeleteAppointment={handleDeleteAppointment}
        onUpdateAppointment={handleUpdateAppointment}
      />

      {/* Floating Theme Bubble */}
      <ThemeBubble />
      {isDemo && (
        <DemoDataBubble
          onSeed={() => {
            if (salons.length !== 1) {
              toast.error('Crea una única peluquería para cargar datos demo');
              return;
            }
            const targetSalonId = salons[0].id;
            setAppointments(sampleAppointments.map((a) => ({ ...a, salonId: targetSalonId })));
            if (typeof window !== 'undefined' && (window as any).__loadOrganizationDemoData) {
              (window as any).__loadOrganizationDemoData();
            }
            toast.success('Datos de ejemplo cargados en tu peluquería demo');
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
        onReschedule={({ date, time, openPicker }) => {
          if (!selectedAppointment) return;
          if (openPicker) {
            setEditingAppointment({ ...selectedAppointment, date: date || selectedAppointment.date, time: time || selectedAppointment.time });
            setDialogOpen(true);
            return;
          }
          if (isDemo) {
            setAppointments(prev => {
              const updated = prev.map(apt => apt.id === selectedAppointment.id ? { ...apt, date: date || apt.date, time: time || apt.time } : apt);
              const updatedAppointment = updated.find(apt => apt.id === selectedAppointment.id);
              if (updatedAppointment) {
                setSelectedAppointment(updatedAppointment);
              }
              return updated;
            });
            toast.success('Turno reprogramado');
          } else {
            (async () => { 
              try { 
                const updated = await (updateAppointment as any)(selectedAppointment.id, { date, time });
                if (updated) {
                  setSelectedAppointment(updated);
                }
                toast.success('Turno reprogramado'); 
              } catch (e) {
                console.error('Error rescheduling appointment:', e);
                toast.error('No se pudo reprogramar'); 
              } 
            })();
          }
        }}
        onRestore={(id: string) => {
          if (isDemo) {
            setAppointments(prev => {
              const updated = prev.map(apt => apt.id === id ? { ...apt, status: 'confirmed' as const } : apt);
              const updatedAppointment = updated.find(apt => apt.id === id);
              if (updatedAppointment && selectedAppointment?.id === id) {
                setSelectedAppointment(updatedAppointment);
              }
              return updated;
            });
            toast.success('Turno restaurado');
          } else {
            (async () => { 
              try { 
                const updated = await (updateAppointment as any)(id, { status: 'confirmed' as const });
                if (updated) {
                  setSelectedAppointment(updated);
                }
                toast.success('Turno restaurado'); 
              } catch (e) {
                console.error('Error restoring appointment:', e);
                toast.error('No se pudo restaurar'); 
              } 
            })();
          }
        }}
        onSetStatus={(status) => {
          if (!selectedAppointment) return;
          if (isDemo) {
            setAppointments(prev => {
              const updated = prev.map(apt => apt.id === selectedAppointment.id ? { ...apt, status } : apt);
              const updatedAppointment = updated.find(apt => apt.id === selectedAppointment.id);
              if (updatedAppointment) {
                setSelectedAppointment(updatedAppointment);
              }
              return updated;
            });
            toast.success('Estado actualizado');
          } else {
            (async () => { 
              try { 
                const updated = await (updateAppointment as any)(selectedAppointment.id, { status });
                if (updated) {
                  setSelectedAppointment(updated);
                }
                toast.success('Estado actualizado'); 
              } catch (e) {
                console.error('Error updating status:', e);
                toast.error('No se pudo actualizar'); 
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
    </div>
    </>
  );
}

