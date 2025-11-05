import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { usePayments, type Payment } from '../../hooks/usePayments';
import { useExpenses } from '../../hooks/useExpenses';
import { useCommissions, type Commission } from '../../hooks/useCommissions';
import { useInvoices } from '../../hooks/useInvoices';
import type { Expense } from '../../types';
import type { Invoice } from '../../types';
import { useEmployees } from '../../hooks/useEmployees';
import { useAuth } from '../../contexts/AuthContext';
import { ExpenseFormModal } from '../ExpenseFormModal';
import { PaymentFormModal } from '../PaymentFormModal';
import { CommissionFormModal } from '../CommissionFormModal';
import { InvoiceFormModal } from '../InvoiceFormModal';
import { ExportButton } from '../ui/ExportButton';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface AccountingDashboardProps {
  selectedSalon?: string | null;
  dateRange?: { startDate: string; endDate: string };
}

export default function AccountingDashboard({ selectedSalon, dateRange }: AccountingDashboardProps) {
  const { currentOrgId } = useAuth();
  const { employees } = useEmployees(currentOrgId ?? undefined, { enabled: true });
  const { payments, deletePayment } = usePayments({ enabled: true });
  const { expenses, deleteExpense } = useExpenses({ enabled: true, filters: selectedSalon ? { salonId: selectedSalon } : undefined });
  const { commissions, deleteCommission } = useCommissions({ enabled: true });
  const { invoices, deleteInvoice } = useInvoices({ enabled: true });

  // Filtrar por rango de fechas si está definido
  const filteredPayments = useMemo(() => {
    if (!dateRange) return payments;
    return payments.filter(p => p.date >= dateRange.startDate && p.date <= dateRange.endDate);
  }, [payments, dateRange]);

  const filteredExpenses = useMemo(() => {
    if (!dateRange) return expenses;
    return expenses.filter(e => e.incurred_at >= dateRange.startDate && e.incurred_at <= dateRange.endDate);
  }, [expenses, dateRange]);

  const filteredCommissions = useMemo(() => {
    if (!dateRange) return commissions;
    return commissions.filter(c => c.date >= dateRange.startDate && c.date <= dateRange.endDate);
  }, [commissions, dateRange]);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | undefined>();
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | undefined>();
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'expense' | 'payment' | 'commission' | 'invoice' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const incomeStatement = useMemo(() => {
    const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalCommissions = filteredCommissions.reduce((sum, c) => sum + c.amount, 0);
    const grossMargin = totalRevenue - totalCommissions;
    const netIncome = grossMargin - totalExpenses;

    return {
      revenue: totalRevenue,
      directCosts: totalCommissions,
      grossMargin,
      expenses: totalExpenses,
      netIncome,
    };
  }, [filteredPayments, filteredExpenses, filteredCommissions]);

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseModalOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    setDeleteType('expense');
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentModalOpen(true);
  };

  const handleDeletePayment = (id: string) => {
    setDeleteType('payment');
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleEditCommission = (commission: Commission) => {
    setSelectedCommission(commission);
    setCommissionModalOpen(true);
  };

  const handleDeleteCommission = (id: string) => {
    setDeleteType('commission');
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceModalOpen(true);
  };

  const handleDeleteInvoice = (id: string) => {
    setDeleteType('invoice');
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId || !deleteType) return;

    try {
      switch (deleteType) {
        case 'expense':
          await deleteExpense(deleteId);
          toast.success('Gasto eliminado exitosamente');
          break;
        case 'payment':
          await deletePayment(deleteId);
          toast.success('Pago eliminado exitosamente');
          break;
        case 'commission':
          await deleteCommission(deleteId);
          toast.success('Comisión eliminada exitosamente');
          break;
        case 'invoice':
          await deleteInvoice(deleteId);
          toast.success('Factura eliminada exitosamente');
          break;
      }
      setDeleteDialogOpen(false);
      setDeleteType(null);
      setDeleteId(null);
    } catch (error) {
      console.error('Error eliminando:', error);
      toast.error('Error al eliminar el registro');
    }
  };

  const expensesExportData = useMemo(() => {
    return filteredExpenses.map(exp => ({
      Fecha: exp.incurred_at,
      Monto: exp.amount,
      Descripción: exp.description,
      Categoría: exp.category || '',
      Tipo: exp.type || '',
      Estado: exp.payment_status || '',
    }));
  }, [filteredExpenses]);

  const paymentsExportData = useMemo(() => {
    return filteredPayments.map(pay => ({
      Fecha: pay.date,
      Monto: pay.amount,
      Método: pay.paymentMethod,
      Notas: pay.notes || '',
      Descuento: pay.discountAmount || 0,
      Impuesto: pay.taxAmount || 0,
      Propina: pay.tipAmount || 0,
    }));
  }, [filteredPayments]);

  const commissionsExportData = useMemo(() => {
    return filteredCommissions.map(comm => {
      const employee = employees.find(emp => emp.id === comm.employee_id);
      return {
        Fecha: new Date(comm.date).toLocaleDateString('es-AR'),
        Empleado: employee?.full_name || employee?.email || `Empleado ${comm.employee_id.substring(0, 8)}`,
        Monto: comm.amount,
        'Tasa (%)': comm.commission_rate,
        'ID Turno': comm.appointment_id || '',
      };
    });
  }, [filteredCommissions, employees]);

  const invoicesExportData = useMemo(() => {
    return invoices.map(inv => ({
      Fecha: inv.date,
      Número: inv.number,
      Tipo: inv.type,
      'Monto Neto': inv.net_amount,
      Impuesto: inv.tax_amount,
      Total: inv.total_amount,
      'Estado Pago': inv.payment_status || '',
      'Método Pago': inv.payment_method || '',
    }));
  }, [invoices]);

  const incomeStatementExportData = useMemo(() => {
    return [
      { 'Concepto': 'Ingresos Netos', 'Monto': incomeStatement.revenue },
      { 'Concepto': 'Costo Directo (Comisiones)', 'Monto': incomeStatement.directCosts },
      { 'Concepto': 'Margen Bruto', 'Monto': incomeStatement.grossMargin },
      { 'Concepto': 'Gastos', 'Monto': incomeStatement.expenses },
      { 'Concepto': 'Resultado Neto', 'Monto': incomeStatement.netIncome },
    ];
  }, [incomeStatement]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estado de Resultados</CardTitle>
              <CardDescription>Resumen financiero mensual</CardDescription>
            </div>
            <ExportButton data={incomeStatementExportData} filename="estado_resultados" />
          </div>
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

      {/* Gastos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gastos</CardTitle>
              <CardDescription>Total de gastos: {filteredExpenses.length}</CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportButton data={expensesExportData} filename="gastos" />
              <Button onClick={() => { setSelectedExpense(undefined); setExpenseModalOpen(true); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No hay gastos registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map(exp => (
                  <TableRow key={exp.id}>
                    <TableCell>{new Date(exp.incurred_at).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell>${exp.amount.toLocaleString()}</TableCell>
                    <TableCell>{exp.description}</TableCell>
                    <TableCell>{exp.category || '-'}</TableCell>
                    <TableCell>{exp.type || '-'}</TableCell>
                    <TableCell>{exp.payment_status || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditExpense(exp)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(exp.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pagos</CardTitle>
              <CardDescription>Total de pagos: {filteredPayments.length}</CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportButton data={paymentsExportData} filename="pagos" />
              <Button onClick={() => { setSelectedPayment(undefined); setPaymentModalOpen(true); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No hay pagos registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map(pay => (
                  <TableRow key={pay.id}>
                    <TableCell>{new Date(pay.date).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell>${pay.amount.toLocaleString()}</TableCell>
                    <TableCell>{pay.paymentMethod}</TableCell>
                    <TableCell>{pay.notes || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditPayment(pay)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePayment(pay.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Comisiones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Comisiones por Profesional</CardTitle>
              <CardDescription>Total de comisiones: {filteredCommissions.length}</CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportButton data={commissionsExportData} filename="comisiones" />
              <Button onClick={() => { setSelectedCommission(undefined); setCommissionModalOpen(true); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCommissions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No hay comisiones registradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Tasa (%)</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.map(comm => {
                  const employee = employees.find(emp => emp.id === comm.employee_id);
                  return (
                    <TableRow key={comm.id}>
                      <TableCell>{new Date(comm.date).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell>
                        {employee?.full_name || employee?.email || `Empleado ${comm.employee_id.substring(0, 8)}`}
                      </TableCell>
                      <TableCell>${comm.amount.toLocaleString()}</TableCell>
                      <TableCell>{comm.commission_rate}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditCommission(comm)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteCommission(comm.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Facturas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Facturas</CardTitle>
              <CardDescription>Total de facturas: {invoices.length}</CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportButton data={invoicesExportData} filename="facturas" />
              <Button onClick={() => { setSelectedInvoice(undefined); setInvoiceModalOpen(true); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No hay facturas registradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto Neto</TableHead>
                  <TableHead>Impuesto</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell>{new Date(inv.date).toLocaleDateString('es-AR')}</TableCell>
                    <TableCell>{inv.number}</TableCell>
                    <TableCell>{inv.type}</TableCell>
                    <TableCell>${inv.net_amount.toLocaleString()}</TableCell>
                    <TableCell>${inv.tax_amount.toLocaleString()}</TableCell>
                    <TableCell>${inv.total_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(inv)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteInvoice(inv.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <ExpenseFormModal
        isOpen={expenseModalOpen}
        onClose={() => { setExpenseModalOpen(false); setSelectedExpense(undefined); }}
        expense={selectedExpense}
        salonId={selectedSalon || undefined}
      />

      <PaymentFormModal
        isOpen={paymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setSelectedPayment(undefined); }}
        payment={selectedPayment}
      />

      <CommissionFormModal
        isOpen={commissionModalOpen}
        onClose={() => { setCommissionModalOpen(false); setSelectedCommission(undefined); }}
        commission={selectedCommission}
      />

      <InvoiceFormModal
        isOpen={invoiceModalOpen}
        onClose={() => { setInvoiceModalOpen(false); setSelectedInvoice(undefined); }}
        invoice={selectedInvoice}
      />

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
