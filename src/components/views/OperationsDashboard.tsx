import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTurnos } from '../../hooks/useTurnos';
import { useFinancialExports } from '../../hooks/useFinancialExports';
import { toast } from 'sonner';
import type { Appointment } from '../../types';

interface OperationsDashboardProps {
  selectedSalon: string | null;
}

export default function OperationsDashboard({ selectedSalon }: OperationsDashboardProps) {
  const { exportToExcel } = useFinancialExports();
  const { turnos } = useTurnos({ salonId: selectedSalon || undefined, enabled: true });
  
  // Convertir turnos a appointments para compatibilidad
  const appointments = useMemo(() => {
    return turnos.map(t => ({
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
  }, [turnos]);
  
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

  const handleExport = async () => {
    try {
      const exportData = {
        'Productividad por Profesional': productivityData.map(d => ({
          'Profesional': d.name,
          'Ingresos': d.ingresos,
          'Cantidad de Turnos': d.turnos,
        })),
      };
      
      await exportToExcel(exportData, `operaciones_${new Date().toISOString().split('T')[0]}`);
      toast.success('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar los datos');
    }
  };

  return (
    <div className="space-y-6">
      {/* Botón de exportación */}
      <div className="flex justify-end my-4">
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar a Excel
        </Button>
      </div>
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

