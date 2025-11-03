import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { DailyCashRegister, CashMovement } from '../types';

function mapRowToCashRegister(row: any): DailyCashRegister {
  const dateValue = row.date || row.created_at;
  const date = dateValue ? new Date(dateValue).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return {
    id: String(row.id),
    org_id: String(row.org_id),
    salon_id: row.salon_id ? String(row.salon_id) : undefined,
    date,
    opening_amount: Number(row.opening_amount ?? 0),
    closing_amount: Number(row.closing_amount ?? 0),
    actual_amount: Number(row.actual_amount ?? 0),
    difference: Number(row.difference ?? 0),
    opened_by: row.opened_by ? String(row.opened_by) : undefined,
    closed_by: row.closed_by ? String(row.closed_by) : undefined,
    opened_at: row.opened_at || undefined,
    closed_at: row.closed_at || undefined,
    notes: row.notes || undefined,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function mapRowToCashMovement(row: any): CashMovement {
  return {
    id: String(row.id),
    register_id: String(row.register_id),
    type: row.type as 'income' | 'expense' | 'transfer',
    amount: Number(row.amount ?? 0),
    description: row.description || undefined,
    payment_id: row.payment_id ? String(row.payment_id) : undefined,
    expense_id: row.expense_id ? String(row.expense_id) : undefined,
    created_at: row.created_at || new Date().toISOString(),
  };
}

function mapCashRegisterToRow(payload: Partial<DailyCashRegister>) {
  const row: any = {};
  
  if (payload.salon_id !== undefined) {
    row.salon_id = payload.salon_id || null;
  }
  if (payload.date !== undefined) {
    row.date = payload.date;
  }
  if (payload.opening_amount !== undefined) {
    row.opening_amount = payload.opening_amount;
  }
  if (payload.closing_amount !== undefined) {
    row.closing_amount = payload.closing_amount;
  }
  if (payload.actual_amount !== undefined) {
    row.actual_amount = payload.actual_amount;
  }
  if (payload.difference !== undefined) {
    row.difference = payload.difference;
  }
  if (payload.opened_by !== undefined) {
    row.opened_by = payload.opened_by || null;
  }
  if (payload.closed_by !== undefined) {
    row.closed_by = payload.closed_by || null;
  }
  if (payload.opened_at !== undefined) {
    row.opened_at = payload.opened_at ? new Date(payload.opened_at).toISOString() : null;
  }
  if (payload.closed_at !== undefined) {
    row.closed_at = payload.closed_at ? new Date(payload.closed_at).toISOString() : null;
  }
  if (payload.notes !== undefined) {
    row.notes = payload.notes || null;
  }
  
  return row;
}

function mapCashMovementToRow(payload: Partial<CashMovement>) {
  const row: any = {};
  
  if (payload.register_id !== undefined) {
    row.register_id = payload.register_id;
  }
  if (payload.type !== undefined) {
    row.type = payload.type;
  }
  if (payload.amount !== undefined) {
    row.amount = payload.amount;
  }
  if (payload.description !== undefined) {
    row.description = payload.description || null;
  }
  if (payload.payment_id !== undefined) {
    row.payment_id = payload.payment_id || null;
  }
  if (payload.expense_id !== undefined) {
    row.expense_id = payload.expense_id || null;
  }
  
  return row;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export function useCashRegisters(options?: { enabled?: boolean; dateRange?: DateRange; salonId?: string }) {
  const { user, currentOrgId, isDemo } = useAuth();
  const [registers, setRegisters] = useState<DailyCashRegister[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;
  const subscribed = useRef(false);

  const fetchCashRegisters = useCallback(async () => {
    if (!enabled || isDemo) {
      setRegisters([]);
      return;
    }
    
    setLoading(true);
    try {
      let query = supabase
        .from('daily_cash_registers')
        .select('id, org_id, salon_id, date, opening_amount, closing_amount, actual_amount, difference, opened_by, closed_by, opened_at, closed_at, notes, created_at, updated_at');
      
      if (options?.salonId) {
        query = query.eq('salon_id', options.salonId);
      }
      if (options?.dateRange) {
        if (options.dateRange.startDate) {
          query = query.gte('date', options.dateRange.startDate);
        }
        if (options.dateRange.endDate) {
          query = query.lte('date', options.dateRange.endDate);
        }
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching cash registers:', error);
        setRegisters([]);
      } else {
        const mapped = ((data as any[]) || []).map(mapRowToCashRegister);
        setRegisters(mapped);
      }
    } catch (error) {
      console.error('Error fetching cash registers:', error);
      setRegisters([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, isDemo, options?.salonId, options?.dateRange]);

  useEffect(() => {
    if (!enabled || isDemo) return;
    
    fetchCashRegisters();
    
    if (subscribed.current) return;
    
    try {
      const channel = supabase
        .channel('realtime:cash_registers')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'daily_cash_registers' },
          () => {
            fetchCashRegisters();
          }
        )
        .subscribe();
      
      subscribed.current = true;
      
      return () => {
        try {
          channel.unsubscribe();
          subscribed.current = false;
        } catch {}
      };
    } catch {
      // Si falla realtime, no rompemos el flujo
    }
  }, [fetchCashRegisters, enabled, isDemo]);

  const openCashRegister = async (data: Partial<DailyCashRegister>) => {
    if (isDemo) {
      const newRegister: DailyCashRegister = {
        ...data as DailyCashRegister,
        id: Date.now().toString(),
        org_id: data.org_id || currentOrgId || '',
        date: data.date || new Date().toISOString().split('T')[0],
        opening_amount: data.opening_amount || 0,
        closing_amount: 0,
        actual_amount: 0,
        difference: 0,
        opened_by: data.opened_by || user?.id,
        opened_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setRegisters(prev => [newRegister, ...prev]);
      return newRegister;
    }
    
    const row = {
      ...mapCashRegisterToRow(data),
      org_id: currentOrgId || null,
      opened_by: user?.id || null,
      opened_at: new Date().toISOString(),
    };
    
    const { data: result, error } = await supabase
      .from('daily_cash_registers')
      .insert([row])
      .select()
      .single();
    
    if (error) throw error;
    await fetchCashRegisters();
    return mapRowToCashRegister(result);
  };

  const closeCashRegister = async (id: string, data: Partial<DailyCashRegister>) => {
    if (isDemo) {
      setRegisters(prev => prev.map(r => 
        r.id === id 
          ? { 
              ...r, 
              ...data, 
              closed_by: user?.id,
              closed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } 
          : r
      ));
      return registers.find(r => r.id === id);
    }
    
    const row = {
      ...mapCashRegisterToRow(data),
      closed_by: user?.id || null,
      closed_at: new Date().toISOString(),
    };
    
    const { data: result, error } = await supabase
      .from('daily_cash_registers')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    await fetchCashRegisters();
    return result ? mapRowToCashRegister(result) : null;
  };

  const getCashRegisterByDate = async (date: string, salonId?: string) => {
    if (isDemo) {
      return registers.find(r => r.date === date && (!salonId || r.salon_id === salonId));
    }
    
    let query = supabase
      .from('daily_cash_registers')
      .select('id, org_id, salon_id, date, opening_amount, closing_amount, actual_amount, difference, opened_by, closed_by, opened_at, closed_at, notes, created_at, updated_at')
      .eq('date', date)
      .eq('org_id', currentOrgId || '');
    
    if (salonId) {
      query = query.eq('salon_id', salonId);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      throw error;
    }
    
    return data ? mapRowToCashRegister(data) : null;
  };

  const addCashMovement = async (movementData: Partial<CashMovement>) => {
    if (isDemo) {
      // Para demo, no implementamos movimientos
      return;
    }
    
    const row = mapCashMovementToRow(movementData);
    
    const { data, error } = await supabase
      .from('cash_movements')
      .insert([row])
      .select()
      .single();
    
    if (error) throw error;
    return data ? mapRowToCashMovement(data) : null;
  };

  return {
    registers,
    loading,
    fetchCashRegisters,
    openCashRegister,
    closeCashRegister,
    getCashRegisterByDate,
    addCashMovement,
  };
}

