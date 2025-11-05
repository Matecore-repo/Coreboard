import React, { useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Receipt,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useFinancialMetrics } from '../../hooks/useFinancialMetrics';
import { usePayments } from '../../hooks/usePayments';
import { useExpenses } from '../../hooks/useExpenses';
import { useTurnos } from '../../hooks/useTurnos';
import { useCommissions } from '../../hooks/useCommissions';
import { useEmployees } from '../../hooks/useEmployees';
import { useSalons } from '../../hooks/useSalons';
import { useAuth } from '../../contexts/AuthContext';
import { useFinancialExports } from '../../hooks/useFinancialExports';
import { 
  IncomeExpenseChart, 
  CashFlowChart,
} from '../features/finances/FinancesCharts';
import { toast } from 'sonner';
import type { Appointment } from '../../types';

interface OwnerDashboardProps {
  selectedSalon: string | null;
  salonName?: string;
  dateRange?: { startDate: string; endDate: string };
}

export default function OwnerDashboard({ 
  selectedSalon, 
  salonName,
  dateRange 
}: OwnerDashboardProps) {
  const { currentOrgId } = useAuth();
  const { payments } = usePayments({ enabled: true });
  const { expenses } = useExpenses({ enabled: true });
  const metrics = useFinancialMetrics(selectedSalon, dateRange);
  const { turnos } = useTurnos({ salonId: selectedSalon || undefined, enabled: true });
  
  // Convertir turnos a appointments para compatibilidad
  const allAppointments = React.useMemo(() => {
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
  const { commissions } = useCommissions({ enabled: true });
  const { employees } = useEmployees(currentOrgId || undefined, { enabled: true });
  const { salons } = useSalons(currentOrgId || undefined, { enabled: true });

  const { exportToExcel } = useFinancialExports();

  // Cálculo de gastos por categoría
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(exp => {
      const category = exp.category || 'Otros';
      map[category] = (map[category] || 0) + exp.amount;
    });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Alquileres de locales (gastos con categoría "rent" o "alquiler")
  const rentExpenses = useMemo(() => {
    const rentCategories = ['rent', 'alquiler', 'renta', 'alquileres'];
    return expenses
      .filter(exp => {
        const cat = (exp.category || '').toLowerCase();
        return rentCategories.some(r => cat.includes(r));
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  // Salarios de empleados (gastos con categoría "salary" o "salario")
  const salaryExpenses = useMemo(() => {
    const salaryCategories = ['salary', 'salario', 'salarios', 'sueldo', 'sueldos'];
    return expenses
      .filter(exp => {
        const cat = (exp.category || '').toLowerCase();
        return salaryCategories.some(s => cat.includes(s));
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  // Comisiones por empleado
  const commissionsByEmployee = useMemo(() => {
    const map: Record<string, { employeeName: string; total: number; count: number }> = {};
    commissions.forEach(comm => {
      const employee = employees.find(emp => emp.id === comm.employee_id);
      const employeeName = employee?.full_name || 'Empleado desconocido';
      if (!map[comm.employee_id]) {
        map[comm.employee_id] = { employeeName, total: 0, count: 0 };
      }
      map[comm.employee_id].total += comm.amount;
      map[comm.employee_id].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total);
  }, [commissions, employees]);

  // Pagos por método
  const paymentsByMethod = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(payment => {
      const method = payment.paymentMethod;
      map[method] = (map[method] || 0) + payment.amount;
    });
    return Object.entries(map)
      .map(([method, amount]) => ({ 
        method: method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method === 'transfer' ? 'Transferencia' : 'Otro',
        amount 
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [payments]);

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

  // Resultado financiero (Ingresos - Gastos)
  const netResult = useMemo(() => {
    const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    return totalIncome - totalExpenses;
  }, [payments, expenses]);

  const handleExportAll = async () => {
    try {
      const exportData = {
        'Resumen Financiero': [
          { 'Concepto': 'Ingresos Totales', 'Valor': metrics.kpis.grossRevenue.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
          { 'Concepto': 'Gastos Totales', 'Valor': expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
          { 'Concepto': 'Resultado Neto', 'Valor': netResult.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
        ],
        'Alquileres': salons.map(s => ({
          'Local': s.name,
          'Alquiler Mensual': rentExpenses / salons.length,
        })),
        'Comisiones por Empleado': commissionsByEmployee.map(c => ({
          'Empleado': c.employeeName,
          'Total Comisiones': c.total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
          'Cantidad': c.count,
        })),
        'Gastos por Categoría': expensesByCategory.map(e => ({
          'Categoría': e.category,
          'Monto': e.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }),
        })),
      };
      
      await exportToExcel(exportData, `finanzas_${salonName || 'todas'}_${new Date().toISOString().split('T')[0]}`);
      toast.success('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar los datos');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Botón de exportación */}
      <div className="flex justify-end my-4">
        <Button onClick={handleExportAll} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar a Excel
        </Button>
      </div>

      {/* Resumen Principal - 4 tarjetas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(metrics.kpis.grossRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de ventas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}</div>
            <p className="text-xs text-muted-foreground mt-1">Todos los gastos</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${netResult >= 0 ? 'border-l-green-500' : 'border-l-orange-500'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${netResult >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {formatCurrency(netResult)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {netResult >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-orange-600" />
              )}
              <p className="text-xs text-muted-foreground">
                {netResult >= 0 ? 'Ganancia' : 'Pérdida'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comisiones Pagadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(commissions.reduce((sum, c) => sum + c.amount, 0))}</div>
            <p className="text-xs text-muted-foreground mt-1">Total a empleados</p>
          </CardContent>
        </Card>
      </div>

      {/* Resultados Financieros Detallados */}
      <Card className="my-4">
        <CardHeader>
          <CardTitle>Resultados Financieros</CardTitle>
          <CardDescription>Desglose de ingresos y gastos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ingresos Brutos</span>
                <span className="font-semibold">{formatCurrency(metrics.kpis.grossRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Descuentos</span>
                <span className="font-semibold">{formatCurrency(0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Impuestos</span>
                <span className="font-semibold">{formatCurrency(0)}</span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="text-sm font-medium">Ingresos Netos</span>
                <span className="font-bold text-lg">{formatCurrency(metrics.kpis.netRevenue)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gastos Fijos</span>
                <span className="font-semibold">{formatCurrency(rentExpenses + salaryExpenses)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Comisiones</span>
                <span className="font-semibold">{formatCurrency(commissions.reduce((sum, c) => sum + c.amount, 0))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Otros Gastos</span>
                <span className="font-semibold">{formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0) - rentExpenses - salaryExpenses - commissions.reduce((sum, c) => sum + c.amount, 0))}</span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="text-sm font-medium">Gastos Totales</span>
                <span className="font-bold text-lg">{formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0) + commissions.reduce((sum, c) => sum + c.amount, 0))}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margen Bruto</span>
                <span className={`font-semibold ${metrics.kpis.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.kpis.grossMargin)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margen Neto</span>
                <span className={`font-semibold ${metrics.kpis.netMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.kpis.netMargin)}
                </span>
              </div>
              <div className="border-t-2 pt-2 flex items-center justify-between">
                <span className="text-base font-semibold">Resultado Final</span>
                <span className={`font-bold text-xl ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netResult)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gastos por Categoría */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Alquileres de Locales
            </CardTitle>
            <CardDescription>Costos mensuales de alquiler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salons.map(salon => (
                <div key={salon.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{salon.name}</p>
                    <p className="text-xs text-muted-foreground">{salon.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(rentExpenses / salons.length)}</p>
                    <p className="text-xs text-muted-foreground">mensual</p>
                  </div>
                </div>
              ))}
              {salons.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No hay locales registrados</p>
              )}
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="font-semibold">Total Alquileres</span>
                <span className="font-bold text-lg">{formatCurrency(rentExpenses)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Salarios de Empleados
            </CardTitle>
            <CardDescription>Costos de personal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salaryExpenses > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Salarios Totales</span>
                      <span className="font-semibold">{formatCurrency(salaryExpenses)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {employees.length} empleado{employees.length !== 1 ? 's' : ''} activo{employees.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground">
                      Nota: Los salarios se registran como gastos con categoría "salario"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No hay salarios registrados</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registra gastos con categoría "salario" para verlos aquí
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comisiones por Empleado */}
      <Card className="my-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Comisiones por Empleado
          </CardTitle>
          <CardDescription>Total de comisiones pagadas por empleado</CardDescription>
        </CardHeader>
        <CardContent>
          {commissionsByEmployee.length > 0 ? (
            <div className="space-y-3">
              {commissionsByEmployee.map((comm, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium">{comm.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{comm.count} comisión{comm.count !== 1 ? 'es' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(comm.total)}</p>
                    <Badge variant="secondary" className="mt-1">
                      {((comm.total / (commissions.reduce((sum, c) => sum + c.amount, 0) || 1)) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="font-semibold">Total Comisiones</span>
                <span className="font-bold text-lg">{formatCurrency(commissions.reduce((sum, c) => sum + c.amount, 0))}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No hay comisiones registradas</p>
          )}
        </CardContent>
      </Card>

      {/* Gastos por Categoría y Pagos por Método */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-4">
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
            <CardDescription>Distribución de gastos</CardDescription>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
              <div className="space-y-3">
                {expensesByCategory.slice(0, 5).map((exp, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="text-sm">{exp.category}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(exp.amount)}</span>
                  </div>
                ))}
                {expensesByCategory.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Y {expensesByCategory.length - 5} categoría{expensesByCategory.length - 5 !== 1 ? 's' : ''} más
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No hay gastos registrados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagos por Método</CardTitle>
            <CardDescription>Distribución de ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsByMethod.length > 0 ? (
              <div className="space-y-3">
                {paymentsByMethod.map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{payment.method}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No hay pagos registrados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-4">
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
      </div>
    </div>
  );
}
