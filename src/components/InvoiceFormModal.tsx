import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useInvoices } from '../hooks/useInvoices';
import { useAuth } from '../contexts/AuthContext';
import { toastSuccess, toastError } from '../lib/toast';
import type { Invoice } from '../types';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice;
}

export function InvoiceFormModal({ isOpen, onClose, invoice }: InvoiceFormModalProps) {
  const { currentOrgId } = useAuth();
  const { createInvoice, updateInvoice } = useInvoices({ enabled: true });
  const [type, setType] = useState<Invoice['type']>(invoice?.type || 'invoice');
  const [number, setNumber] = useState(invoice?.number || '');
  const [date, setDate] = useState(invoice?.date || new Date().toISOString().split('T')[0]);
  const [clientId, setClientId] = useState(invoice?.client_id || '');
  const [netAmount, setNetAmount] = useState(invoice?.net_amount.toString() || '');
  const [taxAmount, setTaxAmount] = useState(invoice?.tax_amount.toString() || '');
  const [totalAmount, setTotalAmount] = useState(invoice?.total_amount.toString() || '');
  const [paymentStatus, setPaymentStatus] = useState(invoice?.payment_status || '');
  const [paymentMethod, setPaymentMethod] = useState(invoice?.payment_method || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (invoice) {
      setType(invoice.type);
      setNumber(invoice.number);
      setDate(invoice.date);
      setClientId(invoice.client_id || '');
      setNetAmount(invoice.net_amount.toString());
      setTaxAmount(invoice.tax_amount.toString());
      setTotalAmount(invoice.total_amount.toString());
      setPaymentStatus(invoice.payment_status || '');
      setPaymentMethod(invoice.payment_method || '');
    } else {
      setType('invoice');
      setNumber('');
      setDate(new Date().toISOString().split('T')[0]);
      setClientId('');
      setNetAmount('');
      setTaxAmount('');
      setTotalAmount('');
      setPaymentStatus('');
      setPaymentMethod('');
    }
  }, [invoice, isOpen]);

  useEffect(() => {
    // Calcular total automáticamente si netAmount y taxAmount están presentes
    if (netAmount && taxAmount) {
      const net = parseFloat(netAmount) || 0;
      const tax = parseFloat(taxAmount) || 0;
      setTotalAmount((net + tax).toString());
    }
  }, [netAmount, taxAmount]);

  const handleSubmit = async () => {
    if (!number.trim()) {
      toastError('Número de factura requerido');
      return;
    }
    if (!netAmount || parseFloat(netAmount) < 0) {
      toastError('Monto neto inválido');
      return;
    }
    if (!taxAmount || parseFloat(taxAmount) < 0) {
      toastError('Monto de impuesto inválido');
      return;
    }

    setLoading(true);
    try {
      const invoiceData: Partial<Invoice> = {
        org_id: currentOrgId || '',
        type,
        number: number.trim(),
        date,
        client_id: clientId || undefined,
        net_amount: parseFloat(netAmount),
        tax_amount: parseFloat(taxAmount),
        total_amount: parseFloat(totalAmount),
        payment_status: paymentStatus || undefined,
        payment_method: paymentMethod || undefined,
      };

      if (invoice) {
        await updateInvoice(invoice.id, invoiceData);
        toastSuccess('Factura actualizada exitosamente');
      } else {
        await createInvoice(invoiceData);
        toastSuccess('Factura creada exitosamente');
      }
      onClose();
    } catch (error) {
      console.error('Error guardando factura:', error);
      toastError('Error al guardar la factura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? 'Editar Factura' : 'Nueva Factura'}</DialogTitle>
          <DialogDescription>Registra una factura en el sistema</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="type">Tipo *</Label>
            <Select value={type} onValueChange={(value) => setType(value as Invoice['type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">Factura</SelectItem>
                <SelectItem value="credit_note">Nota de Crédito</SelectItem>
                <SelectItem value="debit_note">Nota de Débito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="number">Número *</Label>
            <Input
              id="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Número de factura..."
            />
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
            <Label htmlFor="client-id">ID Cliente (Opcional)</Label>
            <Input
              id="client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="ID del cliente..."
            />
          </div>

          <div>
            <Label htmlFor="net-amount">Monto Neto *</Label>
            <Input
              id="net-amount"
              type="number"
              step="0.01"
              value={netAmount}
              onChange={(e) => setNetAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="tax-amount">Impuesto *</Label>
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
            <Label htmlFor="total-amount">Total</Label>
            <Input
              id="total-amount"
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              readOnly
            />
            <p className="text-xs text-muted-foreground mt-1">Calculado automáticamente</p>
          </div>

          <div>
            <Label htmlFor="payment-status">Estado de Pago</Label>
            <Input
              id="payment-status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              placeholder="Ej: pending, paid, cancelled..."
            />
          </div>

          <div>
            <Label htmlFor="payment-method">Método de Pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? 'Guardando...' : invoice ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

