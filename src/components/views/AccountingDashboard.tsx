import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { usePayments } from '../../hooks/usePayments';
import { useExpenses } from '../../hooks/useExpenses';
import { useCommissions } from '../../hooks/useCommissions';
import { useInvoices } from '../../hooks/useInvoices';

interface AccountingDashboardProps {
  selectedSalon?: string | null;
}

export default function AccountingDashboard({ selectedSalon }: AccountingDashboardProps) {
  const { payments } = usePayments({ enabled: true });
  const { expenses } = useExpenses({ enabled: true });
  const { commissions } = useCommissions({ enabled: true });
  const { invoices } = useInvoices({ enabled: true });

  const incomeStatement = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
    const grossMargin = totalRevenue - totalCommissions;
    const netIncome = grossMargin - totalExpenses;

    return {
      revenue: totalRevenue,
      directCosts: totalCommissions,
      grossMargin,
      expenses: totalExpenses,
      netIncome,
    };
  }, [payments, expenses, commissions]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Estado de Resultados</CardTitle>
          <CardDescription>Resumen financiero mensual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Ingresos Netos:</span>
              <span className="font-semibold">${incomeStatement.revenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Costo Directo (Comisiones):</span>
              <span className="font-semibold">${incomeStatement.directCosts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>Margen Bruto:</span>
              <span className="font-semibold">${incomeStatement.grossMargin.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Gastos:</span>
              <span className="font-semibold">${incomeStatement.expenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Resultado Neto:</span>
              <span className={incomeStatement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                ${incomeStatement.netIncome.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comisiones por Profesional</CardTitle>
          <CardDescription>Total de comisiones pendientes y pagadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {commissions.slice(0, 10).map(comm => (
              <div key={comm.id} className="flex justify-between items-center p-2 border rounded">
                <span className="text-sm">{comm.employee_id}</span>
                <span className="font-semibold">${comm.amount.toLocaleString()}</span>
              </div>
            ))}
            {commissions.length === 0 && (
              <p className="text-muted-foreground text-sm">No hay comisiones registradas</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturas</CardTitle>
          <CardDescription>Total de facturas: {invoices.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {invoices.slice(0, 10).map(inv => (
              <div key={inv.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <span className="text-sm font-medium">{inv.number}</span>
                  <span className="text-xs text-muted-foreground ml-2">({inv.type})</span>
                </div>
                <span className="font-semibold">${inv.total_amount.toLocaleString()}</span>
              </div>
            ))}
            {invoices.length === 0 && (
              <p className="text-muted-foreground text-sm">No hay facturas registradas</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

