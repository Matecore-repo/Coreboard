import { useMemo, useSyncExternalStore } from 'react';
import { usePayments } from './usePayments';
import { useExpenses } from './useExpenses';
import { turnosStore, subscribeTurnosStore } from '../stores/turnosStore';
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
  const { commissions } = useCommissions({ enabled: true });

  const turnosSnapshot = useSyncExternalStore(
    subscribeTurnosStore,
    () => turnosStore.appointments,
    () => turnosStore.appointments,
  );

  // Usar turnosStore directamente
  const appointments = useMemo(() => {
    const allTurnos = turnosSnapshot;
    // Filtrar por salonId si se proporciona
    let filtered = selectedSalonId 
      ? allTurnos.filter(t => t.salonId === selectedSalonId)
      : allTurnos;
    
    // Convertir a formato Appointment para compatibilidad
    return filtered.map(t => ({
      id: t.id,
      org_id: t.org_id || '',
      salon_id: t.salonId,
      service_id: (t as any).service || '',
      stylist_id: t.stylist,
      client_name: t.clientName,
      client_phone: undefined,
      client_email: undefined,
      starts_at: `${t.date}T${t.time}:00`,
      status: t.status,
      total_amount: t.total_amount || 0,
      notes: t.notes,
      created_by: t.created_by || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Incluir servicePrice para el cálculo de ingresos
      servicePrice: (t as any).servicePrice || (t as any).service?.base_price || (t as any).services?.base_price || null,
      service: (t as any).service ? { base_price: (t as any).servicePrice || (t as any).service?.base_price } : null,
      services: (t as any).services ? { base_price: (t as any).servicePrice || (t as any).services?.base_price } : null,
    } as Appointment & { servicePrice?: number | null; service?: { base_price?: number } | null; services?: { base_price?: number } | null }));
  }, [turnosSnapshot, selectedSalonId]);

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
    // Cada turno completado genera ingresos basados en:
    // 1. total_amount si existe y es > 0
    // 2. O el precio del servicio (servicePrice) si total_amount es 0 o no existe
    const grossRevenueFromAppointments = completedAppointments.reduce((sum, apt) => {
      const aptAny = apt as any;
      // Priorizar total_amount, si es 0 o no existe, usar servicePrice
      const amount = (aptAny.total_amount && aptAny.total_amount > 0) 
        ? aptAny.total_amount 
        : (aptAny.servicePrice || aptAny.service?.base_price || aptAny.services?.base_price || 0);
      return sum + Number(amount || 0);
    }, 0);
    
    // Los pagos son adicionales o confirmación, pero los ingresos vienen de turnos completados
    const grossRevenueFromPayments = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Usar turnos completados como fuente principal, pagos como complemento si son mayores
    // Esto asegura que cada turno completado genere ingresos automáticamente
    const grossRevenue = Math.max(grossRevenueFromAppointments, grossRevenueFromPayments);
    
    // Ingreso neto: usar ingresos de turnos completados, menos descuentos/impuestos de pagos si existen
    // Si hay pagos, pueden tener descuentos/impuestos que ajustan el ingreso neto
    const adjustmentsFromPayments = filteredPayments.reduce((sum, payment) => {
      return sum - (payment.discountAmount || 0) - (payment.taxAmount || 0);
    }, 0);
    const netRevenue = grossRevenue + adjustmentsFromPayments;
    
    // Costos directos: comisiones + costos directos de appointments
    const directCosts = commissions.reduce((sum, comm) => sum + comm.amount, 0);
    
    // Margen bruto: ingreso neto - costos directos
    const grossMargin = netRevenue - directCosts;
    
    // Gastos totales (fijos + variables)
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Margen neto: margen bruto - gastos
    const netMargin = grossMargin - totalExpenses;
    
    // Ticket promedio: basado en turnos completados
    const averageTicket = completedAppointments.length > 0 
      ? grossRevenue / completedAppointments.length 
      : 0;
    
    // % Ocupación: horas vendidas / horas disponibles (simplificado)
    const totalAppointments = filteredAppointments.length;
    const occupancyRate = totalAppointments > 0 
      ? (completedAppointments.length / totalAppointments) * 100 
      : 0;
    
    // Caja del día: turnos completados hoy + pagos de hoy
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = completedAppointments.filter(apt => {
      const aptAny = apt as any;
      const aptDate = aptAny.starts_at 
        ? new Date(aptAny.starts_at).toISOString().split('T')[0]
        : aptAny.date || today;
      return aptDate === today;
    });
    const todayCashFromAppointments = todayAppointments.reduce((sum, apt) => {
      const aptAny = apt as any;
      const amount = (aptAny.total_amount && aptAny.total_amount > 0) 
        ? aptAny.total_amount 
        : (aptAny.servicePrice || aptAny.service?.base_price || aptAny.services?.base_price || 0);
      return sum + Number(amount || 0);
    }, 0);
    const todayPayments = filteredPayments.filter(p => p.date === today);
    const todayCashFromPayments = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    // Usar el mayor entre turnos de hoy y pagos de hoy
    const dailyCash = Math.max(todayCashFromAppointments, todayCashFromPayments);
    
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
    // Nota: La columna 'type' no existe en expenses, usar category como alternativa
    const fixedExpenses = filteredExpenses
      .filter(exp => exp.category === 'rent' || exp.category === 'alquiler' || exp.category === 'salario' || exp.category === 'salary')
      .reduce((sum, exp) => sum + exp.amount, 0);
    const dailyFixedCost = fixedExpenses / 30; // Simplificado
    
    // Ingreso diario promedio: basado en turnos completados
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed');
    const totalRevenueFromAppointments = completedAppointments.reduce((sum, apt) => {
      const aptAny = apt as any;
      const amount = (aptAny.total_amount && aptAny.total_amount > 0) 
        ? aptAny.total_amount 
        : (aptAny.servicePrice || aptAny.service?.base_price || aptAny.services?.base_price || 0);
      return sum + Number(amount || 0);
    }, 0);
    const totalRevenueFromPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalRevenue = Math.max(totalRevenueFromAppointments, totalRevenueFromPayments);
    const days = dateRange 
      ? Math.max(1, Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 30;
    const dailyRevenue = totalRevenue / days;
    
    return {
      dailyFixedCost,
      dailyRevenue,
      breakEvenPoint: dailyFixedCost,
    };
  }, [filteredExpenses, filteredPayments, filteredAppointments, dateRange]);

  const calculateProjections = useMemo(() => {
    // Proyección simple: tendencia lineal basada en últimos días
    // Basado en turnos completados
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed');
    const totalRevenueFromAppointments = completedAppointments.reduce((sum, apt) => {
      const aptAny = apt as any;
      const amount = (aptAny.total_amount && aptAny.total_amount > 0) 
        ? aptAny.total_amount 
        : (aptAny.servicePrice || aptAny.service?.base_price || aptAny.services?.base_price || 0);
      return sum + Number(amount || 0);
    }, 0);
    const totalRevenueFromPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalRevenue = Math.max(totalRevenueFromAppointments, totalRevenueFromPayments);
    const days = dateRange 
      ? Math.max(1, Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 30;
    const dailyAverage = totalRevenue / days;
    
    return {
      next30Days: dailyAverage * 30,
      next90Days: dailyAverage * 90,
    };
  }, [filteredPayments, filteredAppointments, dateRange]);

  const metrics: FinancialMetrics = useMemo(() => ({
    kpis: calculateKPIs,
    margins: calculateMargins,
    occupancy: calculateOccupancyRate,
    breakEven: calculateBreakEven,
    projection: calculateProjections,
  }), [calculateKPIs, calculateMargins, calculateOccupancyRate, calculateBreakEven, calculateProjections]);

  return metrics;
}

