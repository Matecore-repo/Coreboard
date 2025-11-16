// Solución E: Implementación alternativa con validación en frontend
// Este archivo muestra cómo validar permisos antes de insertar

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
    if (!enabled || !salonId || salonId === 'all' || salonId === 'Todas') {
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
              active,
              assigned_at,
              assigned_by,
              employees!inner (
                full_name,
                email
              )
            `)
            .eq('salon_id', salonId)
            .eq('active', true);

      if (error) throw error;

      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        salon_id: item.salon_id,
        employee_id: item.employee_id,
        active: item.active,
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
    if (!enabled) return;
    fetchAssignments();
  }, [fetchAssignments, enabled]);

  // Solución E: Validar permisos en frontend antes de insertar
  const assignEmployee = async (employeeId: string) => {
    if (!salonId || salonId === 'all' || salonId === 'Todas') {
      throw new Error('Salon ID is required and cannot be "all"');
    }

    const user = (await supabase.auth.getUser()).data.user;
    
    // Validar que el salón pertenece a la org del usuario
    const { data: salon, error: salonError } = await supabase
      .from('salons')
      .select('org_id')
      .eq('id', salonId)
      .single();

    if (salonError || !salon) {
      throw new Error('No se pudo verificar el salón o no tienes acceso');
    }

    // Validar que el empleado pertenece a la misma org
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('org_id')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      throw new Error('No se pudo verificar el empleado o no tienes acceso');
    }

    // Verificar que ambos pertenecen a la misma organización
    if (salon.org_id !== employee.org_id) {
      throw new Error('El salón y el empleado deben pertenecer a la misma organización');
    }

    // Verificar que el usuario tiene membresía en esa organización
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user?.id)
      .eq('org_id', salon.org_id)
      .maybeSingle();

    if (membershipError || !membership) {
      throw new Error('No tienes permisos para asignar empleados en esta organización');
    }

    // Verificar si ya existe una asignación
    const { data: existing } = await supabase
      .from('salon_employees')
      .select('id, active')
      .eq('salon_id', salonId)
      .eq('employee_id', employeeId)
      .maybeSingle();

    let data, error;

    if (existing) {
      // Si existe, actualizar active a true
      const result = await supabase
        .from('salon_employees')
        .update({
          active: true,
          assigned_by: user?.id,
        })
        .eq('id', existing.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Si no existe, insertar nueva fila
      const result = await supabase
        .from('salon_employees')
        .insert({
          salon_id: salonId,
          employee_id: employeeId,
          assigned_by: user?.id,
          active: true,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    await fetchAssignments();
    return data;
  };

  const unassignEmployee = async (assignmentId: string) => {
    const { error } = await supabase
      .from('salon_employees')
      .update({ active: false })
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

