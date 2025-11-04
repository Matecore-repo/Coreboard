import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinancialExports } from '../../hooks/useFinancialExports';
import { toast } from 'sonner';
import type { Appointment } from '../../types';

interface SalesMarketingDashboardProps {
  appointments: Appointment[];
  selectedSalon: string | null;
}

export default function SalesMarketingDashboard({ appointments, selectedSalon }: SalesMarketingDashboardProps) {
  const { exportToExcel } = useFinancialExports();
  
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

  const handleExport = async () => {
    try {
      const exportData = {
        'Nuevos vs Recurrentes': newVsRecurrentData.map(d => ({
          'Tipo': d.name,
          'Cantidad': d.value,
        })),
        'Fuente de Reserva': bookingSourceData.map(d => ({
          'Fuente': d.name,
          'Cantidad de Turnos': d.value,
        })),
      };
      
      await exportToExcel(exportData, `ventas_marketing_${new Date().toISOString().split('T')[0]}`);
      toast.success('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar los datos');
    }
  };

  return (
    <div className="space-y-6">
      {/* Botón de exportación */}
      <div className="flex justify-end">
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar a Excel
        </Button>
      </div>
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

