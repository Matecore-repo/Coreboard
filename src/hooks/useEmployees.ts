import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { demoStore } from '../demo/store';
import { isValidUUID } from '../lib/uuid';

export type Employee = {
  id: string;
  org_id: string;
  user_id: string | null;
  full_name: string;
  email?: string;
  phone?: string;
  default_commission_pct: number;
  active: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
};

export type CreateEmployeeData = Omit<Employee, 'id' | 'created_at' | 'updated_at'>;

export function useEmployees(orgId?: string, options?: { enabled?: boolean }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const enabled = options?.enabled ?? true;
  const subscribed = useRef(false);
  const { isDemo } = useAuth();

  const fetchEmployees = useCallback(async () => {
    if (!enabled || !orgId) {
      setEmployees([]);
      return;
    }
    if (!isDemo && !isValidUUID(orgId)) {
      setEmployees([]);
      return;
    }
    setLoading(true);
    try {
      if (isDemo) {
        const demoEmployees = await demoStore.employees.list(orgId);
        setEmployees(demoEmployees as Employee[]);
        setError(null);
        return;
      }

      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          org_id,
          user_id,
          full_name,
          email,
          phone,
          default_commission_pct,
          active,
          created_at,
          updated_at
        `)
        .eq('org_id', orgId)
        .eq('active', true)
        .is('deleted_at', null)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, enabled, isDemo]);

  useEffect(() => {
    if (!enabled) return;
    fetchEmployees();
    
    // Deshabilitado en producción para mejor performance
    // Las subscriptions causan re-renders constantes
    /*
    if (isDemo || subscribed.current) return;
    const subscription = supabase
      .channel('app:employees')
      .on('postgres_changes', { event: '*', schema: 'app', table: 'employees' }, () => {
        fetchEmployees();
      })
      .subscribe();
    subscribed.current = true;
    return () => {
      try { subscription.unsubscribe(); } catch {}
      subscribed.current = false;
    };
    */
  }, [fetchEmployees, enabled, isDemo]);

  const createEmployee = async (employeeData: CreateEmployeeData) => {
    if (!orgId || (!isDemo && !isValidUUID(orgId))) {
      throw new Error('Organización inválida');
    }
    if (isDemo && orgId) {
      const { org_id: _ignored, ...rest } = employeeData as any;
      const created = await demoStore.employees.create(orgId, rest);
      await fetchEmployees();
      return created;
    }
    const { data, error } = await supabase
      .from('employees')
      .insert([employeeData])
      .select()
      .single();

    if (error) throw error;
    await fetchEmployees();
    return data;
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    if (!isDemo && (!orgId || !isValidUUID(orgId))) {
      throw new Error('Organización inválida');
    }
    if (isDemo) {
      const updated = await demoStore.employees.update(id, updates);
      await fetchEmployees();
      return updated;
    }
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchEmployees();
    return data;
  };

  const deleteEmployee = async (id: string) => {
    if (!isDemo && (!orgId || !isValidUUID(orgId))) {
      throw new Error('Organización inválida');
    }
    if (isDemo) {
      await demoStore.employees.remove(id);
      await fetchEmployees();
      return;
    }
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchEmployees();
  };

  return {
    employees,
    isLoading: loading,
    error,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee
  };
}
