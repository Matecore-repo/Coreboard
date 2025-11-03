import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Invoice } from '../types';

function mapRowToInvoice(row: any): Invoice {
  const dateValue = row.date || row.created_at;
  const date = dateValue ? new Date(dateValue).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return {
    id: String(row.id),
    org_id: String(row.org_id),
    type: row.type as 'invoice' | 'credit_note' | 'debit_note',
    number: row.number || '',
    date,
    client_id: row.client_id ? String(row.client_id) : undefined,
    net_amount: Number(row.net_amount ?? 0),
    tax_amount: Number(row.tax_amount ?? 0),
    total_amount: Number(row.total_amount ?? 0),
    payment_status: row.payment_status || undefined,
    payment_method: row.payment_method || undefined,
    tax_aliquots: row.tax_aliquots || undefined,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function mapInvoiceToRow(payload: Partial<Invoice>) {
  const row: any = {};
  
  if (payload.type !== undefined) {
    row.type = payload.type;
  }
  if (payload.number !== undefined) {
    row.number = payload.number;
  }
  if (payload.date !== undefined) {
    row.date = payload.date;
  }
  if (payload.client_id !== undefined) {
    row.client_id = payload.client_id || null;
  }
  if (payload.net_amount !== undefined) {
    row.net_amount = payload.net_amount;
  }
  if (payload.tax_amount !== undefined) {
    row.tax_amount = payload.tax_amount;
  }
  if (payload.total_amount !== undefined) {
    row.total_amount = payload.total_amount;
  }
  if (payload.payment_status !== undefined) {
    row.payment_status = payload.payment_status || null;
  }
  if (payload.payment_method !== undefined) {
    row.payment_method = payload.payment_method || null;
  }
  if (payload.tax_aliquots !== undefined) {
    row.tax_aliquots = payload.tax_aliquots || null;
  }
  
  return row;
}

export interface InvoiceFilters {
  type?: 'invoice' | 'credit_note' | 'debit_note';
  clientId?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
}

export function useInvoices(options?: { enabled?: boolean; filters?: InvoiceFilters }) {
  const { user, currentOrgId, isDemo } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;
  const subscribed = useRef(false);

  const fetchInvoices = useCallback(async () => {
    if (!enabled || isDemo) {
      setInvoices([]);
      return;
    }
    
    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select('id, org_id, type, number, date, client_id, net_amount, tax_amount, total_amount, payment_status, payment_method, tax_aliquots, created_at, updated_at');
      
      if (options?.filters) {
        const filters = options.filters;
        if (filters.type) {
          query = query.eq('type', filters.type);
        }
        if (filters.clientId) {
          query = query.eq('client_id', filters.clientId);
        }
        if (filters.paymentStatus) {
          query = query.eq('payment_status', filters.paymentStatus);
        }
        if (filters.startDate) {
          query = query.gte('date', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('date', filters.endDate);
        }
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching invoices:', error);
        setInvoices([]);
      } else {
        const mapped = ((data as any[]) || []).map(mapRowToInvoice);
        setInvoices(mapped);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, isDemo, options?.filters]);

  useEffect(() => {
    if (!enabled || isDemo) return;
    
    fetchInvoices();
    
    if (subscribed.current) return;
    
    try {
      const channel = supabase
        .channel('realtime:invoices')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'invoices' },
          () => {
            fetchInvoices();
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
  }, [fetchInvoices, enabled, isDemo]);

  const createInvoice = async (invoiceData: Partial<Invoice>) => {
    if (isDemo) {
      const newInvoice: Invoice = {
        ...invoiceData as Invoice,
        id: Date.now().toString(),
        org_id: invoiceData.org_id || currentOrgId || '',
        type: invoiceData.type || 'invoice',
        number: invoiceData.number || '',
        date: invoiceData.date || new Date().toISOString().split('T')[0],
        net_amount: invoiceData.net_amount || 0,
        tax_amount: invoiceData.tax_amount || 0,
        total_amount: invoiceData.total_amount || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setInvoices(prev => [newInvoice, ...prev]);
      return newInvoice;
    }
    
    const row = {
      ...mapInvoiceToRow(invoiceData),
      org_id: currentOrgId || null,
    };
    
    const { data, error } = await supabase
      .from('invoices')
      .insert([row])
      .select()
      .single();
    
    if (error) throw error;
    await fetchInvoices();
    return mapRowToInvoice(data);
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    if (isDemo) {
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
      return invoices.find(i => i.id === id);
    }
    
    const row = mapInvoiceToRow(updates);
    const { data, error } = await supabase
      .from('invoices')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    await fetchInvoices();
    return data ? mapRowToInvoice(data) : null;
  };

  const deleteInvoice = async (id: string) => {
    if (isDemo) {
      setInvoices(prev => prev.filter(i => i.id !== id));
      return;
    }
    
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await fetchInvoices();
  };

  return {
    invoices,
    loading,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  };
}

