import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAppointments } from '../../hooks/useAppointments';
import type { Appointment } from '../../types';

interface ClientDashboardProps {
  appointments: Appointment[];
  selectedSalon: string | null;
}

export default function ClientDashboard({ appointments, selectedSalon }: ClientDashboardProps) {
  const { appointments: allAppointments } = useAppointments(selectedSalon || undefined, { enabled: true });

  const topClients = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    
    allAppointments
      .filter(apt => apt.status === 'completed')
      .forEach(apt => {
        // Appointment del tipo usado en AppointmentCard tiene clientName, no client_name
        const clientName = (apt as any).clientName || apt.client_name || 'Sin nombre';
        if (!map[clientName]) {
          map[clientName] = { name: clientName, count: 0, revenue: 0 };
        }
        map[clientName].count += 1;
        map[clientName].revenue += (apt as any).total_amount || apt.total_amount || 0;
      });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [allAppointments]);

  const abandonmentRisk = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clientLastVisit: Record<string, Date> = {};
    
    allAppointments.forEach(apt => {
      // Appointment del tipo usado en AppointmentCard tiene clientName y date, no client_name y starts_at
      const clientName = (apt as any).clientName || apt.client_name || 'Sin nombre';
      const aptDate = (apt as any).date 
        ? new Date(`${(apt as any).date}T${(apt as any).time || '00:00'}:00`)
        : new Date(apt.starts_at || new Date());
      if (!clientLastVisit[clientName] || aptDate > clientLastVisit[clientName]) {
        clientLastVisit[clientName] = aptDate;
      }
    });

    return Object.entries(clientLastVisit)
      .filter(([_, lastVisit]) => lastVisit < thirtyDaysAgo)
      .map(([name, lastVisit]) => ({
        name,
        daysSinceLastVisit: Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit)
      .slice(0, 10);
  }, [allAppointments]);

  return (
    <div className="space-y-6">
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

