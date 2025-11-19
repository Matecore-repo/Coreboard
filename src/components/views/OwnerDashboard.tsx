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

const getValueToneClass = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }
  if (value > 0) {
    return "text-emerald-500";
  }
  if (value < 0) {
    return "text-rose-500";
  }
  return "";
};

const isResultLabel = (label: string) => {
  const normalized = label?.toLowerCase() ?? "";
  return (
    normalized.includes("resultado")
  );
};

type FinancialSectionItem = {
  label: string;
  value: number | null;
  detail: string;
  emphasis?: boolean;
  isPercentage?: boolean;
};

type FinancialSection = {
  title: string;
  items: FinancialSectionItem[];
};

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
  const { commissions: allCommissions } = useCommissions({ enabled: true });
  
  // Filtrar comisiones por dateRange si está definido
  const commissions = useMemo(() => {
    if (!dateRange) return allCommissions;
    return allCommissions.filter(c => c.date >= dateRange.startDate && c.date <= dateRange.endDate);
  }, [allCommissions, dateRange]);
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
  const totalExpensesAmount = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );
  // Otros gastos: todos los gastos excepto alquileres y salarios
  // Nota: Las comisiones NO están en expenses, vienen de la tabla commissions
  const otherExpensesAmount = useMemo(
    () =>
      totalExpensesAmount -
      rentExpenses -
      salaryExpenses,
    [totalExpensesAmount, rentExpenses, salaryExpenses],
  );
  const commissionsShare = useMemo(() => {
    if (totalCommissionsAmount > 0 && metrics.kpis.grossRevenue > 0) {
      return (totalCommissionsAmount / metrics.kpis.grossRevenue) * 100;
    }
    return null;
  }, [totalCommissionsAmount, metrics.kpis.grossRevenue]);

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

  // Resultado financiero (Ingresos - Gastos - Comisiones)
  const netResult = useMemo(() => {
    const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    // Las comisiones son un gasto que hay que pagar, así que se restan
    return totalIncome - totalExpenses - totalCommissionsAmount;
  }, [payments, expenses, totalCommissionsAmount]);

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

const formatPercentage = (value: number) => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(1)}%`;
};

const financialSummaryRows = useMemo<FinancialSectionItem[]>(
  () => [
    {
      label: "Ingresos totales",
      value: metrics.kpis.grossRevenue,
      detail: "Total de ventas registradas",
    },
    {
      label: "Ingresos netos",
      value: metrics.kpis.netRevenue,
      detail: "Ingresos luego de impuestos y descuentos",
    },
    {
      label: "Gastos totales",
      value: totalExpensesAmount,
      detail: "Egresos operativos y administrativos",
    },
    {
      label: "Comisiones",
      value: -totalCommissionsAmount,
      detail: "Pagos a colaboradores",
    },
    {
      label: "Resultado neto",
      value: netResult,
      detail: netResult >= 0 ? "Ganancia acumulada" : "Pérdida acumulada",
    },
    {
      label: "Ticket promedio",
      value: metrics.kpis.averageTicket,
      detail: "Venta promedio por turno completado",
    },
    {
      label: "Caja del día",
      value: metrics.kpis.dailyCash,
      detail: "Ingresos percibidos hoy",
    },
    {
      label: "Ocupación agenda",
      value: metrics.kpis.occupancyRate,
      detail: "Turnos completados vs. agendados",
      isPercentage: true,
    },
    {
      label: "Pendiente de liquidar",
      value: metrics.kpis.pendingSettlement,
      detail: "Pagos aún no liquidados",
    },
  ],
  [
    metrics.kpis.averageTicket,
    metrics.kpis.dailyCash,
    metrics.kpis.grossRevenue,
    metrics.kpis.netRevenue,
    metrics.kpis.occupancyRate,
    metrics.kpis.pendingSettlement,
    netResult,
    totalCommissionsAmount,
    totalExpensesAmount,
  ],
);
  const financialSections = useMemo<FinancialSection[]>(
    () => [
      {
        title: "Ingresos totales",
        items: [
          {
            label: "Ingresos brutos",
            value: metrics.kpis.grossRevenue,
            detail: "Facturación bruta acumulada",
          },
          {
            label: "Impuestos",
            value: 0,
            detail: "Retenciones e impuestos estimados",
          },
          {
            label: "Ingresos netos",
            value: metrics.kpis.netRevenue,
            detail: "Ingresos brutos menos impuestos",
            emphasis: true,
          },
        ],
      },
      {
        title: "Gastos totales",
        items: [
          {
            label: "Alquileres + salarios",
            value: rentExpenses + salaryExpenses,
            detail: "Costos fijos principales",
          },
          {
            label: "Otros gastos",
            value: otherExpensesAmount,
            detail: "Costos variables y operativos",
          },
          {
            label: "Total gastos",
            value: totalExpensesAmount,
            detail: "Suma de todos los egresos",
            emphasis: true,
          },
        ],
      },
      {
        title: "Resultado neto",
        items: [
          {
            label: "Margen bruto",
            value: metrics.kpis.grossMargin,
            detail: "Ingresos menos costos directos",
          },
          {
            label: "Margen neto",
            value: metrics.kpis.netMargin,
            detail: "Resultado después de gastos",
          },
          {
            label: "Resultado final",
            value: netResult,
            detail: "Beneficio o pérdida total",
            emphasis: true,
          },
        ],
      },
      {
        title: "Comisiones",
        items: [
          {
            label: "Comisiones",
            value: -totalCommissionsAmount,
            detail: "Pagos a colaboradores",
          },
          {
            label: "Participación sobre ingresos",
            value: commissionsShare,
            detail: "Porcentaje sobre ingresos brutos",
            isPercentage: true,
          },
        ],
      },
    ],
    [
      commissionsShare,
      metrics.kpis.grossMargin,
      metrics.kpis.grossRevenue,
      metrics.kpis.netMargin,
      metrics.kpis.netRevenue,
      netResult,
      otherExpensesAmount,
      rentExpenses,
      salaryExpenses,
      totalCommissionsAmount,
      totalExpensesAmount,
    ],
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
        <CardContent className="pt-0">
          <div className="px-5 pb-5">
            <div className="overflow-hidden rounded-xl bg-card/70 shadow-sm">
              <Table className="[&_tr]:border-0">
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <TableHead>Concepto</TableHead>
                    <TableHead className="hidden sm:table-cell">Detalle</TableHead>
                    <TableHead className="text-right tabular-nums w-[140px] sm:w-[160px]">
                      Valor
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialSummaryRows.map((row) => (
                    <TableRow
                      key={row.label}
                      className={cn(
                        isResultLabel(row.label) && "bg-muted/50 dark:bg-muted/40",
                      )}
                    >
                      <TableCell>
                        <span className="block text-sm font-semibold text-foreground">{row.label}</span>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {row.detail}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-base font-semibold text-foreground tabular-nums w-[140px] sm:w-[160px]",
                          getValueToneClass(row.value),
                        )}
                      >
                    {row.value === null
                      ? "—"
                      : row.isPercentage
                        ? formatPercentage(row.value)
                        : formatCurrency(row.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados financieros */}
      <Card className="mt-2 border-dashed">
        <CardHeader>
          <CardTitle>Resultados financieros</CardTitle>
          <CardDescription>Visión consolidada de ingresos, egresos y margen</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="px-5 pb-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right tabular-nums w-[140px] sm:w-[160px]">
                    Monto
                  </TableHead>
                  <TableHead className="hidden text-right md:table-cell">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financialSections.map((section) => (
                  <React.Fragment key={section.title}>
                    <TableRow
                      className={cn(
                        section.title !== "Comisiones" &&
                          "bg-muted/50 dark:bg-muted/40",
                      )}
                    >
                      <TableCell
                        colSpan={3}
                        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {section.title}
                      </TableCell>
                    </TableRow>
                    {section.items.map((item) => (
                      <TableRow
                        key={item.label}
                        className={cn(
                          isResultLabel(item.label) && "bg-muted/50 dark:bg-muted/40",
                        )}
                      >
                        <TableCell className="text-sm font-medium">{item.label}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold tabular-nums w-[140px] sm:w-[160px]",
                            item.emphasis && "text-lg",
                            getValueToneClass(item.value),
                          )}
                        >
                          {item.value === null
                            ? "—"
                            : item.isPercentage
                              ? formatPercentage(item.value)
                              : formatCurrency(item.value)}
                        </TableCell>
                        <TableCell className="hidden text-right text-sm text-muted-foreground md:table-cell">
                          {item.detail}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
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
                    <TableHead className="text-right tabular-nums w-[140px] sm:w-[160px]">
                      Costo mensual
                    </TableHead>
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
                        <TableCell
                          className={cn(
                            "text-right font-semibold tabular-nums w-[140px] sm:w-[160px]",
                            getValueToneClass(salonRent),
                          )}
                        >
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
                    <TableCell
                      className={cn(
                        "text-right font-bold text-lg tabular-nums w-[140px] sm:w-[160px]",
                        getValueToneClass(rentExpenses),
                      )}
                    >
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
                      <span
                        className={cn(
                          "font-semibold",
                          getValueToneClass(salaryExpenses),
                        )}
                      >
                        {formatCurrency(salaryExpenses)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {employees.length} empleado{employees.length !== 1 ? 's' : ''} activo{employees.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground">
                      Nota: Los salarios se registran como gastos con categoría &quot;salario&quot;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No hay salarios registrados</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registra gastos con categoría &quot;salario&quot; para verlos aquí
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
                  <TableHead className="text-right tabular-nums w-[140px] sm:w-[160px]">
                    Importe total
                  </TableHead>
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
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums w-[140px] sm:w-[160px]",
                      getValueToneClass(comm.total),
                    )}
                  >
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
              <TableCell
                className={cn(
                  "text-right font-bold text-lg tabular-nums w-[140px] sm:w-[160px]",
                  getValueToneClass(totalCommissionsAmount),
                )}
              >
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

      <Card>
          <CardHeader>
            <CardTitle>Pagos por Método</CardTitle>
            <CardDescription>Distribución de ingresos</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="px-5 pb-5">
              {paymentsByMethod.length > 0 ? (
                <Table className="[&_tr]:border-0">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right tabular-nums w-[140px] sm:w-[160px]">
                        Monto
                      </TableHead>
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
                          <TableCell
                            className={cn(
                              "text-right font-semibold tabular-nums w-[140px] sm:w-[160px]",
                              getValueToneClass(payment.amount),
                            )}
                          >
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
                      <TableCell
                        className={cn(
                          "text-right font-bold text-lg tabular-nums w-[140px] sm:w-[160px]",
                          getValueToneClass(totalPaymentsAmount),
                        )}
                      >
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
            </div>
          </CardContent>
        </Card>
    </div>
  </div>
  );
}
