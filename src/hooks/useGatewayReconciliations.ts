import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { GatewayReconciliation } from '../types';

function mapRowToReconciliation(row: any): GatewayReconciliation {
  const dateValue = row.transaction_date || row.created_at;
  const date = dateValue ? new Date(dateValue).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const settlementDate = row.settlement_date ? new Date(row.settlement_date).toISOString().split('T')[0] : undefined;

  return {
    id: String(row.id),
    org_id: String(row.org_id),
    gateway_name: row.gateway_name || '',
    transaction_date: date,
    sold_amount: Number(row.sold_amount ?? 0),
    settled_amount: Number(row.settled_amount ?? 0),
    credited_amount: Number(row.credited_amount ?? 0),
    commission_amount: Number(row.commission_amount ?? 0),
    difference: Number(row.difference ?? 0),
    settlement_date: settlementDate,
    notes: row.notes || undefined,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function mapReconciliationToRow(payload: Partial<GatewayReconciliation>) {
  const row: any = {};
  
  if (payload.gateway_name !== undefined) {
    row.gateway_name = payload.gateway_name;
  }
  if (payload.transaction_date !== undefined) {
    row.transaction_date = payload.transaction_date;
  }
  if (payload.sold_amount !== undefined) {
    row.sold_amount = payload.sold_amount;
  }
  if (payload.settled_amount !== undefined) {
    row.settled_amount = payload.settled_amount;
  }
  if (payload.credited_amount !== undefined) {
    row.credited_amount = payload.credited_amount;
  }
  if (payload.commission_amount !== undefined) {
    row.commission_amount = payload.commission_amount;
  }
  if (payload.difference !== undefined) {
    row.difference = payload.difference;
  }
  if (payload.settlement_date !== undefined) {
    row.settlement_date = payload.settlement_date || null;
  }
  if (payload.notes !== undefined) {
    row.notes = payload.notes || null;
  }
  
  return row;
}

export interface ReconciliationDateRange {
  startDate: string;
  endDate: string;
}

export function useGatewayReconciliations(options?: { enabled?: boolean; dateRange?: ReconciliationDateRange }) {
  const { user, currentOrgId, isDemo } = useAuth();
  const [reconciliations, setReconciliations] = useState<GatewayReconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;
  const subscribed = useRef(false);

  const fetchReconciliations = useCallback(async () => {
    if (!enabled || isDemo) {
      setReconciliations([]);
      return;
    }
    
    setLoading(true);
    try {
      let query = supabase
        .from('gateway_reconciliations')
        .select('id, org_id, gateway_name, transaction_date, sold_amount, settled_amount, credited_amount, commission_amount, difference, settlement_date, notes, created_at, updated_at');
      
      if (options?.dateRange) {
        if (options.dateRange.startDate) {
          query = query.gte('transaction_date', options.dateRange.startDate);
        }
        if (options.dateRange.endDate) {
          query = query.lte('transaction_date', options.dateRange.endDate);
        }
      }
      
      const { data, error } = await query.order('transaction_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching reconciliations:', error);
        setReconciliations([]);
      } else {
        const mapped = ((data as any[]) || []).map(mapRowToReconciliation);
        setReconciliations(mapped);
      }
    } catch (error) {
      console.error('Error fetching reconciliations:', error);
      setReconciliations([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, isDemo, options?.dateRange]);

  useEffect(() => {
    if (!enabled || isDemo) return;
    
    fetchReconciliations();
    
    if (subscribed.current) return;
    
    try {
      const channel = supabase
        .channel('realtime:gateway_reconciliations')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'gateway_reconciliations' },
          () => {
            fetchReconciliations();
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
  }, [fetchReconciliations, enabled, isDemo]);

  const createReconciliation = async (reconciliationData: Partial<GatewayReconciliation>) => {
    if (isDemo) {
      const newReconciliation: GatewayReconciliation = {
        ...reconciliationData as GatewayReconciliation,
        id: Date.now().toString(),
        org_id: reconciliationData.org_id || currentOrgId || '',
        gateway_name: reconciliationData.gateway_name || '',
        transaction_date: reconciliationData.transaction_date || new Date().toISOString().split('T')[0],
        sold_amount: reconciliationData.sold_amount || 0,
        settled_amount: reconciliationData.settled_amount || 0,
        credited_amount: reconciliationData.credited_amount || 0,
        commission_amount: reconciliationData.commission_amount || 0,
        difference: reconciliationData.difference || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setReconciliations(prev => [newReconciliation, ...prev]);
      return newReconciliation;
    }
    
    const row = {
      ...mapReconciliationToRow(reconciliationData),
      org_id: currentOrgId || null,
    };
    
    const { data, error } = await supabase
      .from('gateway_reconciliations')
      .insert([row])
      .select()
      .single();
    
    if (error) throw error;
    await fetchReconciliations();
    return mapRowToReconciliation(data);
  };

  const detectDifferences = useCallback(() => {
    return reconciliations.filter(rec => {
      const diff = Math.abs(rec.sold_amount - rec.settled_amount);
      return diff > 0.01; // Tolerancia de centavos
    });
  }, [reconciliations]);

  return {
    reconciliations,
    loading,
    fetchReconciliations,
    createReconciliation,
    detectDifferences,
  };
}

