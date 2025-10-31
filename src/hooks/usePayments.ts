import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type Payment = {
  id: string;
  appointmentId?: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other';
  date: string;
  notes?: string;
  orgId?: string;
};

function mapRowToPayment(row: any): Payment {
  const processedAt = row.processed_at || row.date || row.created_at;
  const dateValue = processedAt ? new Date(processedAt) : new Date();
  const yyyy = dateValue.getFullYear();
  const mm = String(dateValue.getMonth() + 1).padStart(2, '0');
  const dd = String(dateValue.getDate()).padStart(2, '0');
  const date = `${yyyy}-${mm}-${dd}`;

  return {
    id: String(row.id),
    appointmentId: row.appointment_id ? String(row.appointment_id) : undefined,
    amount: Number(row.amount ?? 0),
    paymentMethod: row.payment_method || 'cash',
    date,
    notes: row.notes || undefined,
    orgId: row.org_id ? String(row.org_id) : undefined,
  };
}

function mapPaymentToRow(payload: Partial<Payment>) {
  const row: any = {};
  
  if (payload.appointmentId !== undefined) {
    row.appointment_id = payload.appointmentId || null;
  }
  if (payload.amount !== undefined) {
    row.amount = payload.amount;
  }
  if (payload.paymentMethod !== undefined) {
    row.payment_method = payload.paymentMethod;
  }
  if (payload.date !== undefined) {
    row.processed_at = new Date(payload.date).toISOString();
  }
  if (payload.notes !== undefined) {
    row.notes = payload.notes || null;
  }
  if (payload.orgId !== undefined) {
    row.org_id = payload.orgId;
  }
  
  return row;
}

export function usePayments(options?: { enabled?: boolean; appointmentId?: string }) {
  const { user, currentOrgId, isDemo } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;
  const subscribed = useRef(false);

  const fetchPayments = useCallback(async () => {
    if (!enabled || isDemo) {
      setPayments([]);
      return;
    }
    
    setLoading(true);
    try {
      let query = supabase
        .from('payments')
        .select('id, appointment_id, amount, payment_method, processed_at, notes, org_id');
      
      if (options?.appointmentId) {
        query = query.eq('appointment_id', options.appointmentId);
      }
      
      const { data, error } = await query.order('processed_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching payments:', error);
        setPayments([]);
      } else {
        const mapped = ((data as any[]) || []).map(mapRowToPayment);
        setPayments(mapped);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, isDemo, options?.appointmentId]);

  useEffect(() => {
    if (!enabled || isDemo) return;
    
    fetchPayments();
    
    if (subscribed.current) return;
    
    try {
      const channel = supabase
        .channel('realtime:payments')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'payments' },
          () => {
            fetchPayments();
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
  }, [fetchPayments, enabled, isDemo]);

  const createPayment = async (paymentData: Partial<Payment>) => {
    if (isDemo) {
      const newPayment: Payment = {
        ...paymentData as Payment,
        id: Date.now().toString(),
        date: paymentData.date || new Date().toISOString().split('T')[0],
      };
      setPayments(prev => [newPayment, ...prev]);
      return newPayment;
    }
    
    const row = {
      ...mapPaymentToRow(paymentData),
      org_id: currentOrgId || null,
      created_by: user?.id || null,
    };
    
    const { data, error } = await supabase
      .from('payments')
      .insert([row])
      .select()
      .single();
    
    if (error) throw error;
    await fetchPayments();
    return mapRowToPayment(data);
  };

  const updatePayment = async (id: string, updates: Partial<Payment>) => {
    if (isDemo) {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      return payments.find(p => p.id === id);
    }
    
    const row = mapPaymentToRow(updates);
    const { data, error } = await supabase
      .from('payments')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    await fetchPayments();
    return data ? mapRowToPayment(data) : null;
  };

  const deletePayment = async (id: string) => {
    if (isDemo) {
      setPayments(prev => prev.filter(p => p.id !== id));
      return;
    }
    
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await fetchPayments();
  };

  return {
    payments,
    loading,
    fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
  };
}
