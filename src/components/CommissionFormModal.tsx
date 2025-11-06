import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCommissions, type Commission } from '../hooks/useCommissions';
import { useAuth } from '../contexts/AuthContext';
import { toastSuccess, toastError } from '../lib/toast';
import { useEmployees, type Employee } from '../hooks/useEmployees';

interface CommissionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  commission?: Commission;
}

export function CommissionFormModal({ isOpen, onClose, commission }: CommissionFormModalProps) {
  const { currentOrgId } = useAuth();
  const { createCommission, updateCommission } = useCommissions({ enabled: true });
  const { employees } = useEmployees(currentOrgId || undefined, { enabled: true });
  const [employeeId, setEmployeeId] = useState(commission?.employee_id || '');
  const [amount, setAmount] = useState(commission?.amount.toString() || '');
  const [commissionRate, setCommissionRate] = useState(commission?.commission_rate.toString() || '');
  const [date, setDate] = useState(commission?.date || new Date().toISOString().split('T')[0]);
  const [appointmentId, setAppointmentId] = useState(commission?.appointment_id || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (commission) {
      setEmployeeId(commission.employee_id);
      setAmount(commission.amount.toString());
      setCommissionRate(commission.commission_rate.toString());
      setDate(commission.date);
      setAppointmentId(commission.appointment_id || '');
    } else {
      setEmployeeId('');
      setAmount('');
      setCommissionRate('');
      setDate(new Date().toISOString().split('T')[0]);
      setAppointmentId('');
    }
  }, [commission, isOpen]);

  const handleSubmit = async () => {
    if (!employeeId) {
      toastError('Empleado requerido');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toastError('Monto inválido');
      return;
    }
    if (!commissionRate || parseFloat(commissionRate) < 0 || parseFloat(commissionRate) > 100) {
      toastError('Tasa de comisión inválida (debe estar entre 0 y 100)');
      return;
    }

    setLoading(true);
    try {
      const commissionData: Partial<Commission> = {
        org_id: currentOrgId || '',
        employee_id: employeeId,
        amount: parseFloat(amount),
        commission_rate: parseFloat(commissionRate),
        date,
        appointment_id: appointmentId || undefined,
      };

      if (commission) {
        await updateCommission(commission.id, commissionData);
        toastSuccess('Comisión actualizada exitosamente');
      } else {
        await createCommission(commissionData);
        toastSuccess('Comisión creada exitosamente');
      }
      onClose();
    } catch (error) {
      console.error('Error guardando comisión:', error);
      toastError('Error al guardar la comisión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        role="dialog"
        aria-labelledby="commission-dialog-title"
        aria-describedby="commission-dialog-description"
        aria-modal="true"
        data-modal="commission"
      >
        <DialogHeader>
          <DialogTitle id="commission-dialog-title">{commission ? 'Editar Comisión' : 'Nueva Comisión'}</DialogTitle>
          <DialogDescription id="commission-dialog-description">Registra una comisión en el sistema</DialogDescription>
        </DialogHeader>
        
        <form className="space-y-4" role="form" aria-label="Formulario de comisión">
          <div>
            <Label htmlFor="employee-id">Empleado *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="employee-id" aria-label="Seleccionar empleado" aria-required="true" data-field="employee-id">
                <SelectValue placeholder="Selecciona un empleado" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp: Employee) => (
                  <SelectItem key={emp.id} value={emp.id} aria-label={`Empleado: ${emp.full_name || emp.email || emp.id}`}>
                    {emp.full_name || emp.email || emp.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Monto *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              aria-label="Monto de la comisión"
              aria-required="true"
              data-field="amount"
            />
          </div>

          <div>
            <Label htmlFor="commission-rate">Tasa de Comisión (%) *</Label>
            <Input
              id="commission-rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              placeholder="0.00"
              aria-label="Tasa de comisión en porcentaje"
              aria-required="true"
              data-field="commission-rate"
            />
          </div>

          <div>
            <Label htmlFor="date">Fecha *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Fecha de la comisión"
              aria-required="true"
              data-field="date"
            />
          </div>

          <div>
            <Label htmlFor="appointment-id">ID Turno (Opcional)</Label>
            <Input
              id="appointment-id"
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
              placeholder="ID del turno relacionado..."
              aria-label="ID del turno relacionado (opcional)"
              data-field="appointment-id"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="w-full"
            aria-label={commission ? "Actualizar comisión" : "Crear comisión"}
            data-action={commission ? "update-commission" : "create-commission"}
          >
            {loading ? 'Guardando...' : commission ? 'Actualizar' : 'Crear'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

