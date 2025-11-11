import React, { useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../ui/carousel';
import { useTurnos } from '../../hooks/useTurnos';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../contexts/AuthContext';
import { useFinancialExports } from '../../hooks/useFinancialExports';
import { toastSuccess, toastError } from '../../lib/toast';
import type { Appointment } from '../../types';

interface ClientDashboardProps {
  selectedSalon: string | null;
  dateRange?: { startDate: string; endDate: string };
  onExportReady?: (exporter: (() => Promise<void>) | null) => void;
}

export default function ClientDashboard({ selectedSalon, dateRange, onExportReady }: ClientDashboardProps) {
  const { exportToExcel } = useFinancialExports();
  const effectiveSalonId = selectedSalon && selectedSalon !== 'all' ? selectedSalon : null;
  const { turnos } = useTurnos({ salonId: effectiveSalonId || undefined, enabled: true });
  const { currentOrgId } = useAuth();
  const { clients } = useClients(currentOrgId ?? undefined);
  
  // Convertir turnos a appointments para compatibilidad
  const allAppointments = useMemo(() => {
    let appointments = turnos.map(t => ({
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
      org_id: t.org_id,
      salon_id: t.salonId,
      service_id: '',
      client_name: t.clientName,
      starts_at: `${t.date}T${t.time}:00`,
      total_amount: t.total_amount || 0,
    } as unknown as Appointment));
    
    // Filtrar por rango de fechas si está definido
    if (dateRange) {
      appointments = appointments.filter(apt => {
        const aptDate = (apt as any).date || (apt.starts_at ? apt.starts_at.split('T')[0] : '');
        return aptDate >= dateRange.startDate && aptDate <= dateRange.endDate;
      });
    }
    
    if (effectiveSalonId) {
      appointments = appointments.filter(apt => {
        const salonId = (apt as any).salonId || apt.salon_id;
        return salonId === effectiveSalonId;
      });
    }

    return appointments;
  }, [turnos, dateRange, effectiveSalonId]);

  const topClients = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number; clientId?: string }> = {};
    
    // Obtener nombres de clientes de la tabla clients para priorizar clientes registrados
    const clientNamesMap = new Map(clients.map(c => [c.full_name.toLowerCase(), c.id]));
    
    allAppointments
      .filter(apt => apt.status === 'completed')
      .forEach(apt => {
        const clientName = (apt as any).clientName || (apt as any).client_name || 'Sin nombre';
        const clientNameLower = clientName.toLowerCase();
        
        if (!map[clientNameLower]) {
          map[clientNameLower] = { 
            name: clientName, 
            count: 0, 
            revenue: 0,
            clientId: clientNamesMap.get(clientNameLower)
          };
        }
        map[clientNameLower].count += 1;
        map[clientNameLower].revenue += (apt as any).total_amount || 0;
      });

    // Ordenar por revenue, pero priorizar clientes registrados si tienen el mismo revenue
    return Object.values(map)
      .sort((a, b) => {
        if (a.revenue !== b.revenue) {
          return b.revenue - a.revenue;
        }
        // Si tienen el mismo revenue, priorizar clientes registrados
        if (a.clientId && !b.clientId) return -1;
        if (!a.clientId && b.clientId) return 1;
        return 0;
      })
      .slice(0, 10)
      .map(({ clientId, ...rest }) => rest); // Remover clientId del resultado final
  }, [allAppointments, clients]);

  const abandonmentRisk = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clientLastVisit: Record<string, Date> = {};
    
    // Primero, obtener última visita de todos los clientes desde turnos
    allAppointments.forEach(apt => {
      const clientName = (apt as any).clientName || (apt as any).client_name || 'Sin nombre';
      const aptDate = (apt as any).date 
        ? new Date(`${(apt as any).date}T${(apt as any).time || '00:00'}:00`)
        : new Date((apt as any).starts_at || new Date());
      if (!clientLastVisit[clientName] || aptDate > clientLastVisit[clientName]) {
        clientLastVisit[clientName] = aptDate;
      }
    });
    
    // Filtrar clientes que tienen más de 30 días sin visita Y que existen en la tabla clients
    const clientNamesInClients = new Set(clients.map(c => c.full_name.toLowerCase()));
    
    return Object.entries(clientLastVisit)
      .filter(([name, lastVisit]) => {
        // Solo incluir clientes que existen en la tabla clients y tienen más de 30 días sin visita
        return clientNamesInClients.has(name.toLowerCase()) && lastVisit < thirtyDaysAgo;
      })
      .map(([name, lastVisit]) => ({
        name,
        daysSinceLastVisit: Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit)
      .slice(0, 10);
  }, [allAppointments, clients]);

  const clientHighlights = useMemo(() => {
    const totalClients = clients.length;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const parseAppointmentDate = (apt: Appointment) => {
      const startsAt = (apt as any).starts_at;
      if (startsAt) {
        const parsed = new Date(startsAt);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      const date = (apt as any).date;
      if (date) {
        const time = (apt as any).time || "00:00";
        const combined = new Date(`${date}T${time}:00`);
        if (!Number.isNaN(combined.getTime())) {
          return combined;
        }
      }
      return null;
    };

    const getClientName = (apt: Appointment) => {
      const raw =
        (apt as any).clientName ||
        (apt as any).client_name ||
        "Sin nombre";
      if (typeof raw === "string" && raw.trim().length > 0) {
        return raw.trim();
      }
      return "Sin nombre";
    };

    const formatNumber = (value: number) =>
      value.toLocaleString("es-AR");

    const formatCurrency = (value: number) => {
      if (!Number.isFinite(value)) {
        return "$0";
      }
      return `$${Math.round(value).toLocaleString("es-AR")}`;
    };

    const completedAppointments = allAppointments.filter(
      (apt) => apt.status === "completed",
    );

    let totalRevenue = 0;
    const activeClientKeys = new Set<string>();
    const completedCounts = new Map<string, number>();

    allAppointments.forEach((apt) => {
      const name = getClientName(apt);
      const key = name.toLowerCase();
      const aptDate = parseAppointmentDate(apt);
      if (aptDate && aptDate >= thirtyDaysAgo) {
        activeClientKeys.add(key);
      }
    });

    completedAppointments.forEach((apt) => {
      const name = getClientName(apt);
      const key = name.toLowerCase();
      const aptDate = parseAppointmentDate(apt);

      if (aptDate && aptDate >= thirtyDaysAgo) {
        activeClientKeys.add(key);
      }

      const currentCount = completedCounts.get(key) ?? 0;
      completedCounts.set(key, currentCount + 1);
      totalRevenue += (apt as any).total_amount || 0;
    });

    const returningClientsCount = Array.from(completedCounts.values()).filter(
      (count) => count > 1,
    ).length;

    const averageTicket =
      completedAppointments.length > 0
        ? totalRevenue / completedAppointments.length
        : 0;

    return [
      {
        id: "total-clients",
        title: "Clientes totales",
        value: formatNumber(totalClients),
        description: `${formatNumber(activeClientKeys.size)} activos últimos 30 días`,
      },
      {
        id: "active-clients",
        title: "Clientes activos",
        value: formatNumber(activeClientKeys.size),
        description: "Visitaron el salón en los últimos 30 días",
      },
      {
        id: "at-risk-clients",
        title: "Clientes en riesgo",
        value: formatNumber(abandonmentRisk.length),
        description: "Sin visita hace más de 30 días",
      },
      {
        id: "revenue",
        title: "Ingresos por turnos",
        value: formatCurrency(totalRevenue),
        description: `Ticket promedio ${formatCurrency(averageTicket)}`,
      },
      {
        id: "returning-clients",
        title: "Clientes recurrentes",
        value: formatNumber(returningClientsCount),
        description: "Realizaron 2 o más turnos completados",
      },
    ];
  }, [clients, allAppointments, abandonmentRisk]);

  const handleExport = useCallback(async () => {
    try {
      const exportData = {
        'Top Clientes': topClients.map((client, index) => ({
          'Ranking': index + 1,
          'Cliente': client.name,
          'Cantidad de Turnos': client.count,
          'Ingresos Totales': client.revenue,
        })),
        'Riesgo de Abandono': abandonmentRisk.map(client => ({
          'Cliente': client.name,
          'Días desde Última Visita': client.daysSinceLastVisit,
        })),
      };
      
      await exportToExcel(exportData, `clientes_${new Date().toISOString().split('T')[0]}`);
      toastSuccess('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toastError('Error al exportar los datos');
    }
  }, [abandonmentRisk, exportToExcel, topClients]);

  useEffect(() => {
    if (!onExportReady) return;
    onExportReady(handleExport);
    return () => onExportReady(null);
  }, [handleExport, onExportReady]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumen de clientes</CardTitle>
          <CardDescription>Indicadores clave del CRM en tiempo real.</CardDescription>
        </CardHeader>
        <CardContent>
          <Carousel opts={{ align: "start" }} className="w-full">
            <CarouselContent>
              {clientHighlights.map((item) => (
                <CarouselItem
                  key={item.id}
                  className="basis-full md:basis-1/2 lg:basis-1/3"
                >
                  <div className="h-full p-2">
                    <div className="flex h-full flex-col justify-between rounded-xl border border-border/60 bg-card/80 p-6 shadow-sm">
                      <span className="text-sm font-medium text-muted-foreground">
                        {item.title}
                      </span>
                      <span className="text-3xl font-semibold text-foreground">
                        {item.value}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Clientes</CardTitle>
          <CardDescription>Clientes con mayor valor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topClients.map((client, index) => (
              <div key={client.name} className="flex justify-between items-center p-2 border rounded">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">#{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.count} turnos</p>
                  </div>
                </div>
                <span className="font-semibold">${client.revenue.toLocaleString()}</span>
              </div>
            ))}
            {topClients.length === 0 && (
              <p className="text-muted-foreground text-sm">No hay datos de clientes</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riesgo de Abandono</CardTitle>
          <CardDescription>Clientes que no han visitado en más de 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {abandonmentRisk.map(client => (
              <div key={client.name} className="flex justify-between items-center p-2 border rounded">
                <span className="text-sm">{client.name}</span>
                <span className="text-sm text-muted-foreground">{client.daysSinceLastVisit} días</span>
              </div>
            ))}
            {abandonmentRisk.length === 0 && (
              <p className="text-muted-foreground text-sm">No hay clientes en riesgo</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

