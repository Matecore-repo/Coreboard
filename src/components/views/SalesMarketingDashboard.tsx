import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTurnos } from '../../hooks/useTurnos';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../contexts/AuthContext';
import { useFinancialExports } from '../../hooks/useFinancialExports';
import { toastSuccess, toastError } from '../../lib/toast';
import type { Appointment } from '../../types';

interface SalesMarketingDashboardProps {
  selectedSalon: string | null;
  dateRange?: { startDate: string; endDate: string };
}

export default function SalesMarketingDashboard({ selectedSalon, dateRange }: SalesMarketingDashboardProps) {
  const { exportToExcel } = useFinancialExports();
  const effectiveSalonId = selectedSalon && selectedSalon !== 'all' ? selectedSalon : null;
  const { turnos } = useTurnos({ salonId: effectiveSalonId || undefined, enabled: true });
  const { currentOrgId } = useAuth();
  const { clients } = useClients(currentOrgId ?? undefined);
  
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
    let filtered = appointments;
    
    // Filtrar por salon
    if (effectiveSalonId) {
      filtered = filtered.filter(apt => apt.salon_id === effectiveSalonId || (apt as any).salonId === effectiveSalonId);
    }
    
    // Filtrar por rango de fechas
    if (dateRange) {
      filtered = filtered.filter(apt => {
        const aptDate = (apt as any).date || (apt.starts_at ? apt.starts_at.split('T')[0] : '');
        return aptDate >= dateRange.startDate && aptDate <= dateRange.endDate;
      });
    }
    
    return filtered;
  }, [appointments, dateRange, effectiveSalonId]);

  const newVsRecurrentData = useMemo(() => {
    // Calcular nuevos clientes basándose en clientes creados en el período de fechas
    let newClientsCount = 0;
    let recurrentClientsCount = 0;
    
    if (dateRange) {
      // Clientes creados en el período de fechas
      const clientsCreatedInPeriod = clients.filter(client => {
        if (!client.created_at) return false;
        const createdDate = new Date(client.created_at).toISOString().split('T')[0];
        return createdDate >= dateRange.startDate && createdDate <= dateRange.endDate;
      });
      
      // Obtener nombres de clientes nuevos
      const newClientNames = new Set(clientsCreatedInPeriod.map(c => c.full_name.toLowerCase()));
      
      // Contar turnos: nuevos vs recurrentes
      filteredAppointments.forEach(apt => {
        const clientName = ((apt as any).clientName || (apt as any).client_name || '').toLowerCase();
        if (newClientNames.has(clientName)) {
          newClientsCount++;
        } else {
          recurrentClientsCount++;
        }
      });
    } else {
      // Si no hay rango de fechas, usar todos los clientes vs turnos
      const allClientNames = new Set(clients.map(c => c.full_name.toLowerCase()));
      filteredAppointments.forEach(apt => {
        const clientName = ((apt as any).clientName || (apt as any).client_name || '').toLowerCase();
        if (allClientNames.has(clientName)) {
          recurrentClientsCount++;
        } else {
          newClientsCount++;
        }
      });
    }
    
    return [
      { name: 'Nuevos', value: newClientsCount },
      { name: 'Recurrentes', value: recurrentClientsCount },
    ];
  }, [filteredAppointments, clients, dateRange]);

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
      toastSuccess('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toastError('Error al exportar los datos');
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

