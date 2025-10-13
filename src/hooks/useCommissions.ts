import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';

export type Commission = {
  id: string;
  stylist: string;
  amount: number;
  date: string;
};

export function useCommissions() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('commissions').select('*');
    if (error) {
      console.error('Error fetching commissions', error);
      setCommissions([]);
    } else {
      setCommissions((data as any[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const createCommission = async (payload: Partial<Commission>) => {
    const { data, error } = await supabase.from('commissions').insert([payload]);
    if (error) throw error;
    await fetchCommissions();
    return data;
  };

  const updateCommission = async (id: string, updates: Partial<Commission>) => {
    const { data, error } = await supabase.from('commissions').update(updates).eq('id', id);
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


