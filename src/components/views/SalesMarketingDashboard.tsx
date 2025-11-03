import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Appointment } from '../../types';

interface SalesMarketingDashboardProps {
  appointments: Appointment[];
  selectedSalon: string | null;
}

export default function SalesMarketingDashboard({ appointments, selectedSalon }: SalesMarketingDashboardProps) {
  const filteredAppointments = useMemo(() => {
    if (!selectedSalon) return appointments;
    return appointments.filter(apt => apt.salon_id === selectedSalon);
  }, [appointments, selectedSalon]);

  const newVsRecurrentData = useMemo(() => {
    const newClients = filteredAppointments.filter(apt => (apt as any).is_new_client).length;
    const recurrentClients = filteredAppointments.length - newClients;
    return [
      { name: 'Nuevos', value: newClients },
      { name: 'Recurrentes', value: recurrentClients },
    ];
  }, [filteredAppointments]);

  const bookingSourceData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAppointments.forEach(apt => {
      const source = (apt as any).booking_source || 'mostrador';
      map[source] = (map[source] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredAppointments]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevos vs Recurrentes</CardTitle>
          <CardDescription>Distribución de clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={newVsRecurrentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#6366f1" name="Cantidad" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fuente de Reserva</CardTitle>
          <CardDescription>Origen de los turnos</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bookingSourceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#ec4899" name="Turnos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

