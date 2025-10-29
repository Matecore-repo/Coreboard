import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';

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

  const fetchEmployees = useCallback(async () => {
    if (!enabled || !orgId) {
      setEmployees([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          org_id,
          user_id,
          full_name,
          email,
          phone,
          role,
          default_commission_pct,
          active,
          created_at,
          updated_at
        `)
        .eq('org_id', orgId)
        .eq('active', true)
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, enabled]);

  useEffect(() => {
    fetchEmployees();
    if (subscribed.current) return;
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
  }, [fetchEmployees]);

  const createEmployee = async (employeeData: CreateEmployeeData) => {
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
