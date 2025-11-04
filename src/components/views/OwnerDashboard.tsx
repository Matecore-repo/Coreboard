import React, { useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Target,
  Wallet,
  AlertCircle,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useFinancialMetrics } from '../../hooks/useFinancialMetrics';
import { usePayments } from '../../hooks/usePayments';
import { useExpenses } from '../../hooks/useExpenses';
import { useAppointments } from '../../hooks/useAppointments';
import { useFinancialAlerts } from '../../hooks/useFinancialAlerts';
import { useFinancialExports } from '../../hooks/useFinancialExports';
import { FinancialAlertsPanel } from '../FinancialAlertsPanel';
import { 
  IncomeExpenseChart, 
  CashFlowChart, 
  ProfitByMonthChart,
  PaymentMethodChart,
  CancellationsChart,
  ProjectionChart,
  BreakEvenChart,
} from '../features/finances/FinancesCharts';
import { toast } from 'sonner';
import type { Appointment } from '../../types';

interface OwnerDashboardProps {
  appointments: Appointment[];
  selectedSalon: string | null;
  salonName?: string;
  dateRange?: { startDate: string; endDate: string };
}

export default function OwnerDashboard({ 
  appointments, 
  selectedSalon, 
  salonName,
  dateRange 
}: OwnerDashboardProps) {
  const { payments } = usePayments({ enabled: true });
  const { expenses } = useExpenses({ enabled: true });
  const metrics = useFinancialMetrics(selectedSalon, dateRange);
  const { appointments: allAppointments } = useAppointments(selectedSalon || undefined, { enabled: true });
  const { alerts } = useFinancialAlerts(selectedSalon);

  const { exportToExcel } = useFinancialExports();

  const filteredAppointments = useMemo(() => {
    if (!selectedSalon) return appointments;
    return appointments.filter(apt => {
      // Appointment del tipo usado en AppointmentCard tiene salonId, no salon_id
      return (apt as any).salonId === selectedSalon || apt.salon_id === selectedSalon;
    });
  }, [appointments, selectedSalon]);

  // Datos para gráficos
  const incomeExpenseData = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const map: Record<string, { income: number; expense: number }> = {};
    
    payments.forEach(payment => {
      const paymentDate = payment.date;
      if (paymentDate >= thirtyDaysAgo.toISOString().split('T')[0] && paymentDate <= now.toISOString().split('T')[0]) {
        if (!map[paymentDate]) {
          map[paymentDate] = { income: 0, expense: 0 };
        }
        map[paymentDate].income += payment.amount;
      }
    });
    
    expenses.forEach(expense => {
      const expenseDate = expense.incurred_at;
      if (expenseDate >= thirtyDaysAgo.toISOString().split('T')[0] && expenseDate <= now.toISOString().split('T')[0]) {
        if (!map[expenseDate]) {
          map[expenseDate] = { income: 0, expense: 0 };
        }
        map[expenseDate].expense += expense.amount;
      }
    });
    
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, income: data.income, expense: data.expense }));
  }, [payments, expenses]);

  const cashFlowData = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let runningCash = 0;
    const map: Record<string, number> = {};
    
    payments
      .filter(p => p.date >= thirtyDaysAgo.toISOString().split('T')[0] && p.date <= now.toISOString().split('T')[0])
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(payment => {
        runningCash += payment.amount;
        map[payment.date] = runningCash;
      });
    
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, cash]) => ({ date, cash }));
  }, [payments]);

  const profitByMonthData = useMemo(() => {
    const map: Record<string, { revenue: number; expenses: number }> = {};
    
    payments.forEach(payment => {
      const date = new Date(payment.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map[monthKey]) {
        map[monthKey] = { revenue: 0, expenses: 0 };
      }
      map[monthKey].revenue += payment.amount;
    });
    
    expenses.forEach(expense => {
      const date = new Date(expense.incurred_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map[monthKey]) {
        map[monthKey] = { revenue: 0, expenses: 0 };
      }
      map[monthKey].expenses += expense.amount;
    });
    
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({ 
        month: new Date(month + '-01').toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }), 
        profit: data.revenue - data.expenses 
      }));
  }, [payments, expenses]);

  const paymentMethodData = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(payment => {
      const method = payment.paymentMethod;
      map[method] = (map[method] || 0) + payment.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [payments]);

  const cancellationsData = useMemo(() => {
    const map: Record<string, { cancelled: number; noShow: number }> = {};
    
    filteredAppointments.forEach(apt => {
      const date = apt.starts_at.split('T')[0];
      if (!map[date]) {
        map[date] = { cancelled: 0, noShow: 0 };
      }
      if (apt.status === 'cancelled') {
        map[date].cancelled += 1;
      }
      // Asumimos que no-show está representado de alguna manera
      // En producción, esto debería venir del campo específico
    });
    
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, ...data }));
  }, [filteredAppointments]);

  const breakEvenData = useMemo(() => {
    const dailyFixedCost = metrics.breakEven.dailyFixedCost;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const map: Record<string, number> = {};
    
    payments
      .filter(p => p.date >= thirtyDaysAgo.toISOString().split('T')[0] && p.date <= now.toISOString().split('T')[0])
      .forEach(payment => {
        map[payment.date] = (map[payment.date] || 0) + payment.amount;
      });
    
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue, fixedCost: dailyFixedCost }));
  }, [payments, metrics.breakEven.dailyFixedCost]);

  const projectionData = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const actual = payments
      .filter(p => p.date >= thirtyDaysAgo.toISOString().split('T')[0] && p.date <= now.toISOString().split('T')[0])
      .map(p => ({ date: p.date, revenue: p.amount }));
    
    const dailyAverage = actual.length > 0 
      ? actual.reduce((sum, p) => sum + p.revenue, 0) / actual.length 
      : 0;
    
    const projected = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() + i + 1);
      return {
        date: date.toISOString().split('T')[0],
        revenue: dailyAverage,
      };
    });
    
    return [
      ...actual.map(p => ({ date: p.date, actual: p.revenue, projected: dailyAverage })),
      ...projected.map(p => ({ date: p.date, actual: 0, projected: p.revenue })),
    ];
  }, [payments]);

  const handleExportAll = async () => {
    try {
      const exportData = {
        'KPIs': [
          { 'Indicador': 'Ingreso Bruto', 'Valor': metrics.kpis.grossRevenue.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
          { 'Indicador': 'Ingreso Neto', 'Valor': metrics.kpis.netRevenue.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
          { 'Indicador': 'Margen Bruto', 'Valor': metrics.kpis.grossMargin.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
          { 'Indicador': 'Margen Neto', 'Valor': metrics.kpis.netMargin.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
          { 'Indicador': 'Ticket Promedio', 'Valor': metrics.kpis.averageTicket.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
          { 'Indicador': '% Ocupación', 'Valor': `${metrics.kpis.occupancyRate.toFixed(1)}%` },
          { 'Indicador': 'Caja del Día', 'Valor': metrics.kpis.dailyCash.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
          { 'Indicador': 'Saldo por Liquidar', 'Valor': metrics.kpis.pendingSettlement.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
        ],
        'Ingresos vs Gastos': incomeExpenseData.map(d => ({
          'Fecha': d.date,
          'Ingresos': d.income,
          'Gastos': d.expense,
        })),
        'Flujo de Caja': cashFlowData.map(d => ({
          'Fecha': d.date,
          'Caja': d.cash,
        })),
        'Utilidad por Mes': profitByMonthData.map(d => ({
          'Mes': d.month,
          'Utilidad': d.profit,
        })),
        'Métodos de Pago': paymentMethodData.map(d => ({
          'Método': d.name,
          'Monto': d.value,
        })),
        'Cancelaciones': cancellationsData.map(d => ({
          'Fecha': d.date,
          'Canceladas': d.cancelled,
          'No Show': d.noShow || 0,
        })),
        'Proyección': projectionData.map(d => ({
          'Fecha': d.date,
          'Real': d.actual || 0,
          'Proyectado': d.projected || 0,
        })),
        'Break-Even': breakEvenData.map(d => ({
          'Fecha': d.date,
          'Ingresos': d.revenue,
          'Costo Fijo': d.fixedCost,
        })),
      };
      
      await exportToExcel(exportData, `finanzas_${salonName || 'todas'}_${new Date().toISOString().split('T')[0]}`);
      toast.success('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar los datos');
    }
  };

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {alerts.length > 0 && <FinancialAlertsPanel alerts={alerts} />}
      
      {/* Botón de exportación global */}
      <div className="flex justify-end">
        <Button onClick={handleExportAll} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Todo a Excel
        </Button>
      </div>
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingreso Bruto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.kpis.grossRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total de ventas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingreso Neto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.kpis.netRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Después de descuentos e impuestos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Bruto</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.kpis.grossMargin.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.margins.grossMarginPercent.toFixed(1)}% del ingreso neto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Neto</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.kpis.netMargin.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.margins.netMarginPercent.toFixed(1)}% del ingreso neto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.kpis.averageTicket.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">Por turno completado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Ocupación</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.kpis.occupancyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Horas vendidas vs disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Caja del Día</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.kpis.dailyCash.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Ingresos de hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo por Liquidar</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.kpis.pendingSettlement.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Pendiente de pasarelas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs Gastos</CardTitle>
            <CardDescription>Últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeExpenseData.length > 0 ? (
              <IncomeExpenseChart data={incomeExpenseData} period="day" />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sin datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flujo de Caja</CardTitle>
            <CardDescription>Últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            {cashFlowData.length > 0 ? (
              <CashFlowChart data={cashFlowData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sin datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilidad por Mes</CardTitle>
            <CardDescription>Ingresos - Gastos</CardDescription>
          </CardHeader>
          <CardContent>
            {profitByMonthData.length > 0 ? (
              <ProfitByMonthChart data={profitByMonthData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sin datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Método de Pago</CardTitle>
            <CardDescription>Distribución de pagos</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentMethodData.length > 0 ? (
              <PaymentMethodChart data={paymentMethodData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sin datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cancelaciones y No-Shows</CardTitle>
            <CardDescription>Tasa de pérdida</CardDescription>
          </CardHeader>
          <CardContent>
            {cancellationsData.length > 0 ? (
              <CancellationsChart data={cancellationsData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sin datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proyección 30/90 Días</CardTitle>
            <CardDescription>Pronóstico basado en tendencia</CardDescription>
          </CardHeader>
          <CardContent>
            {projectionData.length > 0 ? (
              <ProjectionChart data={projectionData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sin datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Break-Even Diario</CardTitle>
            <CardDescription>Costo fijo vs ingreso del día</CardDescription>
          </CardHeader>
          <CardContent>
            {breakEvenData.length > 0 ? (
              <BreakEvenChart data={breakEvenData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sin datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

