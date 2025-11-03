import type { Invoice } from '../types';
import type { DailyCashRegister } from '../types';
import type { Expense } from '../types';
import type { Payment } from '../hooks/usePayments';

export function validateInvoice(invoice: Partial<Invoice>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!invoice.type || !['invoice', 'credit_note', 'debit_note'].includes(invoice.type)) {
    errors.push('Tipo de factura inválido');
  }

  if (!invoice.number || invoice.number.trim() === '') {
    errors.push('Número de factura requerido');
  }

  if (!invoice.date) {
    errors.push('Fecha requerida');
  }

  if (invoice.net_amount === undefined || invoice.net_amount < 0) {
    errors.push('Monto neto inválido');
  }

  if (invoice.tax_amount === undefined || invoice.tax_amount < 0) {
    errors.push('Monto de impuestos inválido');
  }

  if (invoice.total_amount === undefined || invoice.total_amount < 0) {
    errors.push('Monto total inválido');
  }

  // Validar que total_amount = net_amount + tax_amount (con tolerancia)
  if (invoice.net_amount !== undefined && invoice.tax_amount !== undefined && invoice.total_amount !== undefined) {
    const expectedTotal = invoice.net_amount + invoice.tax_amount;
    const diff = Math.abs(invoice.total_amount - expectedTotal);
    if (diff > 0.01) {
      errors.push('El monto total no coincide con la suma de neto + impuestos');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateCashRegister(
  register: Partial<DailyCashRegister>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!register.date) {
    errors.push('Fecha requerida');
  }

  if (register.opening_amount === undefined || register.opening_amount < 0) {
    errors.push('Monto de apertura inválido');
  }

  if (register.closing_amount !== undefined && register.closing_amount < 0) {
    errors.push('Monto de cierre inválido');
  }

  if (register.actual_amount !== undefined && register.actual_amount < 0) {
    errors.push('Monto real contado inválido');
  }

  // Validar diferencia si hay cierre
  if (
    register.closing_amount !== undefined &&
    register.actual_amount !== undefined &&
    register.difference !== undefined
  ) {
    const expectedDiff = register.actual_amount - register.closing_amount;
    const diff = Math.abs(register.difference - expectedDiff);
    if (diff > 0.01) {
      errors.push('La diferencia no coincide con el cálculo esperado');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateExpense(expense: Partial<Expense>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!expense.description || expense.description.trim() === '') {
    errors.push('Descripción requerida');
  }

  if (expense.amount === undefined || expense.amount <= 0) {
    errors.push('Monto inválido (debe ser mayor a 0)');
  }

  if (!expense.incurred_at) {
    errors.push('Fecha requerida');
  }

  if (expense.type && !['fixed', 'variable', 'supply_purchase'].includes(expense.type)) {
    errors.push('Tipo de gasto inválido');
  }

  if (expense.payment_status && !['pending', 'paid', 'partial'].includes(expense.payment_status)) {
    errors.push('Estado de pago inválido');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validatePayment(payment: Partial<Payment>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (payment.amount === undefined || payment.amount <= 0) {
    errors.push('Monto inválido (debe ser mayor a 0)');
  }

  if (!payment.paymentMethod || !['cash', 'card', 'transfer', 'other'].includes(payment.paymentMethod)) {
    errors.push('Método de pago inválido');
  }

  if (!payment.date) {
    errors.push('Fecha requerida');
  }

  if (payment.discountAmount !== undefined && payment.discountAmount < 0) {
    errors.push('Descuento inválido (no puede ser negativo)');
  }

  if (payment.taxAmount !== undefined && payment.taxAmount < 0) {
    errors.push('Impuesto inválido (no puede ser negativo)');
  }

  if (payment.tipAmount !== undefined && payment.tipAmount < 0) {
    errors.push('Propina inválida (no puede ser negativa)');
  }

  if (payment.gatewayFee !== undefined && payment.gatewayFee < 0) {
    errors.push('Comisión de pasarela inválida (no puede ser negativa)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

