import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Expense } from '../types';

function mapRowToExpense(row: any): Expense {
  const dateValue = row.incurred_at || row.date || row.created_at;
  const date = dateValue ? new Date(dateValue).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return {
    id: String(row.id),
    org_id: String(row.org_id),
    salon_id: row.salon_id ? String(row.salon_id) : undefined,
    amount: Number(row.amount ?? 0),
    description: row.description || '',
    category: row.category || undefined,
    type: row.type || undefined,
    supplier_id: row.supplier_id ? String(row.supplier_id) : undefined,
    invoice_number: row.invoice_number || undefined,
    invoice_date: row.invoice_date || undefined,
    payment_status: row.payment_status || 'pending',
    due_date: row.due_date || undefined,
    incurred_at: date,
    created_by: String(row.created_by),
    created_at: row.created_at || new Date().toISOString(),
  };
}

function mapExpenseToRow(payload: Partial<Expense>) {
  const row: any = {};
  
  if (payload.salon_id !== undefined) {
    row.salon_id = payload.salon_id || null;
  }
  if (payload.amount !== undefined) {
    row.amount = payload.amount;
  }
  if (payload.description !== undefined) {
    row.description = payload.description;
  }
  if (payload.category !== undefined) {
    row.category = payload.category || null;
  }
  if (payload.type !== undefined) {
    row.type = payload.type || null;
  }
  if (payload.supplier_id !== undefined) {
    row.supplier_id = payload.supplier_id || null;
  }
  if (payload.invoice_number !== undefined) {
    row.invoice_number = payload.invoice_number || null;
  }
  if (payload.invoice_date !== undefined) {
    row.invoice_date = payload.invoice_date || null;
  }
  if (payload.payment_status !== undefined) {
    row.payment_status = payload.payment_status || 'pending';
  }
  if (payload.due_date !== undefined) {
    row.due_date = payload.due_date || null;
  }
  if (payload.incurred_at !== undefined) {
    row.incurred_at = new Date(payload.incurred_at).toISOString().split('T')[0];
  }
  
  return row;
}

export interface ExpenseFilters {
  salonId?: string;
  category?: string;
  type?: 'fixed' | 'variable' | 'supply_purchase';
  paymentStatus?: 'pending' | 'paid' | 'partial';
  startDate?: string;
  endDate?: string;
}

export function useExpenses(options?: { enabled?: boolean; filters?: ExpenseFilters }) {
  const { user, currentOrgId, isDemo } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;
  const subscribed = useRef(false);

  const fetchExpenses = useCallback(async () => {
    if (!enabled || isDemo) {
      setExpenses([]);
      return;
    }
    
    setLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select('id, org_id, salon_id, amount, description, category, incurred_at, created_by, created_at');
      
      if (options?.filters) {
        const filters = options.filters;
        if (filters.salonId) {
          query = query.eq('salon_id', filters.salonId);
        }
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        // Nota: filtro por type removido porque la columna no existe en la BD
        if (filters.paymentStatus) {
          query = query.eq('payment_status', filters.paymentStatus);
        }
        if (filters.startDate) {
          query = query.gte('incurred_at', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('incurred_at', filters.endDate);
        }
      }
      
      const { data, error } = await query.order('incurred_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching expenses:', error);
        setExpenses([]);
      } else {
        const mapped = ((data as any[]) || []).map(mapRowToExpense);
        setExpenses(mapped);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, isDemo, options?.filters]);

  useEffect(() => {
    if (!enabled || isDemo) return;
    
    fetchExpenses();
    
    if (subscribed.current) return;
    
    try {
      const channel = supabase
        .channel('realtime:expenses')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'expenses' },
          () => {
            fetchExpenses();
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
  }, [fetchExpenses, enabled, isDemo]);

  const createExpense = async (expenseData: Partial<Expense>) => {
    if (isDemo) {
      const newExpense: Expense = {
        ...expenseData as Expense,
        id: Date.now().toString(),
        org_id: expenseData.org_id || currentOrgId || '',
        incurred_at: expenseData.incurred_at || new Date().toISOString().split('T')[0],
        created_by: expenseData.created_by || user?.id || '',
        created_at: new Date().toISOString(),
      };
      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    }
    
    const row = {
      ...mapExpenseToRow(expenseData),
      org_id: currentOrgId || null,
      created_by: user?.id || null,
    };
    
    const { data, error } = await supabase
      .from('expenses')
      .insert([row])
      .select()
      .single();
    
    if (error) throw error;
    await fetchExpenses();
    return mapRowToExpense(data);
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    if (isDemo) {
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      return expenses.find(e => e.id === id);
    }
    
    const row = mapExpenseToRow(updates);
    const { data, error } = await supabase
      .from('expenses')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    await fetchExpenses();
    return data ? mapRowToExpense(data) : null;
  };

  const deleteExpense = async (id: string) => {
    if (isDemo) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      return;
    }
    
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await fetchExpenses();
  };

  return {
    expenses,
    loading,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}

