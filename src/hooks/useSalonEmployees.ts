import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';

export type SalonEmployee = {
  id: string;
  salon_id: string;
  employee_id: string;
  active: boolean;
  assigned_at: string;
  assigned_by: string;
  employees?: {
    full_name: string;
    email: string;
  };
};

export function useSalonEmployees(salonId?: string, options?: { enabled?: boolean }) {
  const [assignments, setAssignments] = useState<SalonEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const enabled = options?.enabled ?? true;
  const subscribed = useRef(false);

  const fetchAssignments = useCallback(async () => {
    if (!enabled || !salonId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    try {
          const { data, error } = await supabase
            .from('salon_employees')
            .select(`
              id,
              salon_id,
              employee_id,
              is_active,
              assigned_at,
              assigned_by,
              employees!inner (
                full_name,
                email
              )
            `)
            .eq('salon_id', salonId)
            .eq('is_active', true);

      if (error) throw error;

      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        salon_id: item.salon_id,
        employee_id: item.employee_id,
        active: item.is_active,
        assigned_at: item.assigned_at,
        assigned_by: item.assigned_by,
        employees: Array.isArray(item.employees) ? item.employees[0] : item.employees,
      }));

      setAssignments(mappedData);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [salonId, enabled]);

  useEffect(() => {
    fetchAssignments();
    if (subscribed.current) return;
    const subscription = supabase
      .channel('app:salon_employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_employees' }, () => {
        fetchAssignments();
      })
      .subscribe();
    subscribed.current = true;
    return () => {
      try { subscription.unsubscribe(); } catch {}
      subscribed.current = false;
    };
  }, [fetchAssignments]);

  const assignEmployee = async (employeeId: string) => {
    if (!salonId) throw new Error('Salon ID is required');

    const { data, error } = await supabase
      .from('salon_employees')
      .insert([{
        salon_id: salonId,
        employee_id: employeeId,
        assigned_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    await fetchAssignments();
    return data;
  };

  const unassignEmployee = async (assignmentId: string) => {
    const { error } = await supabase
      .from('salon_employees')
      .update({ is_active: false })
      .eq('id', assignmentId);

    if (error) throw error;
    await fetchAssignments();
  };

  const toggleEmployeeAssignment = async (employeeId: string) => {
    // Verificar si ya está asignado
    const existing = assignments.find(a => a.employee_id === employeeId);

    if (existing) {
      await unassignEmployee(existing.id);
    } else {
      await assignEmployee(employeeId);
    }
  };

  return {
    assignments,
    isLoading: loading,
    error,
    fetchAssignments,
    assignEmployee,
    unassignEmployee,
    toggleEmployeeAssignment
  };
}
