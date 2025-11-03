import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Appointment } from '../../types';

interface OperationsDashboardProps {
  appointments: Appointment[];
  selectedSalon: string | null;
}

export default function OperationsDashboard({ appointments, selectedSalon }: OperationsDashboardProps) {
  const filteredAppointments = useMemo(() => {
    if (!selectedSalon) return appointments;
    return appointments.filter(apt => {
      // Appointment del tipo usado en AppointmentCard tiene salonId, no salon_id
      return (apt as any).salonId === selectedSalon || apt.salon_id === selectedSalon;
    });
  }, [appointments, selectedSalon]);

  const productivityData = useMemo(() => {
    const map: Record<string, { revenue: number; count: number }> = {};
    filteredAppointments
      .filter(apt => apt.status === 'completed')
      .forEach(apt => {
        const stylist = (apt as any).stylist_name || 'Sin asignar';
        if (!map[stylist]) {
          map[stylist] = { revenue: 0, count: 0 };
        }
        map[stylist].revenue += apt.total_amount || 0;
        map[stylist].count += 1;
      });
    return Object.entries(map).map(([name, data]) => ({
      name,
      ingresos: data.revenue,
      turnos: data.count,
    }));
  }, [filteredAppointments]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Productividad por Profesional</CardTitle>
          <CardDescription>Ingresos y cantidad de turnos</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="ingresos" fill="#6366f1" name="Ingresos" />
              <Bar yAxisId="right" dataKey="turnos" fill="#ec4899" name="Turnos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

