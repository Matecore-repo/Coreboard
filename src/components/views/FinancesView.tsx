import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Sparkles, ArrowRight, CalendarRange, Wallet, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { PageContainer } from "../layout/PageContainer";
import { Section } from "../layout/Section";
import { SalonCarousel } from "../SalonCarousel";
import type { Salon } from "../../types/salon";
import { useAuth } from "../../contexts/AuthContext";
import { useFinancialPermissions } from "../../hooks/useFinancialPermissions";
import OwnerDashboard from "./OwnerDashboard";
import SalesMarketingDashboard from "./SalesMarketingDashboard";
import OperationsDashboard from "./OperationsDashboard";
import AccountingDashboard from "./AccountingDashboard";
import ClientDashboard from "./ClientDashboard";
import { motion, AnimatePresence } from "framer-motion";
import { applyTheme, getStoredTheme } from "../../lib/theme";
import { ShortcutBanner } from "../ShortcutBanner";
import { useCommandPaletteActions, CommandAction } from "../../contexts/CommandPaletteContext";
import { DateRangeFilter, buildDefaultPresets } from "../features/finances/DateRangeFilter";

interface FinancesViewProps {
  selectedSalon: string | null;
  salonName?: string;
  salons?: Salon[];
  onSelectSalon?: (salonId: string, salonName: string) => void;
}

type DateRange = {
  startDate: string;
  endDate: string;
};

export default function FinancesView({ selectedSalon, salonName, salons = [], onSelectSalon }: FinancesViewProps) {
  const { isDemo } = useAuth();
  const { canViewFinances } = useFinancialPermissions();
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [activeTab, setActiveTab] = useState<string>("owner");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      const stored = getStoredTheme();
      if (stored) return stored;
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  const datePresets = useMemo(() => buildDefaultPresets(), []);
  const filterCardRef = useRef<HTMLDivElement | null>(null);

  const tabItems = useMemo(
    () => [
      { id: "owner", label: "Propietario", description: "Resumen ejecutivo de ingresos, gastos y resultados" },
      { id: "sales", label: "Ventas y Marketing", description: "Embudo comercial, KPIs de adquisición y retención" },
      { id: "operations", label: "Operaciones", description: "Capacidad, productividad y cumplimiento diario" },
      { id: "accounting", label: "Finanzas/Contabilidad", description: "Estado de resultados, pagos, gastos y comisiones" },
      { id: "clients", label: "CRM/Clientes", description: "Fidelización, recurrencia y segmentación de clientela" },
    ],
    [],
  );

  const moveTab = useCallback(
    (direction: "next" | "prev") => {
      const currentIndex = tabItems.findIndex((item) => item.id === activeTab);
      if (currentIndex === -1) return;
      const newIndex = direction === "next"
        ? (currentIndex + 1) % tabItems.length
        : (currentIndex - 1 + tabItems.length) % tabItems.length;
      setActiveTab(tabItems[newIndex].id);
    },
    [activeTab, tabItems],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateFromDocument = () => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    };

    const stored = getStoredTheme();
    if (stored) {
      setTheme(stored);
    } else {
      updateFromDocument();
    }

    const handleThemeEvent = (event: Event) => {
      try {
        const detail = (event as CustomEvent<"light" | "dark">).detail;
        if (detail === "light" || detail === "dark") {
          setTheme(detail);
          return;
        }
      } catch {}
      updateFromDocument();
    };

    window.addEventListener("theme:changed", handleThemeEvent as EventListener);
    window.addEventListener("storage", updateFromDocument);

    return () => {
      window.removeEventListener("theme:changed", handleThemeEvent as EventListener);
      window.removeEventListener("storage", updateFromDocument);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isMod = event.metaKey || event.ctrlKey;

      if (isMod && key === "arrowright") {
        event.preventDefault();
        moveTab("next");
      }

      if (isMod && key === "arrowleft") {
        event.preventDefault();
        moveTab("prev");
      }

      if (isMod && event.shiftKey && key === "f") {
        event.preventDefault();
        setActiveTab("accounting");
      }

      if (isMod && key === "j") {
        event.preventDefault();
        filterCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        filterCardRef.current?.focus?.();
      }

      if (isMod && !event.shiftKey) {
        const match = tabItems.find((item) => item.label.charAt(0).toLowerCase() === key);
        if (match) {
          event.preventDefault();
          setActiveTab(match.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveTab, tabItems]);

  const handleThemeSwitch = useCallback((next: "light" | "dark") => {
    applyTheme(next);
    setTheme(next);
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent<"light" | "dark">("theme:changed", { detail: next }));
      } catch {}
    }
  }, []);

  const quickActions = useMemo<CommandAction[]>(() => {
    const tabActions: CommandAction[] = tabItems.map((item) => ({
      id: `finances-tab-${item.id}`,
      group: "Finanzas",
      label: item.label,
      description: item.description,
      shortcut: `Ctrl+${item.label.charAt(0).toLowerCase()}`,
      icon: <ArrowRight className="size-3.5" aria-hidden="true" />,
      onSelect: () => setActiveTab(item.id),
    }));

    const miscActions: CommandAction[] = [
      {
        id: "finances-go-accounting",
        group: "Finanzas",
        label: "Ir a Finanzas/Contabilidad",
        description: "Pagos, gastos, comisiones y exportaciones",
        shortcut: "Ctrl+Shift+F",
        icon: <Wallet className="size-3.5" aria-hidden="true" />,
        onSelect: () => setActiveTab("accounting"),
      },
      {
        id: "finances-edit-date-range",
        group: "Filtros",
        label: "Editar rango de fechas",
        description: "Enfoca el control de fechas para aplicar filtros",
        shortcut: "Ctrl+J",
        icon: <CalendarRange className="size-3.5" aria-hidden="true" />,
        onSelect: () => {
          filterCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
      },
    ];

    const preferenceActions: CommandAction[] = [
      {
        id: "finances-toggle-theme",
        group: "Preferencias",
        label: theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro",
        description:
          theme === "dark"
            ? "Iluminá la interfaz con tonos claros"
            : "Descansá la vista activando el modo oscuro",
        shortcut: "Ctrl+Alt+T",
        icon:
          theme === "dark" ? (
            <Sun className="size-3.5 text-yellow-400" aria-hidden="true" />
          ) : (
            <Moon className="size-3.5 text-indigo-500" aria-hidden="true" />
          ),
        onSelect: () => handleThemeSwitch(theme === "dark" ? "light" : "dark"),
      },
    ];

    return [...tabActions, ...miscActions, ...preferenceActions];
  }, [handleThemeSwitch, tabItems, theme]);

  useCommandPaletteActions(quickActions, [activeTab, theme]);
  
  // Validar permisos
  if (!isDemo && !canViewFinances) {
    return (
      <PageContainer>
        <Section title="Acceso Denegado" description={salonName}>
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg mb-2">No tienes permiso para ver esta sección</h3>
              <p className="text-muted-foreground mb-4">Solo los dueños pueden acceder a finanzas</p>
            </CardContent>
          </Card>
        </Section>
      </PageContainer>
    );
  }
  

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

        {salons.length > 0 && (
          <motion.section
            className="p-4 sm:p-6"
            role="region"
            aria-label="Selector de salón para finanzas"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <h2 className="mb-4 text-xl md:text-2xl font-semibold">Ver tus finanzas</h2>
            <div>
              <SalonCarousel 
                salons={salons}
                selectedSalon={selectedSalon}
                onSelectSalon={onSelectSalon || (() => {})}
              />
            </div>
          </motion.section>
        )}

        <motion.section
          className="mt-2"
          role="region"
          aria-label="Panel de finanzas"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.08 }}
        >
        <Section 
            title="Finanzas"
            description={salonName}
          >
            <div ref={filterCardRef} className="mb-6">
              <DateRangeFilter
                value={dateRange}
                presets={datePresets}
                onChange={(next) => {
                  setDateRange(next);
                }}
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 mt-6 mb-8" role="tablist" aria-label="Paneles de finanzas">
              <TabsList className="flex flex-wrap gap-2 rounded-xl bg-muted/60 p-1">
                {tabItems.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    aria-label={`Vista ${tab.label}`}
                    className="rounded-lg px-3 py-1.5 text-sm transition-all duration-150 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                {activeTab === "owner" && (
                  <TabsContent value="owner" role="tabpanel" aria-label="Dashboard de propietario" forceMount>
                    <motion.div
                      key="owner"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <OwnerDashboard 
                        selectedSalon={selectedSalon}
                        salonName={salonName}
                        dateRange={dateRange || undefined}
                      />
                    </motion.div>
                  </TabsContent>
                )}

                {activeTab === "sales" && (
                  <TabsContent value="sales" role="tabpanel" aria-label="Dashboard de ventas y marketing" forceMount>
                    <motion.div
                      key="sales"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <SalesMarketingDashboard 
                        selectedSalon={selectedSalon}
                        dateRange={dateRange || undefined}
                      />
                    </motion.div>
                  </TabsContent>
                )}

                {activeTab === "operations" && (
                  <TabsContent value="operations" role="tabpanel" aria-label="Dashboard de operaciones" forceMount>
                    <motion.div
                      key="operations"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <OperationsDashboard 
                        selectedSalon={selectedSalon}
                        dateRange={dateRange || undefined}
                      />
                    </motion.div>
                  </TabsContent>
                )}

                {activeTab === "accounting" && (
                  <TabsContent value="accounting" role="tabpanel" aria-label="Dashboard de finanzas y contabilidad" forceMount>
                    <motion.div
                      key="accounting"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <AccountingDashboard 
                        selectedSalon={selectedSalon}
                        dateRange={dateRange || undefined}
                      />
                    </motion.div>
                  </TabsContent>
                )}

                {activeTab === "clients" && (
                  <TabsContent value="clients" role="tabpanel" aria-label="Dashboard de CRM y clientes" forceMount>
                    <motion.div
                      key="clients"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <ClientDashboard 
                        selectedSalon={selectedSalon}
                        dateRange={dateRange || undefined}
                      />
                    </motion.div>
                  </TabsContent>
                )}
              </AnimatePresence>
            </Tabs>
          </Section>
        </motion.section>
      </div>
    </PageContainer>
  );
}