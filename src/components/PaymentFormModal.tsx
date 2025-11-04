import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { usePayments, type Payment } from '../hooks/usePayments';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment?: Payment;
}

export function PaymentFormModal({ isOpen, onClose, payment }: PaymentFormModalProps) {
  const { currentOrgId } = useAuth();
  const { createPayment, updatePayment } = usePayments({ enabled: true });
  const [amount, setAmount] = useState(payment?.amount.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState<Payment['paymentMethod']>(payment?.paymentMethod || 'cash');
  const [date, setDate] = useState(payment?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(payment?.notes || '');
  const [discountAmount, setDiscountAmount] = useState(payment?.discountAmount?.toString() || '');
  const [taxAmount, setTaxAmount] = useState(payment?.taxAmount?.toString() || '');
  const [tipAmount, setTipAmount] = useState(payment?.tipAmount?.toString() || '');
  const [gatewayFee, setGatewayFee] = useState(payment?.gatewayFee?.toString() || '');
  const [gatewayTransactionId, setGatewayTransactionId] = useState(payment?.gatewayTransactionId || '');
  const [gatewaySettlementDate, setGatewaySettlementDate] = useState(payment?.gatewaySettlementDate || '');
  const [gatewaySettlementAmount, setGatewaySettlementAmount] = useState(payment?.gatewaySettlementAmount?.toString() || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (payment) {
      setAmount(payment.amount.toString());
      setPaymentMethod(payment.paymentMethod);
      setDate(payment.date);
      setNotes(payment.notes || '');
      setDiscountAmount(payment.discountAmount?.toString() || '');
      setTaxAmount(payment.taxAmount?.toString() || '');
      setTipAmount(payment.tipAmount?.toString() || '');
      setGatewayFee(payment.gatewayFee?.toString() || '');
      setGatewayTransactionId(payment.gatewayTransactionId || '');
      setGatewaySettlementDate(payment.gatewaySettlementDate || '');
      setGatewaySettlementAmount(payment.gatewaySettlementAmount?.toString() || '');
    } else {
      setAmount('');
      setPaymentMethod('cash');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setDiscountAmount('');
      setTaxAmount('');
      setTipAmount('');
      setGatewayFee('');
      setGatewayTransactionId('');
      setGatewaySettlementDate('');
      setGatewaySettlementAmount('');
    }
  }, [payment, isOpen]);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Monto inválido');
      return;
    }

    setLoading(true);
    try {
      const paymentData: Partial<Payment> = {
        orgId: currentOrgId || '',
        amount: parseFloat(amount),
        paymentMethod,
        date,
        notes: notes.trim() || undefined,
        discountAmount: discountAmount ? parseFloat(discountAmount) : undefined,
        taxAmount: taxAmount ? parseFloat(taxAmount) : undefined,
        tipAmount: tipAmount ? parseFloat(tipAmount) : undefined,
        gatewayFee: gatewayFee ? parseFloat(gatewayFee) : undefined,
        gatewayTransactionId: gatewayTransactionId.trim() || undefined,
        gatewaySettlementDate: gatewaySettlementDate || undefined,
        gatewaySettlementAmount: gatewaySettlementAmount ? parseFloat(gatewaySettlementAmount) : undefined,
      };

      if (payment) {
        await updatePayment(payment.id, paymentData);
        toast.success('Pago actualizado exitosamente');
      } else {
        await createPayment(paymentData);
        toast.success('Pago creado exitosamente');
      }
      onClose();
    } catch (error) {
      console.error('Error guardando pago:', error);
      toast.error('Error al guardar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{payment ? 'Editar Pago' : 'Nuevo Pago'}</DialogTitle>
          <DialogDescription>Registra un pago en el sistema</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Monto *</Label>
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
            <Label htmlFor="payment-method">Método de Pago *</Label>
            <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as Payment['paymentMethod'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Fecha *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
            />
          </div>

          <div>
            <Label htmlFor="discount-amount">Descuento</Label>
            <Input
              id="discount-amount"
              type="number"
              step="0.01"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="tax-amount">Impuesto</Label>
            <Input
              id="tax-amount"
              type="number"
              step="0.01"
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="tip-amount">Propina</Label>
            <Input
              id="tip-amount"
              type="number"
              step="0.01"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="gateway-fee">Comisión Pasarela</Label>
            <Input
              id="gateway-fee"
              type="number"
              step="0.01"
              value={gatewayFee}
              onChange={(e) => setGatewayFee(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="gateway-transaction-id">ID Transacción Pasarela</Label>
            <Input
              id="gateway-transaction-id"
              value={gatewayTransactionId}
              onChange={(e) => setGatewayTransactionId(e.target.value)}
              placeholder="ID de transacción..."
            />
          </div>

          <div>
            <Label htmlFor="gateway-settlement-date">Fecha Liquidación</Label>
            <Input
              id="gateway-settlement-date"
              type="date"
              value={gatewaySettlementDate}
              onChange={(e) => setGatewaySettlementDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="gateway-settlement-amount">Monto Liquidado</Label>
            <Input
              id="gateway-settlement-amount"
              type="number"
              step="0.01"
              value={gatewaySettlementAmount}
              onChange={(e) => setGatewaySettlementAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? 'Guardando...' : payment ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

