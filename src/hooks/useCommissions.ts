import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';

export type Commission = {
  id: string;
  stylist: string;
  amount: number;
  date: string;
  salonId?: string;
  sourceAppointmentId?: string;
};

function mapRowToCommission(row: any): Commission {
  return {
    id: String(row.id),
    stylist: row.stylist_id ?? row.stylist ?? '',
    amount: Number(row.amount ?? 0),
    date: typeof row.date === 'string' ? row.date : String(row.date ?? ''),
    salonId: row.salon_id ?? undefined,
    sourceAppointmentId: row.source_appointment_id ?? undefined,
  };
}

function mapCommissionToRow(payload: Partial<Commission>) {
  return {
    stylist_id: payload.stylist,
    amount: payload.amount,
    date: payload.date,
    salon_id: payload.salonId,
    source_appointment_id: payload.sourceAppointmentId,
  };
}

export function useCommissions(options?: { enabled?: boolean }) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;

  const fetchCommissions = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select('id, stylist_id, amount, date, salon_id, source_appointment_id');
      if (error) {
        console.error('Error fetching commissions', error);
        setCommissions([]);
      } else {
        const mapped = ((data as any[]) || []).map(mapRowToCommission);
        setCommissions(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchCommissions();
  }, [fetchCommissions, enabled]);

  const createCommission = async (payload: Partial<Commission>) => {
    const toInsert = mapCommissionToRow(payload);
    const { data, error } = await supabase.from('commissions').insert([toInsert]).select();
    if (error) throw error;
    await fetchCommissions();
    return data;
  };

  const updateCommission = async (id: string, updates: Partial<Commission>) => {
    const toUpdate = mapCommissionToRow(updates);
    const { data, error } = await supabase.from('commissions').update(toUpdate).eq('id', id).select();
    if (error) throw error;
    await fetchCommissions();
    return data;
  };

  const deleteCommission = async (id: string) => {
    const { error } = await supabase.from('commissions').delete().eq('id', id);
    if (error) throw error;
    await fetchCommissions();
  };

  return { commissions, loading, fetchCommissions, createCommission, updateCommission, deleteCommission };
}

