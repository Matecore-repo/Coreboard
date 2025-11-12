import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Sparkles } from "lucide-react";
import { ShortcutBanner } from "../ShortcutBanner";
import { SalonCarousel } from "../SalonCarousel";
import { FilterBar } from "../FilterBar";
import { TurnosTable } from "../features/appointments/TurnosTable";
import { PageContainer } from "../layout/PageContainer";
import type { Appointment } from "../features/appointments/AppointmentCard";
import type { Salon } from "../../types/salon";
import type { Turno, TurnosFilters } from "../../stores/turnosStore";
import { toastDismiss, toastPromise } from "../../lib/toast";
import { Spinner } from "../ui/spinner";

export interface TurnosViewProps {
  isDemo: boolean;
  salons: Salon[];
  selectedSalon: string | null;
  onSelectSalon: (salonId: string, salonName: string) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  selectedAppointmentId?: string | null;
  demoAppointments: Appointment[];
  remoteTurnos: Turno[];
  isLoading: boolean;
  onSyncRemoteFilters?: (filters: Partial<TurnosFilters>) => void;
  onSyncSelectedSalon?: (salonId: string | null) => void;
}

function mapTurnoToAppointment(turno: Turno): Appointment {
  return {
    id: turno.id,
    clientName: turno.clientName,
    service: turno.service || "—",
    date: turno.date,
    time: turno.time,
    status: turno.status,
    stylist: turno.stylist || "Sin asignar",
    salonId: turno.salonId,
    notes: turno.notes ?? undefined,
  };
}

interface FilterOptions {
  salonId: string;
  statusFilter: Appointment["status"] | "all";
  stylistFilter: string;
  dateFilter: string;
  searchQuery: string;
}

function filterAppointmentsList(
  source: Appointment[],
  {
    salonId,
    statusFilter,
    stylistFilter,
    dateFilter,
    searchQuery,
  }: FilterOptions,
): Appointment[] {
  if (source.length === 0) {
    return [];
  }

  const hasSalonFilter = salonId !== "all" && !!salonId;
  const hasStatusFilter = statusFilter !== "all";
  const hasStylistFilter = stylistFilter !== "all";
  const hasDateFilter = dateFilter !== "all";
  const hasSearchQuery = searchQuery.length > 0;

  if (
    !hasSalonFilter &&
    !hasStatusFilter &&
    !hasStylistFilter &&
    !hasDateFilter &&
    !hasSearchQuery
  ) {
    return source;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getTomorrow = (() => {
    let cached: Date | null = null;
    return () => {
      if (!cached) {
        cached = new Date(today);
        cached.setDate(cached.getDate() + 1);
      }
      return cached;
    };
  })();

  const getWeekFromNow = (() => {
    let cached: Date | null = null;
    return () => {
      if (!cached) {
        cached = new Date(today);
        cached.setDate(cached.getDate() + 7);
      }
      return cached;
    };
  })();

  const getMonthFromNow = (() => {
    let cached: Date | null = null;
    return () => {
      if (!cached) {
        cached = new Date(today);
        cached.setMonth(cached.getMonth() + 1);
      }
      return cached;
    };
  })();

  const matchesDate = (apt: Appointment) => {
    if (!hasDateFilter) return true;

    const appointmentDate = new Date(`${apt.date}T00:00:00`);
    appointmentDate.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case "today":
        return appointmentDate.getTime() === today.getTime();
      case "tomorrow":
        return appointmentDate.getTime() === getTomorrow().getTime();
      case "week": {
        const weekLimit = getWeekFromNow();
        return appointmentDate >= today && appointmentDate <= weekLimit;
      }
      case "month": {
        const monthLimit = getMonthFromNow();
        return appointmentDate >= today && appointmentDate <= monthLimit;
      }
      default:
        return apt.date === dateFilter;
    }
  };

  return source.filter((apt) => {
    if (hasSalonFilter && apt.salonId !== salonId) {
      return false;
    }

    if (hasStatusFilter && apt.status !== statusFilter) {
      return false;
    }

    if (hasStylistFilter && apt.stylist !== stylistFilter) {
      return false;
    }

    if (!matchesDate(apt)) {
      return false;
    }

    if (hasSearchQuery) {
      const matchesSearch =
        apt.clientName.toLowerCase().includes(searchQuery) ||
        (apt.service || "").toLowerCase().includes(searchQuery);
      if (!matchesSearch) {
        return false;
      }
    }

    return true;
  });
}

function buildAppointmentSummary(list: Appointment[]) {
  const summary = {
    total: list.length,
    today: 0,
    upcoming: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };

  if (list.length === 0) {
    return summary;
  }

  const todayStr = new Date().toISOString().split("T")[0];

  list.forEach((apt) => {
    if (apt.status in summary) {
      summary[apt.status as keyof typeof summary] += 1;
    }
    if (apt.date === todayStr) {
      summary.today += 1;
    } else if (apt.date > todayStr) {
      summary.upcoming += 1;
    }
  });

  return summary;
}

export function TurnosView({
  isDemo,
  salons,
  selectedSalon,
  onSelectSalon,
  onSelectAppointment,
  selectedAppointmentId,
  demoAppointments,
  remoteTurnos,
  isLoading,
  onSyncRemoteFilters,
  onSyncSelectedSalon,
}: TurnosViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Appointment["status"] | "all">(
    "all",
  );
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [stylistFilter, setStylistFilter] = useState<string>("all");
  const [isPendingTransition, startTransition] = useTransition();
  const [delayComplete, setDelayComplete] = useState(false);

  const deferredSearch = useDeferredValue(searchQuery);
  const normalizedSalonId = selectedSalon ?? "all";

  const remoteAppointments = useMemo<Appointment[]>(() => {
    if (remoteTurnos.length === 0) return [];
    return remoteTurnos.map(mapTurnoToAppointment);
  }, [remoteTurnos]);

  const sourceAppointments = useMemo<Appointment[]>(() => {
    return isDemo ? demoAppointments : remoteAppointments;
  }, [demoAppointments, isDemo, remoteAppointments]);

  const stylistOptions = useMemo(() => {
    const unique = new Set<string>();
    sourceAppointments.forEach((apt) => {
      if (apt.stylist) {
        unique.add(apt.stylist);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [sourceAppointments]);

  const deferredSearchLower = deferredSearch.trim().toLowerCase();

  const filteredAppointments = useMemo(
    () =>
      filterAppointmentsList(sourceAppointments, {
        salonId: normalizedSalonId,
        statusFilter,
        stylistFilter,
        dateFilter,
        searchQuery: deferredSearchLower,
      }),
    [
      sourceAppointments,
      normalizedSalonId,
      statusFilter,
      stylistFilter,
      dateFilter,
      deferredSearchLower,
    ],
  );

  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDelayRef = useRef(false);
  const isMountedRef = useRef(true);
  const initialDelayShownRef = useRef(false);
  const delayToastIdRef = useRef<string>("turnos-loading-toast");

  const triggerDelay = useCallback(
    (message: string) => {
      if (pendingDelayRef.current) {
        return;
      }

      pendingDelayRef.current = true;
      setDelayComplete(false);

      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }

      const delayPromise = new Promise<void>((resolve) => {
        delayTimeoutRef.current = setTimeout(() => {
          resolve();
        }, 2000);
      });

      toastDismiss(delayToastIdRef.current);
      toastPromise(
        delayPromise,
        {
          loading: message,
          success: "Turnos listos",
          error: "No se pudieron preparar los turnos",
        },
        {
          id: delayToastIdRef.current,
        },
      );

      delayPromise
        .then(() => {
          if (isMountedRef.current) {
            setDelayComplete(true);
          }
        })
        .finally(() => {
          pendingDelayRef.current = false;
          if (delayTimeoutRef.current) {
            clearTimeout(delayTimeoutRef.current);
            delayTimeoutRef.current = null;
          }
        });
    },
    [setDelayComplete],
  );

  useEffect(() => {
    isMountedRef.current = true;
    if (!initialDelayShownRef.current) {
      initialDelayShownRef.current = true;
      triggerDelay("Preparando turnos...");
    }

    return () => {
      isMountedRef.current = false;
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
      pendingDelayRef.current = false;
      delayTimeoutRef.current = null;
      toastDismiss(delayToastIdRef.current);
    };
  }, [triggerDelay]);

  useEffect(() => {
    if (isLoading) {
      triggerDelay("Actualizando turnos...");
    }
  }, [isLoading, triggerDelay]);

  const sanitizedAppointments = useMemo(
    () =>
      filteredAppointments.filter(
        (appointment) =>
          Boolean(appointment?.id) &&
          Boolean(appointment?.salonId) &&
          Boolean(appointment?.date) &&
          Boolean(appointment?.time) &&
          Boolean(appointment?.clientName?.trim()),
      ),
    [filteredAppointments],
  );

  const appointmentSummary = useMemo(
    () => buildAppointmentSummary(sanitizedAppointments),
    [sanitizedAppointments],
  );

  const remoteFilters = useMemo<Partial<TurnosFilters> | null>(() => {
    if (isDemo) return null;

    const filters: Partial<TurnosFilters> = {
      salonId: normalizedSalonId,
      status: statusFilter,
      employeeId: stylistFilter,
      text: deferredSearchLower || undefined,
      date: dateFilter === "all" ? undefined : dateFilter,
    };

    return filters;
  }, [
    isDemo,
    normalizedSalonId,
    statusFilter,
    stylistFilter,
    deferredSearchLower,
    dateFilter,
  ]);

  useEffect(() => {
    if (!isDemo && onSyncSelectedSalon) {
      onSyncSelectedSalon(normalizedSalonId === "all" ? null : normalizedSalonId);
    }
  }, [isDemo, normalizedSalonId, onSyncSelectedSalon]);

  useEffect(() => {
    if (!isDemo && remoteFilters && onSyncRemoteFilters) {
      onSyncRemoteFilters(remoteFilters);
    }
  }, [isDemo, remoteFilters, onSyncRemoteFilters]);

  const handleSearchChange = useCallback(
    (value: string) => {
      startTransition(() => {
        setSearchQuery(value);
      });
    },
    [startTransition],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      startTransition(() => {
        setStatusFilter(value as Appointment["status"] | "all");
      });
    },
    [startTransition],
  );

  const handleDateChange = useCallback(
    (value: string) => {
      startTransition(() => {
        setDateFilter(value);
      });
    },
    [startTransition],
  );

  const handleStylistChange = useCallback(
    (value: string) => {
      startTransition(() => {
        setStylistFilter(value);
      });
    },
    [startTransition],
  );

  const selectedSalonName = useMemo(() => {
    if (normalizedSalonId === "all") {
      return "Todos los locales";
    }
    if (!selectedSalon) {
      return "Ninguna peluquería seleccionada";
    }
    const target = salons.find((salon) => salon.id === selectedSalon);
    return target?.name ?? "Local sin nombre";
  }, [normalizedSalonId, selectedSalon, salons]);

  const emptyLabel =
    normalizedSalonId === "all" || !selectedSalon
      ? "No se encontraron turnos. Ajusta los filtros o verifica que tus locales tengan disponibilidad."
      : "No se encontraron turnos para esta sucursal.";

  const effectiveLoading = isLoading || isPendingTransition || !delayComplete;

  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        <ShortcutBanner
          icon={<Sparkles className="size-4 text-primary" aria-hidden="true" />}
          message={
            <>
              Usa <span className="font-semibold">Ctrl + K</span> o{" "}
              <span className="font-semibold">Ctrl + B</span> para abrir la paleta de
              comandos.
            </>
          }
        />
        <div className="p-4 sm:p-6">
          <div className="mb-4">
            <SalonCarousel
              salons={salons}
              selectedSalon={selectedSalon}
              onSelectSalon={onSelectSalon}
            />
          </div>
          <div className="mt-4">
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusChange}
              dateFilter={dateFilter}
              onDateFilterChange={handleDateChange}
              stylistFilter={stylistFilter}
              onStylistFilterChange={handleStylistChange}
              stylistOptions={stylistOptions}
            />
          </div>
          <div className="mt-4">
            {salons.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="text-muted-foreground mb-2">
                  Aún no hay locales cargados
                </div>
                <p className="text-sm text-muted-foreground">
                  Crea tu primer local para comenzar a agendar turnos.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 py-4">
                  <h2 className="text-xl md:text-2xl">Lista de Turnos</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground">
                      Total:{" "}
                      <span className="font-medium text-foreground">
                        {appointmentSummary.total}
                      </span>
                    </span>
                    <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground">
                      Hoy:{" "}
                      <span className="font-medium text-foreground">
                        {appointmentSummary.today}
                      </span>
                    </span>
                    <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground">
                      Confirmados:{" "}
                      <span className="font-medium text-foreground">
                        {appointmentSummary.confirmed}
                      </span>
                    </span>
                    <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground">
                      Pendientes:{" "}
                      <span className="font-medium text-foreground">
                        {appointmentSummary.pending}
                      </span>
                    </span>
                    <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground">
                      Finalizados:{" "}
                      <span className="font-medium text-foreground">
                        {appointmentSummary.completed}
                      </span>
                    </span>
                  </div>
                </div>
              {effectiveLoading && (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="text-primary" />
                  <span>Cargando turnos…</span>
                </div>
              )}
                <div className="space-y-6">
                  <TurnosTable
                    appointments={sanitizedAppointments}
                    isLoading={effectiveLoading}
                    onRowClick={onSelectAppointment}
                    selectedAppointmentId={selectedAppointmentId}
                    emptyLabel={emptyLabel}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default TurnosView;

