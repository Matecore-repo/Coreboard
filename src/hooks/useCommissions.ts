import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type Commission = {
  id: string;
  org_id: string;
  employee_id: string;
  appointment_id?: string;
  amount: number;
  commission_rate: number;
  date: string;
  created_at: string;
};

function mapRowToCommission(row: any): Commission {
  const dateValue = row.date || row.calculated_at || row.created_at;
  const date = dateValue ? new Date(dateValue).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return {
    id: String(row.id),
    org_id: String(row.org_id),
    employee_id: String(row.employee_id),
    appointment_id: row.appointment_id ? String(row.appointment_id) : undefined,
    amount: Number(row.amount ?? 0),
    commission_rate: Number(row.commission_rate ?? row.pct ?? row.commission_pct ?? 0),
    date,
    created_at: row.created_at || new Date().toISOString(),
  };
}

function mapCommissionToRow(payload: Partial<Commission>) {
  const row: any = {};
  
  if (payload.employee_id !== undefined) {
    row.employee_id = payload.employee_id;
  }
  if (payload.appointment_id !== undefined) {
    row.appointment_id = payload.appointment_id || null;
  }
  if (payload.amount !== undefined) {
    row.amount = payload.amount;
  }
  if (payload.commission_rate !== undefined) {
    row.pct = payload.commission_rate;
  }
  if (payload.date !== undefined) {
    row.date = payload.date;
  }
  
  return row;
}

export function useCommissions(options?: { enabled?: boolean }) {
  const { currentOrgId } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;

  const fetchCommissions = useCallback(async () => {
    if (!enabled || !currentOrgId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('commissions')
        .select('id, org_id, employee_id, amount, pct, calculated_at')
        .eq('org_id', currentOrgId);
      
      const { data, error } = await query.order('id', { ascending: false });
      
      if (error) {
        console.error('Error fetching commissions:', error);
        setCommissions([]);
      } else {
        const mapped = ((data as any[]) || []).map(mapRowToCommission);
        setCommissions(mapped);
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, currentOrgId]);

  useEffect(() => {
    if (!enabled) return;
    fetchCommissions();
    
    // Escuchar evento de turno completado para refrescar comisiones
    const handleAppointmentCompleted = () => {
      // Esperar un poco para que el trigger de la BD genere la comisión
      setTimeout(() => {
        fetchCommissions();
      }, 1000);
    };
    
    window.addEventListener('appointment:completed', handleAppointmentCompleted);
    
    return () => {
      window.removeEventListener('appointment:completed', handleAppointmentCompleted);
    };
  }, [fetchCommissions, enabled]);

  const createCommission = async (payload: Partial<Commission>) => {
    const toInsert = {
      ...mapCommissionToRow(payload),
      org_id: currentOrgId || null,
    };
    const { data, error } = await supabase.from('commissions').insert([toInsert]).select();
    if (error) throw error;
    await fetchCommissions();
    return data ? data.map(mapRowToCommission) : [];
  };

  const updateCommission = async (id: string, updates: Partial<Commission>) => {
    const toUpdate = mapCommissionToRow(updates);
    const { data, error } = await supabase.from('commissions').update(toUpdate).eq('id', id).select();
    if (error) throw error;
    await fetchCommissions();
    return data ? data.map(mapRowToCommission) : [];
  };

  const deleteCommission = async (id: string) => {
    const { error } = await supabase.from('commissions').delete().eq('id', id);
    if (error) throw error;
    await fetchCommissions();
  };

  const getCommissionsByPeriod = useCallback((startDate: string, endDate: string) => {
    return commissions.filter(comm => {
      return comm.date >= startDate && comm.date <= endDate;
    });
  }, [commissions]);

  const getCommissionsByEmployee = useCallback((employeeId: string) => {
    return commissions.filter(comm => comm.employee_id === employeeId);
  }, [commissions]);

  const calculatePendingCommissions = useCallback(() => {
    // En producción, esto debería verificar el estado de pago
    // Por ahora, retornamos todas las comisiones
    return commissions.reduce((sum, comm) => sum + comm.amount, 0);
  }, [commissions]);

  return { 
    commissions, 
    loading, 
    fetchCommissions, 
    createCommission, 
    updateCommission, 
    deleteCommission,
    getCommissionsByPeriod,
    getCommissionsByEmployee,
    calculatePendingCommissions,
  };
}

