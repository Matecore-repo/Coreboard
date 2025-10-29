import React, { Suspense, useCallback, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSalons } from "../hooks/useSalons";
import { OnboardingModal } from "./OnboardingModal";
import DemoDataBubble from "./DemoDataBubble";
import DemoWelcomeModal from "./DemoWelcomeModal";
import ThemeBubble from "./ThemeBubble";
import { Toaster } from "sonner";
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

import HomeView from "./views/HomeView";
import ClientsView from "./views/ClientsView";
import FinancesView from "./views/FinancesView";
import SettingsView from "./views/SettingsView";
import SalonsManagementView from "./views/SalonsManagementView";
import EmployeesView from "./views/EmployeesView";
import OrganizationView from "./views/OrganizationView";

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

function NavigationMenu({
  activeView,
  onSelect,
}: {
  activeView: ViewKey;
  onSelect: (view: ViewKey) => void;
}) {
  return (
    <SidebarMenu>
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
}

function NavigationMenuItem({
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

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={handleClick}
        tooltip={item.label}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
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
  const [activeView, setActiveView] = useState("home");
  const [selectedSalon, setSelectedSalon] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDemoWelcome, setShowDemoWelcome] = useState(false);

  const currentNavigationView: ViewKey = useMemo(() => {
    const match = NAV_ITEMS.find((item) => item.id === activeView);
    return match ? match.id : "home";
  }, [activeView]);

  const activeNavItem = useMemo(
    () => NAV_ITEMS.find((item) => item.id === currentNavigationView),
    [currentNavigationView],
  );

  const handleSelectView = useCallback((view: ViewKey) => {
    setActiveView(view);
  }, []);

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
  }, [isDemoModeEnv, isDemo, user, session]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setActiveView("home");
  };

  const handleDemoWelcomeComplete = () => {
    setShowDemoWelcome(false);
  };

  const normalizedSalons = (salons || []).map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address || '',
    image: s.image || '/imagenlogin.jpg',
    staff: s.staff || [],
    services: s.services || [],
  }));

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
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

  const renderContent = () => {
    switch (activeView) {
      case "home":
        return (
          <HomeView
            appointments={[]}
            selectedSalon={selectedSalon}
            salons={normalizedSalons}
            onSelectSalon={handleSelectSalon}
            onAppointmentClick={() => {}}
            onAddAppointment={() => setActiveView("appointments")}
            orgName="Tu Peluqueria"
            isNewUser={!currentOrgId}
          />
        );
      case "clients":
        return (
          <ClientsView />
        );
      case "employees":
        return <EmployeesView />;
      case "salons":
        return (
          <SalonsManagementView
            salons={normalizedSalons}
            onAddSalon={async (salon) => {
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
            }}
            onEditSalon={async (id, updates) => {
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
            }}
            onDeleteSalon={async (id) => {
              try {
                await deleteSalon(id);
              } catch (error) {
                console.error('❌ Error eliminando salón:', error);
                throw error;
              }
            }}
          />
        );
      case "organization":
        return <OrganizationView isDemo={isDemo} />;
      case "finances":
        return (
          <FinancesView appointments={[]} selectedSalon={selectedSalon} />
        );
      case "settings":
        return <SettingsView />;
      default:
        return (
          <HomeView
            appointments={[]}
            selectedSalon={selectedSalon}
            salons={normalizedSalons}
            onSelectSalon={handleSelectSalon}
            onAppointmentClick={() => {}}
            onAddAppointment={() => {}}
            orgName="Tu Peluqueria"
            isNewUser={!currentOrgId}
          />
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b px-4 py-3">
            <span className="text-lg font-semibold tracking-tight">
              Coreboard
            </span>
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
          <SidebarFooter className="px-2 pb-4">
            <div className="px-2 pb-3 text-xs text-muted-foreground">
              <div className="text-sm font-medium text-foreground">
                {user?.email ?? "Usuario"}
              </div>
              {currentRole && (
                <div className="capitalize">Rol: {currentRole}</div>
              )}
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Cerrar sesion">
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar sesion</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="border-b">
            <div className="mx-auto flex h-14 w-full items-center gap-3 px-4 sm:px-6 lg:px-8 max-w-[1320px] xl:max-w-[1380px] 2xl:max-w-[1440px]">
              <SidebarTrigger className="-ml-1" />
              <div className="flex flex-1 items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold leading-none sm:text-lg">
                    {activeNavItem?.label ?? "Inicio"}
                  </h1>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Coreboard
                  </p>
                </div>
                {currentRole && (
                  <span className="text-xs text-muted-foreground sm:inline sm:text-sm">
                    Rol: <span className="capitalize">{currentRole}</span>
                  </span>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 py-6 lg:py-8">
            <div className="mx-auto flex w-full flex-col gap-6 px-4 sm:px-6 lg:px-8 max-w-[1320px] xl:max-w-[1380px] 2xl:max-w-[1440px]">
              <Suspense fallback={<div className="flex items-center justify-center py-12">Cargando...</div>}>
                {renderContent()}
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
        <ThemeBubble />
      </div>
    </SidebarProvider>
  );
}
