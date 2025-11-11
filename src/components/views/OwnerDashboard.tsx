import React, { useCallback, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useFinancialMetrics } from '../../hooks/useFinancialMetrics';
import { usePayments } from '../../hooks/usePayments';
import { useExpenses } from '../../hooks/useExpenses';
import { useTurnos } from '../../hooks/useTurnos';
import { useCommissions } from '../../hooks/useCommissions';
import { useEmployees } from '../../hooks/useEmployees';
import { useSalons } from '../../hooks/useSalons';
import { useAuth } from '../../contexts/AuthContext';
import { useFinancialExports } from '../../hooks/useFinancialExports';
import { OwnerInsightGrid } from '../features/finances/OwnerInsightGrid';
import { toastSuccess, toastError } from '../../lib/toast';
import type { Appointment } from '../../types';
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { cn } from '../ui/utils';

interface OwnerDashboardProps {
  selectedSalon: string | null;
  salonName?: string;
  dateRange?: { startDate: string; endDate: string };
  onExportReady?: (exporter: (() => Promise<void>) | null) => void;
}

export default function OwnerDashboard({ 
  selectedSalon, 
  salonName,
  dateRange,
  onExportReady,
}: OwnerDashboardProps) {
  const effectiveSalonId = selectedSalon && selectedSalon !== 'all' ? selectedSalon : null;
  const { currentOrgId } = useAuth();
  const { payments: allPayments } = usePayments({ enabled: true });
  const { expenses: allExpenses } = useExpenses({ enabled: true });
  const metrics = useFinancialMetrics(effectiveSalonId, dateRange);
  const { turnos } = useTurnos({ salonId: effectiveSalonId || undefined, enabled: true });
  
  // Filtrar payments y expenses por dateRange si está definido
  const payments = useMemo(() => {
    if (!dateRange) return allPayments;
    return allPayments.filter(p => p.date >= dateRange.startDate && p.date <= dateRange.endDate);
  }, [allPayments, dateRange]);

  const expenses = useMemo(() => {
    if (!dateRange) return allExpenses;
    return allExpenses.filter(e => e.incurred_at >= dateRange.startDate && e.incurred_at <= dateRange.endDate);
  }, [allExpenses, dateRange]);
  
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
  const totalExpensesByCategory = useMemo(
    () => expensesByCategory.reduce((sum, item) => sum + item.amount, 0),
    [expensesByCategory],
  );

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

  // Alquileres por local (gastos con categoría "rent" o "alquiler" filtrados por salon_id)
  const rentBySalon = useMemo(() => {
    const rentCategories = ['rent', 'alquiler', 'renta', 'alquileres'];
    const map: Record<string, number> = {};
    
    expenses
      .filter(exp => {
        const cat = (exp.category || '').toLowerCase();
        return rentCategories.some(r => cat.includes(r));
      })
      .forEach(exp => {
        const salonId = exp.salon_id || 'general';
        map[salonId] = (map[salonId] || 0) + exp.amount;
      });
    
    return map;
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
  const totalCommissionsAmount = useMemo(
    () => commissions.reduce((sum, commission) => sum + commission.amount, 0),
    [commissions],
  );

  // Pagos por método
  const paymentsByMethod = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(payment => {
      const method = payment.paymentMethod;
      map[method] = (map[method] || 0) + payment.amount;
    });
    return Object.entries(map)
      .map(([method, amount]) => {
        const methodLabels: Record<string, string> = {
          'cash': 'Efectivo',
          'card': 'Tarjeta',
          'transfer': 'Transferencia',
          'mercadopago': 'Mercado Pago',
          'other': 'Otro'
        };
        return {
          method: methodLabels[method] || method,
          amount
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [payments]);
  const totalPaymentsAmount = useMemo(
    () => paymentsByMethod.reduce((sum, item) => sum + item.amount, 0),
    [paymentsByMethod],
  );

  // Datos para gráficos - usar payments y expenses ya filtrados por dateRange
  const incomeExpenseData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    
    payments.forEach(payment => {
      const paymentDate = payment.date;
      if (!map[paymentDate]) {
        map[paymentDate] = { income: 0, expense: 0 };
      }
      map[paymentDate].income += payment.amount;
    });
    
    expenses.forEach(expense => {
      const expenseDate = expense.incurred_at;
      if (!map[expenseDate]) {
        map[expenseDate] = { income: 0, expense: 0 };
      }
      map[expenseDate].expense += expense.amount;
    });
    
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, income: data.income, expense: data.expense }));
  }, [payments, expenses]);

  // Resultado financiero (Ingresos - Gastos)
  const netResult = useMemo(() => {
    const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    return totalIncome - totalExpenses;
  }, [payments, expenses]);

  const recentMovements = useMemo(() => {
    const incomeMovements = payments.map(payment => ({
      id: `payment-${payment.id}`,
      type: "Ingreso",
      concept: payment.paymentMethodDetail || payment.paymentMethod || "Cobro",
      amount: payment.amount,
      date: payment.date,
      category: "Venta",
    }));

    const expenseMovements = expenses.map(expense => ({
      id: `expense-${expense.id}`,
      type: "Gasto",
      concept: expense.description || "Gasto registrado",
      amount: expense.amount,
      date: expense.incurred_at,
      category: expense.category || "General",
    }));

    const combined = [...incomeMovements, ...expenseMovements].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return combined.slice(0, 8);
  }, [payments, expenses]);

  const handleExportAll = useCallback(async () => {
    try {
      const exportData = {
        'Resumen Financiero': [
          { 'Concepto': 'Ingresos Totales', 'Valor': metrics.kpis.grossRevenue.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
          { 'Concepto': 'Gastos Totales', 'Valor': expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
          { 'Concepto': 'Resultado Neto', 'Valor': netResult.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) },
        ],
        'Alquileres': salons.map(s => ({
          'Local': s.name,
          'Alquiler Mensual': salons.length > 0 ? (rentExpenses / salons.length) : 0,
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
      toastSuccess('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toastError('Error al exportar los datos');
    }
  }, [
    commissionsByEmployee,
    expenses,
    expensesByCategory,
    exportToExcel,
    metrics.kpis.grossRevenue,
    netResult,
    rentExpenses,
    salonName,
    salons,
  ]);

  useEffect(() => {
    if (!onExportReady) return;
    onExportReady(handleExportAll);
    return () => onExportReady(null);
  }, [handleExportAll, onExportReady]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const topSummaryItems = useMemo(
    () => [
      {
        label: "Ingresos totales",
        value: metrics.kpis.grossRevenue,
        description: "Total de ventas",
        tone: "text-primary",
      },
      {
        label: "Gastos totales",
        value: expenses.reduce((sum, e) => sum + e.amount, 0),
        description: "Todos los gastos",
        tone: "text-rose-500",
      },
      {
        label: "Comisiones pagadas",
        value: totalCommissionsAmount,
        description: "Total a empleados",
        tone: "text-purple-500",
      },
      {
        label: "Resultado neto",
        value: netResult,
        description: netResult >= 0 ? "Ganancia" : "Pérdida",
        tone: netResult >= 0 ? "text-emerald-600" : "text-orange-500",
      },
    ],
    [expenses, metrics.kpis.grossRevenue, netResult, totalCommissionsAmount],
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-6 md:gap-8 rounded-2xl bg-card/80 p-5 sm:p-6 md:p-8 shadow-sm">
        {/* Resumen principal en formato tabla */}
      <Card className="border-dashed">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Resumen financiero</CardTitle>
            <CardDescription>Indicadores clave del período seleccionado</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="hidden text-right md:table-cell">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSummaryItems.map((item) => (
                <TableRow key={item.label}>
                  <TableCell className="text-sm font-semibold">{item.label}</TableCell>
                  <TableCell className={cn("text-right text-lg font-bold", item.tone)}>
                    {formatCurrency(item.value)}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm text-muted-foreground md:table-cell">
                    {item.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resultados financieros */}
      <Card className="mt-2 border-dashed">
        <CardHeader>
          <CardTitle>Resultados financieros</CardTitle>
          <CardDescription>Visión consolidada de ingresos, egresos y margen</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground md:grid-cols-4">
            <div className="border-border/60 bg-muted/30 p-4 font-semibold md:border-r">
              Ingresos totales
            </div>
            <div className="border-border/60 bg-muted/30 p-4 font-semibold md:border-r">
              Gastos totales
            </div>
            <div className="border-border/60 bg-muted/30 p-4 font-semibold md:border-r">
              Resultado neto
            </div>
            <div className="border-border/60 bg-muted/30 p-4 font-semibold">
              Comisiones pagadas
            </div>
          </div>
          <div className="grid grid-cols-1 divide-y divide-border/60 md:grid-cols-4 md:divide-x md:divide-y-0">
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Ingresos brutos</span>
                <span className="font-semibold text-foreground">{formatCurrency(metrics.kpis.grossRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Impuestos</span>
                <span className="font-semibold text-foreground">{formatCurrency(0)}</span>
              </div>
              <div className="border-t border-dashed pt-3">
                <p className="text-xs text-muted-foreground">Ingresos netos</p>
                <p className="text-2xl font-semibold text-foreground">{formatCurrency(metrics.kpis.netRevenue)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Alquileres + salarios</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(rentExpenses + salaryExpenses)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Otros gastos</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(
                    expenses.reduce((sum, e) => sum + e.amount, 0) -
                      rentExpenses -
                      salaryExpenses -
                      commissions.reduce((sum, c) => sum + c.amount, 0),
                  )}
                </span>
              </div>
              <div className="border-t border-dashed pt-3">
                <p className="text-xs text-muted-foreground">Total gastos</p>
                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Margen bruto</span>
                <span
                  className={cn(
                    "font-semibold",
                    metrics.kpis.grossMargin >= 0 ? "text-emerald-600" : "text-rose-500",
                  )}
                >
                  {formatCurrency(metrics.kpis.grossMargin)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Margen neto</span>
                <span
                  className={cn(
                    "font-semibold",
                    metrics.kpis.netMargin >= 0 ? "text-emerald-600" : "text-rose-500",
                  )}
                >
                  {formatCurrency(metrics.kpis.netMargin)}
                </span>
              </div>
              <div className="border-t border-dashed pt-3">
                <p className="text-xs text-muted-foreground">Resultado final</p>
                <p
                  className={cn(
                    "text-2xl font-semibold",
                    netResult >= 0 ? "text-emerald-600" : "text-orange-500",
                  )}
                >
                  {formatCurrency(netResult)}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Comisiones pagadas</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(commissions.reduce((sum, c) => sum + c.amount, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Participación</span>
                <span className="font-semibold text-primary">
                  {totalCommissionsAmount > 0 && metrics.kpis.grossRevenue > 0
                    ? `${((totalCommissionsAmount / metrics.kpis.grossRevenue) * 100).toFixed(1)}%`
                    : "—"}
                </span>
              </div>
              <div className="border-t border-dashed pt-3">
                <p className="text-xs text-muted-foreground">Detalle</p>
                <p className="text-sm text-muted-foreground">
                  Revisión por empleado en la tabla inferior.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gastos por Categoría */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-7 lg:gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Alquileres de Locales
            </CardTitle>
            <CardDescription>Costos mensuales de alquiler</CardDescription>
          </CardHeader>
          <CardContent>
            {salons.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salón</TableHead>
                    <TableHead className="hidden lg:table-cell">Dirección</TableHead>
                    <TableHead className="text-right">Costo mensual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salons.map((salon) => {
                    const salonRent = rentBySalon[salon.id] || 0;
                    return (
                      <TableRow key={salon.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span>{salon.name}</span>
                            {salon.address && (
                              <span className="text-xs text-muted-foreground lg:hidden">{salon.address}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {salon.address || "Sin dirección"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(salonRent)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold" colSpan={2}>
                      Total alquileres
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(rentExpenses)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No hay locales registrados</p>
            )}
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
      <Card className="mt-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Comisiones por Empleado
          </CardTitle>
          <CardDescription>Total de comisiones pagadas por empleado</CardDescription>
        </CardHeader>
        <CardContent>
      {commissionsByEmployee.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead className="text-center">Comisiones</TableHead>
              <TableHead className="text-right">Importe total</TableHead>
              <TableHead className="hidden text-right md:table-cell">Participación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissionsByEmployee.map((comm, idx) => {
              const share = totalCommissionsAmount > 0 ? (comm.total / totalCommissionsAmount) * 100 : 0;
              return (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-0.5">
                      <span>{comm.employeeName}</span>
                      <span className="text-xs text-muted-foreground md:hidden">
                        {comm.count} comisión{comm.count !== 1 ? "es" : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-dashed">
                      {comm.count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(comm.total)}
                  </TableCell>
                  <TableCell className="hidden text-right md:table-cell">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {share.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold" colSpan={2}>
                Total comisiones
              </TableCell>
              <TableCell className="text-right font-bold text-lg">
                {formatCurrency(totalCommissionsAmount)}
              </TableCell>
              <TableCell className="hidden text-right md:table-cell">
                <Badge variant="secondary">100%</Badge>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">No hay comisiones registradas</p>
      )}
        </CardContent>
      </Card>

      {/* Gastos por Categoría y Pagos por Método */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-7 lg:gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
            <CardDescription>Distribución de gastos</CardDescription>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Participación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesByCategory.slice(0, 5).map((exp, idx) => {
                      const share =
                        totalExpensesByCategory > 0 ? (exp.amount / totalExpensesByCategory) * 100 : 0;
                      return (
                        <TableRow key={`${exp.category}-${idx}`}>
                          <TableCell className="font-medium">{exp.category}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(exp.amount)}
                          </TableCell>
                          <TableCell className="hidden text-right sm:table-cell">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              {share.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-semibold">Total gastos</TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {formatCurrency(totalExpensesByCategory)}
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        <span className="text-xs font-semibold text-muted-foreground">100%</span>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                  {expensesByCategory.length > 5 && (
                    <TableCaption>
                      + {expensesByCategory.length - 5} categoría
                      {expensesByCategory.length - 5 !== 1 ? "s" : ""} adicionales fuera del top.
                    </TableCaption>
                  )}
                </Table>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No hay gastos registrados</p>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Participación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsByMethod.map((payment, idx) => {
                    const share =
                      totalPaymentsAmount > 0 ? (payment.amount / totalPaymentsAmount) * 100 : 0;
                    return (
                      <TableRow key={`${payment.method}-${idx}`}>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                            {payment.method}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="hidden text-right sm:table-cell">
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                            {share.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">Total ingresos</TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(totalPaymentsAmount)}
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell text-xs font-semibold text-muted-foreground">
                      100%
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No hay pagos registrados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Principales */}
      <OwnerInsightGrid
        incomeExpenseData={incomeExpenseData}
        paymentMethodData={paymentsByMethod.map((item) => ({
          method: item.method,
          amount: item.amount,
        }))}
        currencyFormatter={formatCurrency}
      />

      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Movimientos recientes</CardTitle>
            <CardDescription>Últimos ingresos y egresos consolidados</CardDescription>
          </div>
          <span className="text-xs text-muted-foreground">
            {recentMovements.length > 0
              ? `Actualizado al ${new Date(recentMovements[0].date).toLocaleDateString("es-AR")}`
              : "Sin registros"}
          </span>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recentMovements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay movimientos registrados en el período seleccionado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm font-medium">
                        {new Date(movement.date).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            movement.type === "Ingreso"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-rose-500/10 text-rose-500",
                          )}
                        >
                          {movement.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.concept}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.category}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-semibold",
                        movement.type === "Ingreso" ? "text-emerald-600" : "text-rose-500",
                      )}>
                        {movement.type === "Gasto" ? "-" : ""}
                        {formatCurrency(movement.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
  );
}
