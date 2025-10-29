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

const BarChartComponent = lazy(() => import("./FinancesCharts").then(m => ({ default: m.BarChartComponent })));
const AreaChartComponent = lazy(() => import("./FinancesCharts").then(m => ({ default: m.AreaChartComponent })));
const PieChartComponent = lazy(() => import("./FinancesCharts").then(m => ({ default: m.PieChartComponent })));
import { Appointment } from "../AppointmentCard";
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

// Precios base por servicio
const servicePrices: Record<string, number> = {
  "Corte": 3500,
  "Corte y Coloración": 8500,
  "Peinado": 4000,
  "Barba": 2000,
  "Mechas": 7000,
  "Tratamiento": 5500,
  "Coloración": 6500,
  "Brushing": 3000,
  "Corte y Barba": 4500,
  "Tratamiento Capilar": 6000,
  "Mechas Balayage": 9000,
  "Alisado": 12000,
  "Peinado de Novia": 15000,
  "Corte Bob": 4000,
  "Fade": 3000,
  "Mechas Californianas": 8000,
  "Brushing y Planchado": 4500,
  "Keratina": 18000,
  "Corte Clásico": 3200,
  "Tinte Completo": 7500,
  "Barba y Cejas": 2500,
  "Peinado de Fiesta": 8000,
  "Corte Moderno": 3800,
  "Balayage": 9500,
  "Corte y Styling": 5000,
  "Tratamiento Botox": 10000,
  "Coloración Fantasía": 11000,
  "Permanente": 9000,
};

// Gastos mensuales base
const monthlyExpenses = {
  rent: 150000,
  supplies: 85000,
  salaries: 450000,
  utilities: 35000,
  marketing: 25000,
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

function FinancesView({ appointments, selectedSalon, salonName = "Ninguna peluquería seleccionada" }: FinancesViewProps) {
  const metrics = useMemo(() => {
    const salonAppointments = !selectedSalon 
      ? [] 
      : appointments.filter(apt => apt.salonId === selectedSalon);
    const completedAppointments = salonAppointments.filter(apt => apt.status === "completed");
    
    // Ingresos totales
    const totalRevenue = completedAppointments.reduce((sum, apt) => {
      return sum + (servicePrices[apt.service] || 0);
    }, 0);

    // Gastos totales
    const totalExpenses = Object.values(monthlyExpenses).reduce((sum, val) => sum + val, 0);
    
    // Balance
    const balance = totalRevenue - totalExpenses;

    // Comisiones por peluquero (60% del servicio)
    const commissionsByStylists = completedAppointments.reduce((acc, apt) => {
      const commission = (servicePrices[apt.service] || 0) * 0.6;
      acc[apt.stylist] = (acc[apt.stylist] || 0) + commission;
      return acc;
    }, {} as Record<string, number>);

    // Ingresos diarios
    const dailyRevenue = completedAppointments.reduce((acc, apt) => {
      const date = apt.date;
      const revenue = servicePrices[apt.service] || 0;
      acc[date] = (acc[date] || 0) + revenue;
      return acc;
    }, {} as Record<string, number>);

    // Servicios por tipo
    const serviceDistribution = completedAppointments.reduce((acc, apt) => {
      acc[apt.service] = (acc[apt.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Turnos por peluquero
    const appointmentsByStylists = salonAppointments.reduce((acc, apt) => {
      if (apt.status !== "cancelled") {
        acc[apt.stylist] = (acc[apt.stylist] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Tasa de cancelación por peluquero
    const cancellationRate = Object.entries(
      salonAppointments.reduce((acc, apt) => {
        if (!acc[apt.stylist]) {
          acc[apt.stylist] = { total: 0, cancelled: 0 };
        }
        acc[apt.stylist].total++;
        if (apt.status === "cancelled") {
          acc[apt.stylist].cancelled++;
        }
        return acc;
      }, {} as Record<string, { total: number; cancelled: number }>)
    ).map(([stylist, data]) => ({
      stylist,
      rate: (data.cancelled / data.total) * 100,
      cancelled: data.cancelled,
      total: data.total
    }));

    // Clientes únicos
    const uniqueClients = new Set(salonAppointments.map(apt => apt.clientName));
    const totalClients = uniqueClients.size;

    // Ticket promedio
    const avgTicket = completedAppointments.length > 0 
      ? totalRevenue / completedAppointments.length 
      : 0;

    // Horas pico (agrupado por hora)
    const peakHours = salonAppointments.reduce((acc, apt) => {
      const hour = parseInt(apt.time.split(":")[0]);
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Proyección de ingresos (turnos confirmados y pendientes)
    const projectedRevenue = salonAppointments
      .filter(apt => apt.status === "confirmed" || apt.status === "pending")
      .reduce((sum, apt) => sum + (servicePrices[apt.service] || 0), 0);

    // Capacidad ocupada (asumiendo 10 slots por día)
    const totalDays = new Set(salonAppointments.map(apt => apt.date)).size;
    const totalSlots = totalDays * 10;
    const occupiedSlots = salonAppointments.filter(apt => apt.status !== "cancelled").length;
    const occupancyRate = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      balance,
      commissionsByStylists,
      dailyRevenue,
      serviceDistribution,
      appointmentsByStylists,
      cancellationRate,
      totalClients,
      avgTicket,
      peakHours,
      projectedRevenue,
      occupancyRate,
      completedCount: completedAppointments.length,
      totalAppointments: salonAppointments.length,
    };
  }, [appointments, selectedSalon]);

  // Preparar datos para los gráficos
  const commissionsChartData = Object.entries(metrics.commissionsByStylists)
    .map(([stylist, amount]) => ({
      name: stylist.split(" ")[0],
      comision: Math.round(amount),
    }))
    .sort((a, b) => b.comision - a.comision);

  const dailyRevenueChartData = Object.entries(metrics.dailyRevenue)
    .map(([date, amount]) => ({
      fecha: new Date(date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
      ingresos: Math.round(amount),
    }))
    .slice(-7);

  const serviceDistributionChartData = Object.entries(metrics.serviceDistribution)
    .map(([service, count]) => ({
      name: service.length > 15 ? service.substring(0, 15) + "..." : service,
      value: count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const peakHoursChartData = Object.entries(metrics.peakHours)
    .map(([hour, count]) => ({
      hora: `${hour}:00`,
      turnos: count,
    }))
    .sort((a, b) => parseInt(a.hora) - parseInt(b.hora));

  const appointmentsByStylistData = Object.entries(metrics.appointmentsByStylists)
    .map(([stylist, count]) => ({
      name: stylist.split(" ")[0],
      turnos: count,
    }))
    .sort((a, b) => b.turnos - a.turnos);

  const expensesBreakdownData = [
    { name: "Alquiler", value: monthlyExpenses.rent },
    { name: "Sueldos", value: monthlyExpenses.salaries },
    { name: "Productos", value: monthlyExpenses.supplies },
    { name: "Servicios", value: monthlyExpenses.utilities },
    { name: "Marketing", value: monthlyExpenses.marketing },
  ];

  const handleExportFinancial = () => {
    const data = Object.entries(metrics.commissionsByStylists).map(([stylist, commission]) => ({
      Peluquero: stylist,
      Comisión: Math.round(commission),
      Turnos: metrics.appointmentsByStylists[stylist] || 0,
      Promedio: Math.round(commission / (metrics.appointmentsByStylists[stylist] || 1))
    }));
    exportToExcel(data, `finanzas-${salonName}-${new Date().toISOString().split('T')[0]}`);
    toast.success("Datos financieros exportados correctamente");
  };

  const handleExportAppointments = () => {
    const salonAppointments = selectedSalon === "all" 
      ? appointments 
      : appointments.filter(apt => apt.salonId === selectedSalon);
    
    const data = salonAppointments.map(apt => ({
      Fecha: apt.date,
      Hora: apt.time,
      Cliente: apt.clientName,
      Servicio: apt.service,
      Estilista: apt.stylist,
      Estado: apt.status,
      Precio: servicePrices[apt.service] || 0
    }));
    exportToExcel(data, `turnos-${salonName}-${new Date().toISOString().split('T')[0]}`);
    toast.success("Turnos exportados correctamente");
  };

  // Si no hay salón seleccionado, mostrar mensaje
  if (!selectedSalon) {
    return (
      <div className="p-4 md:p-6 space-y-6 pb-20">
        <div>
          <h1>Finanzas</h1>
          <p className="text-muted-foreground text-sm">Análisis financiero y métricas de rendimiento</p>
        </div>
        <div className="text-center py-16 px-4">
          <div className="text-muted-foreground mb-2">
            Por favor selecciona una peluquería para ver las finanzas
          </div>
          <p className="text-sm text-muted-foreground">
            Usa el carrusel superior para elegir una sucursal
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20">
      {/* Header con exportación */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1>Finanzas - {salonName}</h1>
          <p className="text-muted-foreground text-sm">Análisis financiero y métricas de rendimiento</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleExportAppointments} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar Turnos</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportFinancial} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar Finanzas</span>
          </Button>
        </div>
      </div>
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.totalRevenue.toLocaleString("es-AR")}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedCount} servicios completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            {metrics.balance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(metrics.balance).toLocaleString("es-AR")}
            </div>
            <p className="text-xs text-muted-foreground">
              Ingresos - Gastos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(metrics.avgTicket).toLocaleString("es-AR")}
            </div>
            <p className="text-xs text-muted-foreground">
              Por servicio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.occupancyRate)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Capacidad utilizada
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con diferentes secciones */}
      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="financial">Financiero</TabsTrigger>
          <TabsTrigger value="staff">Personal</TabsTrigger>
          <TabsTrigger value="operations">Operaciones</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
        </TabsList>

        {/* Tab Financiero */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Comisiones por peluquero */}
            <Card>
              <CardHeader>
                <CardTitle>Comisiones por Peluquero</CardTitle>
                <CardDescription>60% del valor del servicio</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="p-4">Cargando gráfico...</div>}>
                  <BarChartComponent data={commissionsChartData} xKey="name" barKey="comision" fill="#6366f1" />
                </Suspense>
              </CardContent>
            </Card>

            {/* Ingresos diarios */}
            <Card>
              <CardHeader>
                <CardTitle>Evolución de Ingresos</CardTitle>
                <CardDescription>Últimos 7 días</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="p-4">Cargando gráfico...</div>}>
                  <AreaChartComponent data={dailyRevenueChartData} xKey="fecha" areaKey="ingresos" />
                </Suspense>
              </CardContent>
            </Card>

            {/* Distribución de gastos */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Gastos</CardTitle>
                <CardDescription>Gastos mensuales por categoría</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="p-4">Cargando gráfico...</div>}>
                  <PieChartComponent data={expensesBreakdownData} dataKey="value" colors={COLORS} labelFn={(args: any) => `${args.name} ${(args.percent * 100).toFixed(0)}%`} />
                </Suspense>
              </CardContent>
            </Card>

            {/* Proyección de ingresos */}
            <Card>
              <CardHeader>
                <CardTitle>Proyección de Ingresos</CardTitle>
                <CardDescription>Basado en citas confirmadas y pendientes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Ingresos proyectados</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${metrics.projectedRevenue.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ya facturado</span>
                    <span className="font-medium">${metrics.totalRevenue.toLocaleString("es-AR")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Proyección adicional</span>
                    <span className="font-medium text-green-600">${metrics.projectedRevenue.toLocaleString("es-AR")}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="font-medium">Total estimado</span>
                    <span className="font-bold">${(metrics.totalRevenue + metrics.projectedRevenue).toLocaleString("es-AR")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Personal */}
        <TabsContent value="staff" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Turnos atendidos por peluquero */}
            <Card>
              <CardHeader>
                <CardTitle>Turnos por Peluquero</CardTitle>
                <CardDescription>Total de turnos atendidos</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="p-4">Cargando gráfico...</div>}>
                  <BarChartComponent data={appointmentsByStylistData} xKey="name" barKey="turnos" fill="#ec4899" />
                </Suspense>
              </CardContent>
            </Card>

            {/* Tasa de cancelación */}
            <Card>
              <CardHeader>
                <CardTitle>Tasa de Cancelación</CardTitle>
                <CardDescription>Por peluquero</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.cancellationRate.map((data, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{data.stylist}</span>
                        <span className={`text-sm ${data.rate > 15 ? 'text-red-600' : 'text-green-600'}`}>
                          {data.rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${data.rate > 15 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${data.rate}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {data.cancelled}/{data.total}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rendimiento del personal */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Rendimiento General del Personal</CardTitle>
                <CardDescription>Métricas clave del equipo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(metrics.commissionsByStylists)
                    .sort((a, b) => b[1] - a[1])
                    .map(([stylist, commission]) => {
                      const appointments = metrics.appointmentsByStylists[stylist] || 0;
                      const avgCommission = appointments > 0 ? commission / appointments : 0;
                      return (
                        <div key={stylist} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{stylist.split(" ")[0]}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Turnos</span>
                              <span className="font-medium">{appointments}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Comisión</span>
                              <span className="font-medium">${Math.round(commission).toLocaleString("es-AR")}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Promedio</span>
                              <span className="font-medium">${Math.round(avgCommission).toLocaleString("es-AR")}</span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="w-full justify-center">
                            <Award className="h-3 w-3 mr-1" />
                            {commission === Math.max(...Object.values(metrics.commissionsByStylists)) ? "Top" : "Activo"}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Operaciones */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Horas pico */}
            <Card>
              <CardHeader>
                <CardTitle>Horas Pico</CardTitle>
                <CardDescription>Distribución de turnos por hora</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="p-4">Cargando gráfico...</div>}>
                  <BarChartComponent data={peakHoursChartData} xKey="hora" barKey="turnos" fill="#8b5cf6" />
                </Suspense>
              </CardContent>
            </Card>

            {/* Servicios más solicitados */}
            <Card>
              <CardHeader>
                <CardTitle>Servicios Más Solicitados</CardTitle>
                <CardDescription>Top 6 servicios</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="p-4">Cargando gráfico...</div>}>
                  <PieChartComponent data={serviceDistributionChartData} dataKey="value" colors={COLORS} />
                </Suspense>
              </CardContent>
            </Card>

            {/* Métricas operativas */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Métricas Operativas</CardTitle>
                <CardDescription>Indicadores clave de operación</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total Turnos</span>
                    </div>
                    <p className="text-2xl font-bold">{metrics.totalAppointments}</p>
                    <p className="text-xs text-muted-foreground">Todas las citas</p>
                  </div>

                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">Completados</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{metrics.completedCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {((metrics.completedCount / metrics.totalAppointments) * 100).toFixed(0)}% del total
                    </p>
                  </div>

                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Ocupación</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{Math.round(metrics.occupancyRate)}%</p>
                    <p className="text-xs text-muted-foreground">Capacidad utilizada</p>
                  </div>

                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <span className="text-xs text-muted-foreground">Duración prom.</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">45min</p>
                    <p className="text-xs text-muted-foreground">Por servicio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Clientes */}
        <TabsContent value="clients" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Resumen de clientes */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Clientes</CardTitle>
                <CardDescription>Métricas principales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Clientes</p>
                      <p className="text-2xl font-bold">{metrics.totalClients}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                      <p className="text-2xl font-bold">${Math.round(metrics.avgTicket).toLocaleString("es-AR")}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Repeat className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Frecuencia Promedio</p>
                      <p className="text-2xl font-bold">
                        {(metrics.totalAppointments / metrics.totalClients).toFixed(1)} visitas
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clientes nuevos vs recurrentes */}
            <Card>
              <CardHeader>
                <CardTitle>Clientes Nuevos vs Recurrentes</CardTitle>
                <CardDescription>Distribución del mes</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="p-4">Cargando gráfico...</div>}>
                  <PieChartComponent data={[{ name: "Nuevos", value: Math.round(metrics.totalClients * 0.3) }, { name: "Recurrentes", value: Math.round(metrics.totalClients * 0.7) }]} dataKey="value" colors={["#6366f1", "#14b8a6"]} labelFn={(args: any) => `${args.name}: ${args.value} (${(args.percent * 100).toFixed(0)}%)`} />
                </Suspense>
              </CardContent>
            </Card>

            {/* Retención y clientes inactivos */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Análisis de Retención</CardTitle>
                <CardDescription>Estado de la base de clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium">Clientes Activos</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      {Math.round(metrics.totalClients * 0.85)}
                    </p>
                    <p className="text-xs text-muted-foreground">85% del total</p>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      Última visita &lt; 30 días
                    </Badge>
                  </div>

                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium">En Riesgo</span>
                    </div>
                    <p className="text-3xl font-bold text-yellow-600">
                      {Math.round(metrics.totalClients * 0.10)}
                    </p>
                    <p className="text-xs text-muted-foreground">10% del total</p>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      30-60 días sin visitar
                    </Badge>
                  </div>

                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <UserX className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium">Inactivos</span>
                    </div>
                    <p className="text-3xl font-bold text-red-600">
                      {Math.round(metrics.totalClients * 0.05)}
                    </p>
                    <p className="text-xs text-muted-foreground">5% del total</p>
                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                      Más de 60 días
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FinancesView;