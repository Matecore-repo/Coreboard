import React, { Suspense, useCallback, useMemo, useState, lazy, memo, useTransition, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSalons } from "../hooks/useSalons";
import { OnboardingModal } from "./OnboardingModal";
import DemoDataBubble from "./DemoDataBubble";
import DemoWelcomeModal from "./DemoWelcomeModal";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "./ui/command";
import { Toaster } from "./ui/sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Home,
  LogOut,
  Scissors,
  Settings,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { CommandPaletteProvider, CommandAction } from "../contexts/CommandPaletteContext";

// Lazy load views
const HomeView = lazy(() => import("./views/HomeView"));
const ClientsView = lazy(() => import("./sections/ClientsView").then(module => ({ default: (module as any).default })));
const FinancesView = lazy(() => import("./views/FinancesView"));
const SettingsView = lazy(() => import("./views/SettingsView"));
const SalonsManagementView = lazy(() => import("./views/SalonsManagementView"));
const OrganizationView = lazy(() => import("./views/OrganizationView"));

const isDemoModeEnv = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type ViewKey =
  | "home"
  | "clients"
  | "employees"
  | "salons"
  | "organization"
  | "finances"
  | "settings";

type NavItem = {
  id: ViewKey;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "employees", label: "Empleados", icon: UserCog },
  { id: "salons", label: "Peluquerias", icon: Scissors },
  { id: "organization", label: "Organizacion", icon: Building2 },
  { id: "finances", label: "Finanzas", icon: Wallet },
  { id: "settings", label: "Configuracion", icon: Settings },
];

const NavigationMenuItem = memo(function NavigationMenuItem({
  item,
  isActive,
  onSelect,
}: {
  item: NavItem;
  isActive: boolean;
  onSelect: (view: ViewKey) => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();

  const handleClick = useCallback(() => {
    onSelect(item.id);
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, item.id, onSelect, setOpenMobile]);

  const handleMouseEnter = useCallback(() => {
    preloadView(item.id);
  }, [item.id]);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        tooltip={item.label}
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        data-nav-item={item.id}
        data-view={item.id}
      >
        <item.icon className="h-4 w-4" aria-hidden="true" />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

const NavigationMenu = memo(function NavigationMenu({
  activeView,
  onSelect,
}: {
  activeView: ViewKey;
  onSelect: (view: ViewKey) => void;
}) {
  return (
    <SidebarMenu role="navigation" aria-label="Menú de navegación">
      {NAV_ITEMS.map((item) => (
        <NavigationMenuItem
          key={item.id}
          item={item}
          isActive={item.id === activeView}
          onSelect={onSelect}
        />
      ))}
    </SidebarMenu>
  );
});

// Suspense fallback
const ViewLoadingFallback = () => (
  <div className="flex items-center justify-center py-12" role="status" aria-live="polite" aria-label="Cargando vista">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Cargando vista...</p>
    </div>
  </div>
);

// Error Boundary para vistas
class ViewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('View rendering error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm text-red-500 mb-2">Error al cargar la vista</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-xs text-primary hover:underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AppContainer() {
  const {
    user,
    session,
    currentOrgId,
    currentRole,
    signOut,
    isDemo,
  } = useAuth();
  const { salons, createSalon, updateSalon, deleteSalon } = useSalons(currentOrgId ?? undefined);
  const [activeView, setActiveView] = useState<ViewKey>("home");
  const [selectedSalon, setSelectedSalon] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDemoWelcome, setShowDemoWelcome] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [viewActions, setViewActions] = useState<CommandAction[]>([]);

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

  // Sincronizar con URL (?view=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as ViewKey | null;
    if (viewParam && NAV_ITEMS.some(n => n.id === viewParam)) {
      setActiveView(viewParam);
    }
    const onPopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const vp = sp.get('view') as ViewKey | null;
      if (vp && NAV_ITEMS.some(n => n.id === vp)) {
        setActiveView(vp);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Memoize normalized salons
  const normalizedSalons = useMemo(() => 
    (salons || []).map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address || '',
      image: s.image || '/imagenlogin.jpg',
      staff: s.staff || [],
      services: s.services || [],
    })), 
    [salons]
  );

  const currentNavigationView: ViewKey = useMemo(() => {
    const match = NAV_ITEMS.find((item) => item.id === activeView);
    return match ? match.id : "home";
  }, [activeView]);

  const activeNavItem = useMemo(
    () => NAV_ITEMS.find((item) => item.id === currentNavigationView),
    [currentNavigationView],
  );

  const handleSelectView = useCallback((view: ViewKey) => {
    // Preload y transición sin bloquear
    preloadView(view);
    startTransition(() => {
      setActiveView(view);
      // Actualizar query param sin recargar
      const url = new URL(window.location.href);
      url.searchParams.set('view', view);
      window.history.replaceState({}, '', url.toString());
    });
  }, []);

  const moveView = useCallback(
    (direction: "next" | "prev") => {
      const currentIndex = NAV_ITEMS.findIndex((item) => item.id === currentNavigationView);
      if (currentIndex === -1) return;
      const newIndex = direction === "next"
        ? (currentIndex + 1) % NAV_ITEMS.length
        : (currentIndex - 1 + NAV_ITEMS.length) % NAV_ITEMS.length;
      handleSelectView(NAV_ITEMS[newIndex].id);
    },
    [currentNavigationView, handleSelectView],
  );

  const handleSelectSalon = useCallback((id: string, _name: string) => {
    setSelectedSalon((prev) => (prev === id ? null : id));
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
    }
  }, [signOut]);

  const navigationActions = useMemo<CommandAction[]>(
    () =>
      NAV_ITEMS.map((item) => ({
        id: `nav-${item.id}`,
        group: "Navegación",
        label: item.label,
        description: item.id === currentNavigationView ? "Vista actual" : `Ir a ${item.label}`,
        icon: React.createElement(item.icon, { className: "size-3.5", "aria-hidden": true }),
        onSelect: () => handleSelectView(item.id),
      })),
    [currentNavigationView, handleSelectView],
  );

  const systemActions = useMemo<CommandAction[]>(
    () => [
      {
        id: "system-logout",
        group: "Sistema",
        label: "Cerrar sesión",
        description: "Salir de tu cuenta",
        shortcut: "Ctrl+Shift+Q",
        icon: <LogOut className="size-3.5" aria-hidden="true" />,
        onSelect: handleLogout,
      },
      {
        id: "system-next-view",
        group: "Navegación",
        label: "Vista siguiente",
        description: "Ir a la siguiente vista",
        shortcut: "Ctrl+→",
        onSelect: () => moveView("next"),
      },
      {
        id: "system-prev-view",
        group: "Navegación",
        label: "Vista anterior",
        description: "Ir a la vista anterior",
        shortcut: "Ctrl+←",
        onSelect: () => moveView("prev"),
      },
    ],
    [handleLogout, moveView],
  );

  const commandActionGroups = useMemo(() => {
    const map = new Map<string, CommandAction[]>();
    [...navigationActions, ...systemActions, ...viewActions].forEach((action) => {
      const group = action.group || "Acciones";
      if (!map.has(group)) {
        map.set(group, []);
      }
      map.get(group)!.push(action);
    });
    return Array.from(map.entries());
  }, [navigationActions, systemActions, viewActions]);

  const handleCommandSelect = useCallback(
    (action: CommandAction) => {
      action.onSelect?.();
      closeCommandPalette();
    },
    [closeCommandPalette],
  );

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

  React.useEffect(() => {
    if (user && !currentOrgId && !isDemo) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user, currentOrgId, isDemo]);

  React.useEffect(() => {
    if ((isDemoModeEnv || isDemo) && user && !session?.user?.user_metadata?.demo_seen) {
      setShowDemoWelcome(true);
    }
  }, [isDemo, user, session]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setActiveView("home");
  };

  const handleDemoWelcomeComplete = () => {
    setShowDemoWelcome(false);
  };

  // Memoize salon handlers
  const salonHandlers = useMemo(() => ({
    onAddSalon: async (salon: any) => {
      try {
        if (currentOrgId) {
          await createSalon({
            org_id: currentOrgId,
            name: salon.name,
            address: salon.address,
            phone: salon.phone || '',
            active: true
          });
        } else {
          throw new Error('currentOrgId no disponible');
        }
      } catch (error) {
        throw error;
      }
    },
    onEditSalon: async (id: string, updates: any) => {
      try {
        await updateSalon(id, {
          name: updates.name,
          address: updates.address,
          phone: updates.phone
        });
      } catch (error) {
        console.error('❌ Error editando salón:', error);
        throw error;
      }
    },
    onDeleteSalon: async (id: string) => {
      try {
        await deleteSalon(id);
      } catch (error) {
        console.error('❌ Error eliminando salón:', error);
        throw error;
      }
    }
  }), [currentOrgId, createSalon, updateSalon, deleteSalon]);

  // Memoize view props
  const viewProps = useMemo(() => ({
    home: {
      appointments: [],
      selectedSalon,
      salons: normalizedSalons,
      onSelectSalon: handleSelectSalon,
      onAppointmentClick: () => {},
      onAddAppointment: () => setActiveView("clients"),
      orgName: "Tu Peluqueria",
      isNewUser: !currentOrgId,
    },
    finances: {
      appointments: [],
      selectedSalon,
    }
  }), [selectedSalon, normalizedSalons, handleSelectSalon, currentOrgId]);

  const renderContent = useCallback(() => {
    switch (activeView) {
      case "home":
        return (
          <HomeView {...viewProps.home} />
        );
      case "clients":
        return (
          <ClientsView />
        );
      case "employees":
        return <OrganizationView isDemo={isDemo} />;
      case "salons":
        return (
          <SalonsManagementView
            salons={normalizedSalons}
            {...salonHandlers}
          />
        );
      case "organization":
        return <OrganizationView isDemo={isDemo} />;
      case "finances":
        return (
          <FinancesView {...viewProps.finances} />
        );
      case "settings":
        return <SettingsView />;
      default:
        return (
          <HomeView {...viewProps.home} />
        );
    }
  }, [activeView, viewProps, normalizedSalons, salonHandlers, isDemo]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite" aria-label="Cargando aplicación">
        Cargando...
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <>
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={handleOnboardingComplete}
        />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <CommandPaletteProvider value={commandPaletteValue}>
      <SidebarProvider>
        <div className="flex min-h-screen bg-background" role="application" aria-label="Coreboard CRM">
        <Sidebar className="border-r" role="navigation" aria-label="Navegación principal">
          <SidebarHeader className="border-b px-4 py-3">
            <h2 className="text-lg font-semibold tracking-tight" aria-label="Coreboard">
              Coreboard
            </h2>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Navegacion
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <NavigationMenu
                  activeView={currentNavigationView}
                  onSelect={handleSelectView}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="px-2 pb-4" role="contentinfo">
            <div className="px-2 pb-3 text-xs text-muted-foreground">
              <div className="text-sm font-medium text-foreground" aria-label="Usuario actual">
                {user?.email ?? "Usuario"}
              </div>
              {currentRole && (
                <div className="capitalize" aria-label={`Rol: ${currentRole}`}>
                  Rol: {currentRole}
                </div>
              )}
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout} 
                  tooltip="Cerrar sesion"
                  aria-label="Cerrar sesión"
                  data-action="logout"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Cerrar sesion</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="border-b" role="banner">
            <div className="mx-auto flex h-14 w-full items-center gap-3 px-4 sm:px-6 lg:px-8 max-w-[1320px] xl:max-w-[1380px] 2xl:max-w-[1440px]">
              <SidebarTrigger className="-ml-1" aria-label="Alternar menú lateral" />
              <div className="flex flex-1 items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold leading-none sm:text-lg" data-view={activeView}>
                    {activeNavItem?.label ?? "Inicio"}
                  </h1>
                  <p className="text-xs text-muted-foreground sm:text-sm" aria-label="Sistema Coreboard">
                    Coreboard
                  </p>
                </div>
                {currentRole && (
                  <span className="text-xs text-muted-foreground sm:inline sm:text-sm" aria-label={`Rol actual: ${currentRole}`}>
                    Rol: <span className="capitalize">{currentRole}</span>
                  </span>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 py-6 lg:py-8" role="main" aria-label={`Vista: ${activeNavItem?.label ?? "Inicio"}`} data-view-content={activeView}>
            <div className="mx-auto flex w-full flex-col gap-6 px-4 sm:px-6 lg:px-8 max-w-[1320px] xl:max-w-[1380px] 2xl:max-w-[1440px]">
              {isPending && (
                <div className="text-xs text-muted-foreground" role="status" aria-live="polite">
                  Cambiando vista...
                </div>
              )}
              <Suspense fallback={<ViewLoadingFallback />}>
                <ViewErrorBoundary>
                  {renderContent()}
                </ViewErrorBoundary>
              </Suspense>
            </div>
          </main>
        </SidebarInset>

          {isDemoModeEnv && (
            <DemoDataBubble
              onSeed={() => {
                console.log("Seeding demo data...");
              }}
            />
          )}

          {showDemoWelcome && (
            <DemoWelcomeModal
              isOpen={showDemoWelcome}
              onSave={() => {
                handleDemoWelcomeComplete();
              }}
              onClose={handleDemoWelcomeComplete}
            />
          )}

          <Toaster position="top-right" />
        </div>
      </SidebarProvider>

      <CommandDialog
        open={isCommandPaletteOpen}
        onOpenChange={(open) => (open ? openCommandPalette() : closeCommandPalette())}
        title="Atajos del CRM"
        description="Busca vistas o acciones disponibles"
      >
        <CommandInput placeholder="Buscar acción, vista o comando..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados</CommandEmpty>
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

// Preload views function
function preloadView(view: ViewKey) {
  const viewMap: Record<ViewKey, () => Promise<any>> = {
    home: () => import("./views/HomeView"),
    clients: () => import("./sections/ClientsView"),
    employees: () => import("./views/OrganizationView"),
    salons: () => import("./views/SalonsManagementView"),
    organization: () => import("./views/OrganizationView"),
    finances: () => import("./views/FinancesView"),
    settings: () => import("./views/SettingsView"),
  };

  viewMap[view]?.().catch(err => console.warn(`Failed to preload ${view}:`, err));
}
