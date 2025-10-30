import React, { useMemo } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users,
  Calendar,
  Clock,
  Target,
  Activity,
  Award,
  UserCheck,
  UserX,
  Repeat,
  Scissors,
  AlertCircle,
  Download
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { lazy, Suspense } from "react";

const BarChartComponent = lazy(() => import("../features/finances/FinancesCharts").then(m => ({ default: m.BarChartComponent })));
const AreaChartComponent = lazy(() => import("../features/finances/FinancesCharts").then(m => ({ default: m.AreaChartComponent })));
const PieChartComponent = lazy(() => import("../features/finances/FinancesCharts").then(m => ({ default: m.PieChartComponent })));
import { Appointment } from "../features/appointments/AppointmentCard";
import { toast } from "sonner";

interface FinancesViewProps {
  appointments: Appointment[];
  selectedSalon: string | null;
  salonName?: string;
}

// Función para exportar a Excel (CSV)
const exportToExcel = (data: any[], filename: string) => {
  const headers = Object.keys(data[0] || {});
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Precios base por servicio (solo para referencia si no hay datos reales)
const servicePrices: Record<string, number> = {
  "Corte": 3500,
  "Coloración": 6500,
  "Peinado": 4000,
  "Barba": 2000,
  "Mechas": 7000,
};

// Gastos mensuales base (el usuario debe definir estos)
const monthlyExpenses = {
  rent: 0,
  supplies: 0,
  salaries: 0,
  utilities: 0,
  marketing: 0,
};

// Paleta de colores moderna y vibrante
const COLORS = [
  '#6366f1', // indigo-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#10b981', // emerald-500
];

export default function FinancesView({ appointments, selectedSalon, salonName }: FinancesViewProps) {
  // Calcular ingresos solo de turnos completados
  const completedAppointments = useMemo(() => {
    return appointments
      .filter(apt => apt.status === "completed" && (!selectedSalon || apt.salonId === selectedSalon))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, selectedSalon]);

  // Calcular total de ingresos
  const totalRevenue = useMemo(() => {
    return completedAppointments.reduce((sum, apt) => {
      return sum + (servicePrices[apt.service] || 0);
    }, 0);
  }, [completedAppointments]);

  // Calcular ingresos por servicio
  const revenueByService = useMemo(() => {
    const map: Record<string, number> = {};
    completedAppointments.forEach(apt => {
      map[apt.service] = (map[apt.service] || 0) + (servicePrices[apt.service] || 0);
    });
    return Object.entries(map)
      .map(([name, revenue]) => ({ name, revenue, count: completedAppointments.filter(a => a.service === name).length }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [completedAppointments]);

  // Ingresos por día
  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {};
    completedAppointments.forEach(apt => {
      map[apt.date] = (map[apt.date] || 0) + (servicePrices[apt.service] || 0);
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue }));
  }, [completedAppointments]);

  const totalExpenses = Object.values(monthlyExpenses).reduce((a, b) => a + b, 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Finanzas</h1>
          <p className="text-muted-foreground">{salonName}</p>
        </div>
      </div>

      {completedAppointments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Sin datos de finanzas</h3>
            <p className="text-muted-foreground mb-4">Completa turnos para ver reportes de finanzas</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                    <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Turnos Completados</p>
                    <p className="text-2xl font-bold">{completedAppointments.length}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Promedio por Turno</p>
                    <p className="text-2xl font-bold">${(totalRevenue / completedAppointments.length).toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Turnos Completados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Turnos Completados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {completedAppointments.map(apt => (
                  <div key={apt.id} className="flex justify-between items-center p-2 bg-muted/20 rounded">
                    <div>
                      <p className="font-medium text-sm">{apt.clientName}</p>
                      <p className="text-xs text-muted-foreground">{apt.service} - {apt.date}</p>
                    </div>
                    <p className="font-semibold">${(servicePrices[apt.service] || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ingresos por Servicio */}
          {revenueByService.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Servicios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {revenueByService.slice(0, 5).map(item => (
                    <div key={item.name} className="flex justify-between items-center p-2 bg-muted/20 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.count} turnos</p>
                      </div>
                      <p className="font-semibold">${item.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}