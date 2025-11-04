import { useMemo } from 'react';
import { useAppointments } from './useAppointments';
import { usePayments } from './usePayments';
import { useExpenses } from './useExpenses';
import { useGatewayReconciliations } from './useGatewayReconciliations';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface FinancialAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  suggestedAction?: string;
}

export function useFinancialAlerts(salonId?: string | null) {
  const { appointments } = useAppointments(salonId || undefined, { enabled: true });
  const { payments } = usePayments({ enabled: true });
  const { expenses } = useExpenses({ enabled: true });
  const { detectDifferences } = useGatewayReconciliations({ enabled: true });

  const alerts = useMemo((): FinancialAlert[] => {
    const result: FinancialAlert[] = [];

    // Alertas de no-show
    const totalAppointments = appointments.length;
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;
    const noShowRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0;
    
    if (noShowRate > 15) {
      result.push({
        id: 'no-show-high',
        type: 'no-show',
        severity: 'warning',
        title: 'Tasa de no-show alta',
        message: `La tasa de cancelaciones es del ${noShowRate.toFixed(1)}%`,
        suggestedAction: 'Considera implementar confirmación automática o anticipo',
      });
    }

    // Alertas de caída de ingresos
    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const lastWeekRevenue = payments
      .filter(p => p.date >= lastWeek.toISOString().split('T')[0])
      .reduce((sum, p) => sum + p.amount, 0);

    const previousThreeWeeksRevenue = payments
      .filter(p => {
        const date = new Date(p.date);
        const dateStr = date.toISOString().split('T')[0];
        const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0];
        const lastWeekStr = lastWeek.toISOString().split('T')[0];
        return dateStr >= fourWeeksAgoStr && dateStr < lastWeekStr;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const averagePreviousRevenue = previousThreeWeeksRevenue / 3;
    const revenueDrop = averagePreviousRevenue > 0 
      ? ((averagePreviousRevenue - lastWeekRevenue) / averagePreviousRevenue) * 100 
      : 0;

    if (revenueDrop > 20) {
      result.push({
        id: 'revenue-drop',
        type: 'revenue',
        severity: 'critical',
        title: 'Caída significativa de ingresos',
        message: `Los ingresos cayeron un ${revenueDrop.toFixed(1)}% vs el promedio de las últimas 3 semanas`,
        suggestedAction: 'Revisa la agenda, precios y promociones',
      });
    }

    // Alertas de margen bajo
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const margin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    if (margin < 10 && totalRevenue > 0) {
      result.push({
        id: 'low-margin',
        type: 'margin',
        severity: 'warning',
        title: 'Margen bajo',
        message: `El margen neto es del ${margin.toFixed(1)}%`,
        suggestedAction: 'Revisa costos y considera ajustar precios',
      });
    }

    // Alertas de diferencias en conciliación
    const differences = detectDifferences();
    if (differences.length > 0) {
      result.push({
        id: 'gateway-differences',
        type: 'gateway',
        severity: 'critical',
        title: 'Diferencias en conciliación de pasarelas',
        message: `Se encontraron ${differences.length} diferencia(s) entre lo vendido y lo liquidado`,
        suggestedAction: 'Revisa las conciliaciones de pasarelas de pago',
      });
    }

    return result;
  }, [appointments, payments, expenses, detectDifferences]);

  return { alerts };
}

