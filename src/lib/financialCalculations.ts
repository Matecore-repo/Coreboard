import type { Appointment } from '../types';
import type { Payment } from '../hooks/usePayments';
import type { Expense } from '../types';
import type { Commission } from '../hooks/useCommissions';

export function calculateGrossRevenue(appointments: Appointment[]): number {
  return appointments
    .filter(apt => apt.status === 'completed')
    .reduce((sum, apt) => sum + (apt.total_amount || 0), 0);
}

export function calculateNetRevenue(payments: Payment[]): number {
  return payments.reduce((sum, payment) => {
    return sum + payment.amount - (payment.discountAmount || 0) - (payment.taxAmount || 0);
  }, 0);
}

export function calculateDirectCost(commissions: Commission[], appointments: Appointment[]): number {
  const commissionCost = commissions.reduce((sum, comm) => sum + comm.amount, 0);
  const appointmentDirectCost = appointments
    .filter(apt => apt.status === 'completed')
    .reduce((sum, apt) => sum + ((apt as any).direct_cost || 0), 0);
  return commissionCost + appointmentDirectCost;
}

export function calculateGrossMargin(netRevenue: number, directCost: number): number {
  return netRevenue - directCost;
}

export function calculateNetMargin(grossMargin: number, expenses: Expense[]): number {
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  return grossMargin - totalExpenses;
}

export function calculateOccupancy(
  completedAppointments: number,
  totalAppointments: number
): number {
  if (totalAppointments === 0) return 0;
  return (completedAppointments / totalAppointments) * 100;
}

export function calculateAverageTicket(
  netRevenue: number,
  completedAppointments: number
): number {
  if (completedAppointments === 0) return 0;
  return netRevenue / completedAppointments;
}

export function calculateBreakEven(
  fixedExpenses: Expense[],
  days: number
): { dailyFixedCost: number; breakEvenPoint: number } {
  const totalFixed = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const dailyFixedCost = totalFixed / days;
  return {
    dailyFixedCost,
    breakEvenPoint: dailyFixedCost,
  };
}

export function calculateProjection(
  payments: Payment[],
  days: number
): { next30Days: number; next90Days: number } {
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const dailyAverage = days > 0 ? totalRevenue / days : 0;
  return {
    next30Days: dailyAverage * 30,
    next90Days: dailyAverage * 90,
  };
}

