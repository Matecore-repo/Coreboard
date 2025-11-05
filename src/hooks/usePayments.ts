import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type Payment = {
  id: string;
  appointmentId?: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mercadopago' | 'other';
  date: string;
  notes?: string;
  orgId?: string;
  discountAmount?: number;
  taxAmount?: number;
  tipAmount?: number;
  gatewayFee?: number;
  paymentMethodDetail?: string;
  gatewayTransactionId?: string;
  gatewaySettlementDate?: string;
  gatewaySettlementAmount?: number;
};

function mapRowToPayment(row: any): Payment {
  const processedAt = row.processed_at || row.date || row.received_at || row.created_at;
  const dateValue = processedAt ? new Date(processedAt) : new Date();
  const yyyy = dateValue.getFullYear();
  const mm = String(dateValue.getMonth() + 1).padStart(2, '0');
  const dd = String(dateValue.getDate()).padStart(2, '0');
  const date = `${yyyy}-${mm}-${dd}`;

  // Mapear method (enum payment_method) a paymentMethod
  // La tabla payments usa 'method' (enum payment_method) que puede ser: 'cash', 'card', 'transfer', 'mp', 'mercadopago'
  const methodMap: Record<string, 'cash' | 'card' | 'transfer' | 'mercadopago' | 'other'> = {
    'cash': 'cash',
    'card': 'card',
    'transfer': 'transfer',
    'mercadopago': 'mercadopago',
    'mp': 'mercadopago', // Alias para mercadopago (enum antiguo)
  };
  const paymentMethod = methodMap[row.method || row.payment_method] || 'cash';

  return {
    id: String(row.id),
    appointmentId: row.appointment_id ? String(row.appointment_id) : undefined,
    amount: Number(row.amount ?? 0),
    paymentMethod,
    date,
    notes: row.notes || undefined,
    orgId: row.org_id ? String(row.org_id) : undefined,
    discountAmount: undefined,
    taxAmount: undefined,
    tipAmount: undefined,
    gatewayFee: undefined,
    paymentMethodDetail: undefined,
    gatewayTransactionId: undefined,
    gatewaySettlementDate: undefined,
    gatewaySettlementAmount: undefined,
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
    // Mapear paymentMethod a payment_method (text)
    const methodMap: Record<string, string> = {
      'cash': 'cash',
      'card': 'card',
      'transfer': 'transfer',
      'mercadopago': 'mercadopago',
      'other': 'other',
    };
    row.payment_method = methodMap[payload.paymentMethod] || 'cash';
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
  if (payload.discountAmount !== undefined) {
    row.discount_amount = payload.discountAmount || null;
  }
  if (payload.taxAmount !== undefined) {
    row.tax_amount = payload.taxAmount || null;
  }
  if (payload.tipAmount !== undefined) {
    row.tip_amount = payload.tipAmount || null;
  }
  if (payload.gatewayFee !== undefined) {
    row.gateway_fee = payload.gatewayFee || null;
  }
  if (payload.paymentMethodDetail !== undefined) {
    row.payment_method_detail = payload.paymentMethodDetail || null;
  }
  if (payload.gatewayTransactionId !== undefined) {
    row.gateway_transaction_id = payload.gatewayTransactionId || null;
  }
  if (payload.gatewaySettlementDate !== undefined) {
    row.gateway_settlement_date = payload.gatewaySettlementDate || null;
  }
  if (payload.gatewaySettlementAmount !== undefined) {
    row.gateway_settlement_amount = payload.gatewaySettlementAmount || null;
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
        .select('id, appointment_id, amount, payment_method, processed_at, notes, org_id, created_at');
      
      if (options?.appointmentId) {
        query = query.eq('appointment_id', options.appointmentId);
      }
      
      const { data, error } = await query.order('processed_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching payments:', error);
        // Manejar errores específicos de manera más amigable
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Schema mismatch detected. Please verify database schema.');
        }
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

  const getPaymentsByMethod = useCallback((method: Payment['paymentMethod']) => {
    return payments.filter(p => p.paymentMethod === method);
  }, [payments]);

  const getPaymentsBySettlementDate = useCallback((settlementDate: string) => {
    return payments.filter(p => p.gatewaySettlementDate === settlementDate);
  }, [payments]);

  const calculateGatewayCommissions = useCallback(() => {
    return payments.reduce((sum, payment) => {
      return sum + (payment.gatewayFee || 0);
    }, 0);
  }, [payments]);

  return {
    payments,
    loading,
    fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
    getPaymentsByMethod,
    getPaymentsBySettlementDate,
    calculateGatewayCommissions,
  };
}
