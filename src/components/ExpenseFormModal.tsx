import React, { useState } from 'react';
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
          <DialogDescription>Registra un gasto en el sistema</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Monto</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del gasto..."
            />
          </div>

          <div>
            <Label htmlFor="category">Categoría</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Alquiler, Marketing, Insumos..."
            />
          </div>

          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as Expense['type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fijo</SelectItem>
                <SelectItem value="variable">Variable</SelectItem>
                <SelectItem value="supply_purchase">Compra de Insumos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="payment-status">Estado de Pago</Label>
            <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as Expense['payment_status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
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
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? 'Guardando...' : expense ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

