import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useExpenses } from '../hooks/useExpenses';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import type { Expense } from '../types';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense;
  salonId?: string;
}

const COMMON_CATEGORIES = [
  'Alquiler',
  'Servicios',
  'Sueldos',
  'Insumos',
  'Marketing',
  'Impuestos',
  'Mantenimiento',
  'Seguros',
];

export function ExpenseFormModal({ isOpen, onClose, expense, salonId }: ExpenseFormModalProps) {
  const { currentOrgId } = useAuth();
  const { createExpense, updateExpense } = useExpenses({ enabled: true });
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [category, setCategory] = useState(expense?.category || '');
  const [type, setType] = useState<Expense['type']>(expense?.type || 'variable');
  const [paymentStatus, setPaymentStatus] = useState<Expense['payment_status']>(expense?.payment_status || 'pending');
  const [incurredAt, setIncurredAt] = useState(expense?.incurred_at || new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setDescription(expense.description);
      setCategory(expense.category || '');
      setType(expense.type || 'variable');
      setPaymentStatus(expense.payment_status || 'pending');
      setIncurredAt(expense.incurred_at);
    } else if (isOpen) {
      setAmount('');
      setDescription('');
      setCategory('');
      setType('variable');
      setPaymentStatus('pending');
      setIncurredAt(new Date().toISOString().split('T')[0]);
    }
  }, [expense, isOpen]);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Monto inválido');
      return;
    }
    if (!description.trim()) {
      toast.error('Descripción requerida');
      return;
    }

    setLoading(true);
    try {
      const expenseData = {
        org_id: currentOrgId || '',
        salon_id: salonId,
        amount: parseFloat(amount),
        description: description.trim(),
        category: category || undefined,
        type,
        payment_status: paymentStatus,
        incurred_at: incurredAt,
      };

      if (expense) {
        await updateExpense(expense.id, expenseData);
        toast.success('Gasto actualizado exitosamente');
      } else {
        await createExpense(expenseData);
        toast.success('Gasto creado exitosamente');
      }
      onClose();
    } catch (error) {
      console.error('Error guardando gasto:', error);
      toast.error('Error al guardar el gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        role="dialog"
        aria-labelledby="expense-dialog-title"
        aria-describedby="expense-dialog-description"
        aria-modal="true"
        data-modal="expense"
      >
        <DialogHeader>
          <DialogTitle id="expense-dialog-title">{expense ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
          <DialogDescription id="expense-dialog-description">Registra un gasto en el sistema</DialogDescription>
        </DialogHeader>
        
        <form className="space-y-4" role="form" aria-label="Formulario de gasto">
          <div>
            <Label htmlFor="amount">Monto</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              aria-label="Monto del gasto"
              aria-required="true"
              data-field="amount"
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del gasto..."
              aria-label="Descripción del gasto"
              aria-required="true"
              data-field="description"
            />
          </div>

          <div>
            <Label htmlFor="category">Categoría</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Alquiler, Marketing, Insumos..."
              aria-label="Categoría del gasto (opcional)"
              data-field="category"
              list="expense-category-options"
            />
            <datalist id="expense-category-options">
              {COMMON_CATEGORIES.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as Expense['type'])}>
              <SelectTrigger id="type" aria-label="Seleccionar tipo de gasto" data-field="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed" aria-label="Tipo: Fijo">Fijo</SelectItem>
                <SelectItem value="variable" aria-label="Tipo: Variable">Variable</SelectItem>
                <SelectItem value="supply_purchase" aria-label="Tipo: Compra de Insumos">Compra de Insumos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="payment-status">Estado de Pago</Label>
            <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as Expense['payment_status'])}>
              <SelectTrigger id="payment-status" aria-label="Seleccionar estado de pago" data-field="payment-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending" aria-label="Estado: Pendiente">Pendiente</SelectItem>
                <SelectItem value="paid" aria-label="Estado: Pagado">Pagado</SelectItem>
                <SelectItem value="partial" aria-label="Estado: Parcial">Parcial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="incurred-at">Fecha</Label>
            <Input
              id="incurred-at"
              type="date"
              value={incurredAt}
              onChange={(e) => setIncurredAt(e.target.value)}
              aria-label="Fecha del gasto"
              data-field="incurred-at"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="w-full"
            aria-label={expense ? "Actualizar gasto" : "Crear gasto"}
            data-action={expense ? "update-expense" : "create-expense"}
          >
            {loading ? 'Guardando...' : expense ? 'Actualizar' : 'Crear'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

