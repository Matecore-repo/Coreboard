import { useMemo } from 'react';
import { usePayments } from './usePayments';
import { useExpenses } from './useExpenses';
import { useAppointments } from './useAppointments';
import { useCommissions } from './useCommissions';
import type { Appointment } from '../types';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface KPIs {
  grossRevenue: number;
  netRevenue: number;
  grossMargin: number;
  netMargin: number;
  averageTicket: number;
  occupancyRate: number;
  dailyCash: number;
  pendingSettlement: number;
}

export interface FinancialMetrics {
  kpis: KPIs;
  margins: {
    grossMargin: number;
    netMargin: number;
    grossMarginPercent: number;
    netMarginPercent: number;
  };
  occupancy: {
    rate: number;
    hoursSold: number;
    hoursAvailable: number;
  };
  breakEven: {
    dailyFixedCost: number;
    dailyRevenue: number;
    breakEvenPoint: number;
  };
  projection: {
    next30Days: number;
    next90Days: number;
  };
}

export function useFinancialMetrics(
  selectedSalonId?: string | null,
  dateRange?: DateRange
) {
  const { payments } = usePayments({ enabled: true });
  const { expenses } = useExpenses({ enabled: true });
  const { appointments } = useAppointments(selectedSalonId || undefined, { enabled: true });
  const { commissions } = useCommissions({ enabled: true });

  const filteredAppointments = useMemo(() => {
    if (!dateRange) return appointments;
    return appointments.filter(apt => {
      const aptAny = apt as any;
      const aptDate = aptAny.starts_at 
        ? new Date(aptAny.starts_at).toISOString().split('T')[0]
        : aptAny.date 
          ? new Date(aptAny.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
      return aptDate >= dateRange.startDate && aptDate <= dateRange.endDate;
    });
  }, [appointments, dateRange]);

  const filteredPayments = useMemo(() => {
    if (!dateRange) return payments;
    return payments.filter(payment => {
      const paymentDate = payment.date;
      return paymentDate >= dateRange.startDate && paymentDate <= dateRange.endDate;
    });
  }, [payments, dateRange]);

  const filteredExpenses = useMemo(() => {
    if (!dateRange) return expenses;
    return expenses.filter(expense => {
      const expenseDate = expense.incurred_at;
      return expenseDate >= dateRange.startDate && expenseDate <= dateRange.endDate;
    });
  }, [expenses, dateRange]);

  const calculateKPIs = useMemo((): KPIs => {
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed');
    
    // Ingreso bruto: suma de total_amount de turnos completados
    const grossRevenue = completedAppointments.reduce((sum, apt) => sum + ((apt as any).total_amount || 0), 0);
    
    // Ingreso neto: bruto - descuentos - impuestos (asumiendo que están en payments)
    const netRevenue = filteredPayments.reduce((sum, payment) => {
      return sum + payment.amount - (payment.discountAmount || 0) - (payment.taxAmount || 0);
    }, 0);
    
    // Costos directos: comisiones + costos directos de appointments
    const directCosts = commissions.reduce((sum, comm) => sum + comm.amount, 0);
    
    // Margen bruto: ingreso neto - costos directos
    const grossMargin = netRevenue - directCosts;
    
    // Gastos totales (fijos + variables)
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Margen neto: margen bruto - gastos
    const netMargin = grossMargin - totalExpenses;
    
    // Ticket promedio
    const averageTicket = completedAppointments.length > 0 
      ? netRevenue / completedAppointments.length 
      : 0;
    
    // % Ocupación: horas vendidas / horas disponibles (simplificado)
    const totalAppointments = filteredAppointments.length;
    const occupancyRate = totalAppointments > 0 
      ? (completedAppointments.length / totalAppointments) * 100 
      : 0;
    
    // Caja del día (últimos pagos del día actual)
    const today = new Date().toISOString().split('T')[0];
    const todayPayments = filteredPayments.filter(p => p.date === today);
    const dailyCash = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // Saldo por liquidar: pagos con gatewaySettlementDate pendiente
    const pendingSettlement = filteredPayments
      .filter(p => p.gatewaySettlementDate === null || p.gatewaySettlementDate === undefined)
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      grossRevenue,
      netRevenue,
      grossMargin,
      netMargin,
      averageTicket,
      occupancyRate,
      dailyCash,
      pendingSettlement,
    };
  }, [filteredAppointments, filteredPayments, filteredExpenses, commissions]);

  const calculateMargins = useMemo(() => {
    const kpis = calculateKPIs;
    const grossMarginPercent = kpis.netRevenue > 0 
      ? (kpis.grossMargin / kpis.netRevenue) * 100 
      : 0;
    const netMarginPercent = kpis.netRevenue > 0 
      ? (kpis.netMargin / kpis.netRevenue) * 100 
      : 0;
    
    return {
      grossMargin: kpis.grossMargin,
      netMargin: kpis.netMargin,
      grossMarginPercent,
      netMarginPercent,
    };
  }, [calculateKPIs]);

  const calculateOccupancyRate = useMemo(() => {
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed');
    const totalAppointments = filteredAppointments.length;
    
    // Simplificado: asumimos que cada turno tiene duración estimada
    // En producción, esto debería calcularse con las horas reales disponibles
    const hoursSold = completedAppointments.length; // Simplificado
    const hoursAvailable = totalAppointments; // Simplificado
    
    const rate = hoursAvailable > 0 
      ? (hoursSold / hoursAvailable) * 100 
      : 0;
    
    return {
      rate,
      hoursSold,
      hoursAvailable,
    };
  }, [filteredAppointments]);

  const calculateBreakEven = useMemo(() => {
    // Gastos fijos diarios (promedio mensual / 30)
    const fixedExpenses = filteredExpenses
      .filter(exp => exp.type === 'fixed')
      .reduce((sum, exp) => sum + exp.amount, 0);
    const dailyFixedCost = fixedExpenses / 30; // Simplificado
    
    // Ingreso diario promedio
    const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const days = dateRange 
      ? Math.max(1, Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 30;
    const dailyRevenue = totalRevenue / days;
    
    return {
      dailyFixedCost,
      dailyRevenue,
      breakEvenPoint: dailyFixedCost,
    };
  }, [filteredExpenses, filteredPayments, dateRange]);

  const calculateProjections = useMemo(() => {
    // Proyección simple: tendencia lineal basada en últimos días
    const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const days = dateRange 
      ? Math.max(1, Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 30;
    const dailyAverage = totalRevenue / days;
    
    return {
      next30Days: dailyAverage * 30,
      next90Days: dailyAverage * 90,
    };
  }, [filteredPayments, dateRange]);

  const metrics: FinancialMetrics = useMemo(() => ({
    kpis: calculateKPIs,
    margins: calculateMargins,
    occupancy: calculateOccupancyRate,
    breakEven: calculateBreakEven,
    projection: calculateProjections,
  }), [calculateKPIs, calculateMargins, calculateOccupancyRate, calculateBreakEven, calculateProjections]);

  return metrics;
}

