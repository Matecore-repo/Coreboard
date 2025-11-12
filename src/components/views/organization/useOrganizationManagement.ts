import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useEmployees, Employee as EmployeeRecord } from '../../../hooks/useEmployees';
import { useSalons } from '../../../hooks/useSalons';
import { toastError, toastSuccess, toastInfo } from '../../../lib/toast';
import { supabase } from '../../../lib/supabase';
import { Membership, Organization } from './types';

export interface SearchedUser {
  id: string;
  email: string;
  full_name?: string;
}

export interface SyncedEmployee {
  id: string;
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  commission_type?: 'percentage' | 'fixed' | null;
  default_commission_pct?: number | null;
  default_commission_amount?: number | null;
  active?: boolean | null;
  hasEmployeeRecord: boolean;
  role: Membership['role'];
}

export interface SelectedEmployee {
  employee: SyncedEmployee | null;
  membership: Membership | null;
}

export interface EmployeeFormData {
  full_name: string;
  email: string;
  phone: string;
  commission_type: 'percentage' | 'fixed';
  default_commission_pct: number;
  default_commission_amount: number;
}

interface UseOrganizationManagementOptions {
  isDemo?: boolean;
}

const EMPLOYEE_FORM_DEFAULT: EmployeeFormData = {
  full_name: '',
  email: '',
  phone: '',
  commission_type: 'percentage',
  default_commission_pct: 50,
  default_commission_amount: 0,
};

export function useOrganizationManagement(
  { isDemo = false }: UseOrganizationManagementOptions = {},
) {
  const { user: currentUser, currentRole, currentOrgId, leaveOrganization } = useAuth() as any;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [editingOrg, setEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgTaxId, setOrgTaxId] = useState('');

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [inviteRole, setInviteRole] = useState<'employee' | 'admin' | 'viewer'>('employee');
  const [inviting, setInviting] = useState(false);

  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Membership | null>(null);
  const [removing, setRemoving] = useState(false);

  const [leaveOrgDialogOpen, setLeaveOrgDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    employees,
    isLoading: loadingEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee: deleteEmployeeRecord,
  } = useEmployees(currentOrgId ?? undefined);
  const { salons } = useSalons(currentOrgId ?? undefined, { enabled: true });

  const [selectedEmployee, setSelectedEmployee] = useState<SelectedEmployee | null>(null);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<SyncedEmployee | null>(null);
  const [selectedSalons, setSelectedSalons] = useState<Set<string>>(new Set());
  const [employeeFormData, setEmployeeFormData] = useState<EmployeeFormData>(EMPLOYEE_FORM_DEFAULT);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<SyncedEmployee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState(false);

  const loadingRef = useRef(false);
  const loadedOrgIdRef = useRef<string | null>(null);
  const previousOrgIdRef = useRef<string | null>(null);

  const isAdmin = currentRole === 'admin';
  const isOwner = currentRole === 'owner';
  const canEdit = isAdmin || isOwner;
  const canManageMembers = isAdmin || isOwner;
  const canDelete = isOwner;
  const canManageTeam = canEdit;
  const canEditCommissions = canEdit;

  const employeesByUserId = useMemo(() => {
    const map = new Map<string, EmployeeRecord>();
    (employees || []).forEach((employee) => {
      if (employee?.user_id) {
        map.set(employee.user_id, employee);
      }
    });
    return map;
  }, [employees]);

  const syncedEmployees = useMemo<SyncedEmployee[]>(() => {
    if (!memberships || memberships.length === 0) return [];

    return memberships
      .filter((member) => Boolean(member.user_id) && member.role !== 'viewer')
      .map((member) => {
        if (!member.user_id) return null;

        const record = employeesByUserId.get(member.user_id);
        const fallbackName =
          member.user?.full_name || member.user?.email || `Usuario ${member.user_id.substring(0, 8)}`;

        return {
          id: record?.id ?? member.user_id,
          user_id: member.user_id,
          full_name: record?.full_name ?? fallbackName,
          email: record?.email ?? member.user?.email ?? null,
          phone: record?.phone ?? null,
          commission_type: (record?.commission_type as 'percentage' | 'fixed' | null) ?? null,
          default_commission_pct: record?.default_commission_pct ?? null,
          default_commission_amount: record?.default_commission_amount ?? null,
          active: record?.active ?? true,
          hasEmployeeRecord: Boolean(record),
          role: member.role,
        } as SyncedEmployee;
      })
      .filter((member): member is SyncedEmployee => Boolean(member));
  }, [employeesByUserId, memberships]);

  const memberDirectory = useMemo(() => {
    const directory: Record<string, { label: string }> = {};
    memberships.forEach((membership) => {
      if (!membership.user_id) return;
      const label =
        membership.user?.full_name ||
        membership.user?.email ||
        `Usuario ${membership.user_id.substring(0, 8)}`;
      directory[membership.user_id] = { label };
    });
    return directory;
  }, [memberships]);

  const membersPreview = useMemo(() => {
    if (memberships.length === 0) return [] as typeof memberships;
    return memberships.slice(0, 5);
  }, [memberships]);

  const ownerMembership = useMemo(
    () => memberships.find((member) => member.role === 'owner'),
    [memberships],
  );

  const totalMembers = memberships.length;
  const adminMembers = memberships.filter((member) => member.role === 'admin').length;
  const activeEmployeesCount = employees.filter((employee) => employee?.active !== false).length;
  const connectedSalons = salons.length;

  const heroStats = useMemo(
    () => [
      { label: 'Miembros activos', value: totalMembers },
      { label: 'Administradores', value: adminMembers },
      { label: 'Empleados activos', value: activeEmployeesCount },
      { label: 'Locales conectados', value: connectedSalons },
    ],
    [totalMembers, adminMembers, activeEmployeesCount, connectedSalons],
  );

  const memberIds = useMemo(() => new Set(memberships.map((m) => m.user_id)), [memberships]);

  const loadMemberships = useCallback(
    async (orgId: string) => {
      setLoadingMembers(true);
      try {
        const { data: members, error } = await supabase
          .from('memberships')
          .select('id, user_id, role, is_primary')
          .eq('org_id', orgId)
          .limit(100);

        if (error) {
          throw error;
        }

        if (members && members.length > 0) {
          const userIds = members.map((m) => m.user_id);

          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);

          const profileMap = new Map(
            (profiles || []).map((p) => [p.id, { email: p.email, full_name: p.full_name }]),
          );

          const { data: employeesData } = await supabase
            .from('employees')
            .select('user_id, full_name, email')
            .in('user_id', userIds)
            .not('user_id', 'is', null);

          const employeeMap = new Map(
            (employeesData || []).map((e) => [e.user_id, { full_name: e.full_name, email: e.email }]),
          );

          setMemberships(
            members.map((m: any) => {
              const profile = profileMap.get(m.user_id);
              const employee = employeeMap.get(m.user_id);

              const email =
                profile?.email || employee?.email || `Usuario ${m.user_id.substring(0, 8)}`;
              const full_name = profile?.full_name || employee?.full_name || undefined;

              return {
                ...m,
                user: {
                  email,
                  full_name,
                },
              };
            }),
          );
        } else {
          setMemberships([]);
        }
      } catch (error) {
        console.error('Error loading memberships:', error);
        toastError('Error al cargar los miembros de la organización.');
      } finally {
        setLoadingMembers(false);
      }
    },
    [],
  );

  const loadOrganizationData = useCallback(async () => {
    if (!currentOrgId) {
      setLoading(false);
      setOrganization(null);
      return;
    }

    if (loadingRef.current || loadedOrgIdRef.current === currentOrgId) {
      return;
    }

    loadingRef.current = true;
    loadedOrgIdRef.current = currentOrgId;
    setLoading(true);

    try {
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 12000);

      const { data, error } = await supabase
        .from('orgs')
        .select('id, name, tax_id, created_at')
        .eq('id', currentOrgId)
        .single();

      clearTimeout(abortTimer);

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Organización no encontrada');
      }

      setOrganization(data);
      setOrgName(data.name || '');
      setOrgTaxId(data.tax_id || '');

      await loadMemberships(currentOrgId);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        toastError('La carga de la organización tardó demasiado. Intenta nuevamente.');
      } else {
        const errorMsg = error?.message || 'Error al cargar la organización. Verifica tu conexión.';
        toastError(errorMsg);
      }
      console.error('Error loading organization:', error);
      setOrganization(null);
      loadedOrgIdRef.current = null;
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [currentOrgId, loadMemberships]);

  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const searchTerm = query.trim().toLowerCase();
        const isEmail = searchTerm.includes('@');

        let profiles: any[] = [];
        if (isEmail) {
          const { data: exactProfiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('email', searchTerm)
            .limit(10);

          if (exactProfiles && exactProfiles.length > 0) {
            profiles = exactProfiles;
          } else {
            const { data: partialProfiles } = await supabase
              .from('profiles')
              .select('id, email, full_name')
              .ilike('email', `%${searchTerm}%`)
              .limit(10);
            profiles = partialProfiles || [];
          }
        } else {
          const { data: partialProfiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .ilike('email', `%${searchTerm}%`)
            .limit(10);
          profiles = partialProfiles || [];
        }

        let employeesByEmail: any[] = [];
        if (isEmail) {
          const { data: empByEmail } = await supabase
            .from('employees')
            .select('user_id, full_name, email')
            .ilike('email', `%${searchTerm}%`)
            .not('user_id', 'is', null)
            .limit(10);
          employeesByEmail = empByEmail || [];
        }

        const { data: employeesByName } = await supabase
          .from('employees')
          .select('user_id, full_name, email')
          .ilike('full_name', `%${searchTerm}%`)
          .not('user_id', 'is', null)
          .limit(10);

        const userMap = new Map<string, SearchedUser>();

        (profiles || []).forEach((p: any) => {
          if (!userMap.has(p.id)) {
            userMap.set(p.id, {
              id: p.id,
              email: p.email || '',
              full_name: p.full_name || undefined,
            });
          }
        });

        (employeesByEmail || []).forEach((e: any) => {
          if (e.user_id) {
            const existing = userMap.get(e.user_id);
            if (existing) {
              existing.full_name = e.full_name || existing.full_name;
              existing.email = e.email || existing.email;
            } else {
              userMap.set(e.user_id, {
                id: e.user_id,
                email: e.email || '',
                full_name: e.full_name || undefined,
              });
            }
          }
        });

        (employeesByName || []).forEach((e: any) => {
          if (e.user_id && e.full_name) {
            const existing = userMap.get(e.user_id);
            if (existing) {
              existing.full_name = e.full_name || existing.full_name;
              existing.email = e.email || existing.email;
            } else {
              userMap.set(e.user_id, {
                id: e.user_id,
                email: e.email || '',
                full_name: e.full_name,
              });
            }
          }
        });

        const filteredResults = Array.from(userMap.values()).filter((u) => !memberIds.has(u.id));

        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Error searching users:', error);
        toastError('Error al buscar usuarios. Intenta de nuevo.');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [memberIds],
  );

  const inviteMember = useCallback(async () => {
    if (!currentOrgId || !selectedUser || !canManageMembers) return;

    try {
      setInviting(true);

      if (isDemo) {
        toastSuccess('Miembro invitado (modo demo)');
        setInviteDialogOpen(false);
        setSelectedUser(null);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }

      const { error } = await supabase.rpc('create_invitation', {
        p_organization_id: currentOrgId,
        p_email: selectedUser.email,
        p_role: inviteRole,
        p_token: null,
        p_expires_days: 7,
      });

      if (error) {
        throw error;
      }

      toastSuccess(`Invitación enviada a ${selectedUser.email}`);
      setInviteDialogOpen(false);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toastError(error.message || 'Error al invitar al miembro');
    } finally {
      setInviting(false);
    }
  }, [currentOrgId, selectedUser, canManageMembers, isDemo, inviteRole]);

  const selectMemberForRemoval = useCallback((member: Membership) => {
    setMemberToRemove(member);
    setRemoveMemberDialogOpen(true);
  }, []);

  const clearMemberToRemove = useCallback(() => {
    setMemberToRemove(null);
  }, []);

  const removeMember = useCallback(async () => {
    if (!memberToRemove || !canManageMembers || memberToRemove.role === 'owner' || !currentOrgId) {
      toastError('No se puede eliminar el propietario de la organización');
      return;
    }

    try {
      setRemoving(true);

      if (isDemo) {
        setMemberships((prev) => prev.filter((m) => m.user_id !== memberToRemove.user_id));
        toastSuccess('Miembro eliminado (modo demo)');
        setRemoveMemberDialogOpen(false);
        setMemberToRemove(null);
        return;
      }

      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('org_id', currentOrgId)
        .eq('user_id', memberToRemove.user_id);

      if (error) throw error;

      if (memberToRemove.user?.email) {
        await supabase
          .from('invitations')
          .update({ used_at: new Date().toISOString() })
          .eq('organization_id', currentOrgId)
          .eq('email', memberToRemove.user.email.toLowerCase().trim())
          .is('used_at', null);
      }

      setMemberships((prev) => prev.filter((m) => m.user_id !== memberToRemove.user_id));
      toastSuccess('Miembro eliminado de la organización');
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    } catch (error: any) {
      console.error('Error removing member:', error);
      toastError(error.message || 'Error al eliminar el miembro');
    } finally {
      setRemoving(false);
    }
  }, [memberToRemove, canManageMembers, currentOrgId, isDemo]);

  const handleSelectEmployeeFromList = useCallback(
    async (employee: SyncedEmployee) => {
      if (!employee.hasEmployeeRecord) {
        setSelectedSalons(new Set());
        setSelectedEmployee({
          employee: null,
          membership: memberships.find((m) => m.user_id === employee.user_id) || null,
        });
        return;
      }

      const { data: assignments } = await supabase
        .from('salon_employees')
        .select('salon_id')
        .eq('employee_id', employee.id)
        .eq('is_active', true);

      const assignedSalonIds = new Set((assignments || []).map((a) => a.salon_id));
      setSelectedSalons(assignedSalonIds);

      setSelectedEmployee({
        employee,
        membership: memberships.find((m) => m.user_id === employee.user_id) || null,
      });
    },
    [memberships],
  );

  const handleEditEmployeeFromList = useCallback(
    async (employee: SyncedEmployee) => {
      if (!employee.hasEmployeeRecord) {
        setEditingEmployee(null);
        setEmployeeFormData({
          full_name: employee.full_name || '',
          email: employee.email || '',
          phone: employee.phone || '',
          commission_type: 'percentage',
          default_commission_pct:
            typeof employee.default_commission_pct === 'number'
              ? employee.default_commission_pct
              : 50,
          default_commission_amount: employee.default_commission_amount ?? 0,
        });
        setSelectedSalons(new Set());
        setSelectedEmployee(null);
        setEmployeeDialogOpen(true);
        return;
      }

      setEditingEmployee(employee);
      setEmployeeFormData({
        full_name: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        commission_type: (employee.commission_type as 'percentage' | 'fixed') || 'percentage',
        default_commission_pct: employee.default_commission_pct || 0,
        default_commission_amount: employee.default_commission_amount || 0,
      });

      const { data: assignments } = await supabase
        .from('salon_employees')
        .select('salon_id')
        .eq('employee_id', employee.id)
        .eq('is_active', true);

      const assignedSalonIds = new Set((assignments || []).map((a) => a.salon_id));
      setSelectedSalons(assignedSalonIds);

      setSelectedEmployee(null);
      setEmployeeDialogOpen(true);
    },
    [],
  );

  const resetEmployeeForm = useCallback(() => {
    setEditingEmployee(null);
    setSelectedEmployee(null);
    setSelectedSalons(new Set());
    setEmployeeFormData(EMPLOYEE_FORM_DEFAULT);
  }, []);

  const handleCreateEmployeeClick = useCallback(() => {
    resetEmployeeForm();
    setEmployeeDialogOpen(true);
  }, [resetEmployeeForm]);

  const handleToggleSalon = useCallback((salonId: string) => {
    setSelectedSalons((prev) => {
      const next = new Set(prev);
      if (next.has(salonId)) {
        next.delete(salonId);
      } else {
        next.add(salonId);
      }
      return next;
    });
  }, []);

  const handleAssociateUserId = useCallback(async () => {
    if (!editingEmployee || !employeeFormData.email || !currentOrgId) {
      toastError('Email requerido para asociar usuario');
      return;
    }

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', employeeFormData.email.toLowerCase().trim())
        .limit(1);

      if (!profiles || profiles.length === 0) {
        toastError('No se encontró un usuario con ese email');
        return;
      }

      const userId = profiles[0].id;

      const { data: membership } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('org_id', currentOrgId)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        toastError('El usuario no tiene membresía en esta organización');
        return;
      }

      await updateEmployee(editingEmployee.id, { user_id: userId });
      toastSuccess('Usuario asociado correctamente');
      setEmployeeDialogOpen(false);
      await loadMemberships(currentOrgId);
    } catch (error) {
      console.error('Error asociando usuario:', error);
      toastError('Error al asociar usuario');
    }
  }, [employeeFormData.email, currentOrgId, editingEmployee, updateEmployee, loadMemberships]);

  const handleSaveEmployee = useCallback(async () => {
    if (savingEmployee) return;
    try {
      setSavingEmployee(true);

      if (!employeeFormData.full_name.trim()) {
        toastError('El nombre es obligatorio');
        return;
      }

      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, employeeFormData);

        if (selectedSalons.size > 0) {
          const { data: userData } = await supabase.auth.getUser();
          const assignmentPromises = Array.from(selectedSalons).map(async (salonId) => {
            const { data: existing } = await supabase
              .from('salon_employees')
              .select('id')
              .eq('salon_id', salonId)
              .eq('employee_id', editingEmployee.id)
              .single();

            if (!existing) {
              const { error: assignError } = await supabase.from('salon_employees').insert([
                {
                  salon_id: salonId,
                  employee_id: editingEmployee.id,
                  assigned_by: userData?.user?.id || currentUser?.id,
                  is_active: true,
                },
              ]);

              if (assignError) throw assignError;
            }
          });

          await Promise.all(assignmentPromises);
        }

        toastSuccess('Empleado actualizado correctamente');
      } else {
        if (!currentOrgId) {
          toastError('No se puede crear empleado: organización no encontrada');
          return;
        }

        let userId: string | null = null;
        if (employeeFormData.email) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', employeeFormData.email.toLowerCase().trim())
            .limit(1);

          if (profiles && profiles.length > 0) {
            userId = profiles[0].id;

            const { data: membership } = await supabase
              .from('memberships')
              .select('user_id')
              .eq('org_id', currentOrgId)
              .eq('user_id', userId)
              .single();

            if (!membership) {
              toastError('El usuario con ese email no tiene membresía en esta organización');
              return;
            }
          }
        }

        if (!userId) {
          toastError(
            'No se puede crear empleado sin usuario. El empleado debe tener un usuario asociado (user_id obligatorio). Debe invitar al usuario primero.',
          );
          return;
        }

        const { validateEmployeeHasUser } = await import('../../../lib/employeeValidator');
        const validation = validateEmployeeHasUser({
          ...employeeFormData,
          user_id: userId,
          org_id: currentOrgId,
        });

        if (!validation.valid) {
          toastError(validation.message || 'Error de validación del empleado');
          return;
        }

        const createdEmployee = await createEmployee({
          ...employeeFormData,
          org_id: currentOrgId,
          user_id: userId,
          active: true,
        } as any);

        if (createdEmployee && selectedSalons.size > 0) {
          const { data: userData } = await supabase.auth.getUser();
          const assignmentPromises = Array.from(selectedSalons).map(async (salonId) => {
            const { error: assignError } = await supabase.from('salon_employees').insert([
              {
                salon_id: salonId,
                employee_id: createdEmployee.id,
                assigned_by: userData?.user?.id || currentUser?.id,
                is_active: true,
              },
            ]);

            if (assignError) throw assignError;
          });

          await Promise.all(assignmentPromises);
        }

        toastSuccess('Empleado creado correctamente');
      }

      setEmployeeDialogOpen(false);
      resetEmployeeForm();
      if (currentOrgId) {
        await loadMemberships(currentOrgId);
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      toastError('Error al guardar el empleado');
    } finally {
      setSavingEmployee(false);
    }
  }, [
    savingEmployee,
    employeeFormData,
    editingEmployee,
    updateEmployee,
    selectedSalons,
    currentUser?.id,
    currentOrgId,
    createEmployee,
    resetEmployeeForm,
    loadMemberships,
  ]);

  const confirmDeleteEmployee = useCallback((employee: SyncedEmployee) => {
    setEmployeeToDelete(employee);
  }, []);

  const clearEmployeeToDelete = useCallback(() => {
    setEmployeeToDelete(null);
  }, []);

  const deleteEmployee = useCallback(async () => {
    if (!employeeToDelete) return;

    try {
      setDeletingEmployee(true);
      await deleteEmployeeRecord(employeeToDelete.id);
      toastSuccess('Empleado eliminado correctamente');
      setSelectedEmployee(null);
      if (currentOrgId) {
        await loadMemberships(currentOrgId);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toastError('Error al eliminar el empleado');
    } finally {
      setDeletingEmployee(false);
      setEmployeeToDelete(null);
    }
  }, [employeeToDelete, deleteEmployeeRecord, currentOrgId, loadMemberships]);

  const handleLeaveOrganization = useCallback(async () => {
    if (!currentOrgId || !organization) return;

    try {
      setLeaving(true);

      if (isDemo) {
        toastSuccess('Has salido de la organización (modo demo)');
        setLeaveOrgDialogOpen(false);
        return;
      }

      await leaveOrganization(currentOrgId);
      toastSuccess('Has salido de la organización correctamente');
      setLeaveOrgDialogOpen(false);
    } catch (error: any) {
      console.error('Error leaving organization:', error);
      toastError(error.message || 'Error al salir de la organización');
    } finally {
      setLeaving(false);
    }
  }, [currentOrgId, organization, isDemo, leaveOrganization]);

  const deleteOrganization = useCallback(async () => {
    if (!organization || !canDelete) return;

    try {
      setDeleting(true);

      if (isDemo) {
        toastSuccess('Organización eliminada (modo demo)');
        setOrganization(null);
        setDeleteDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from('orgs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', organization.id);

      if (error) throw error;

      toastSuccess('Organización eliminada correctamente');
      setDeleteDialogOpen(false);
      setOrganization(null);
      loadedOrgIdRef.current = null;
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toastError(error.message || 'Error al eliminar la organización');
    } finally {
      setDeleting(false);
    }
  }, [organization, canDelete, isDemo]);

  const updateOrganization = useCallback(async () => {
    if (!organization || !canEdit || !orgName.trim()) {
      toastError('El nombre es requerido');
      return;
    }

    if (!/\p{L}/u.test(orgName)) {
      toastError('El nombre de la organización debe incluir al menos una letra.');
      return;
    }

    try {
      const { error } = await supabase
        .from('orgs')
        .update({
          name: orgName.trim(),
          tax_id: orgTaxId.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (error) throw error;

      setOrganization({ ...organization, name: orgName.trim(), tax_id: orgTaxId.trim() });
      setEditingOrg(false);
      toastSuccess('Organización actualizada correctamente');
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toastError(error.message || 'Error al actualizar la organización');
    }
  }, [organization, canEdit, orgName, orgTaxId]);

  const employeeActionBarData = useMemo(() => {
    if (!selectedEmployee || !selectedEmployee.employee) return null;

    const employee = selectedEmployee.employee;
    const membership = selectedEmployee.membership;

    const assignedSalonNames = salons
      .filter((salon) => selectedSalons.has(salon.id))
      .map((salon) => salon.name)
      .join(', ') || 'Ninguno';

    return {
      title: employee.full_name,
      subtitle: employee.email || 'Sin email',
      badge: {
        text: employee.active ? 'Activo' : 'Inactivo',
        variant: (employee.active ? 'default' : 'outline') as 'default' | 'outline',
      },
      detailFields: [
        { label: 'Email', value: employee.email || 'N/A' },
        { label: 'Teléfono', value: employee.phone || 'N/A' },
        {
          label: 'Comisión',
          value:
            employee.commission_type === 'fixed'
              ? `$${employee.default_commission_amount?.toFixed(2) || 0}`
              : `${employee.default_commission_pct || 0}%`,
        },
        { label: 'Salones Asignados', value: assignedSalonNames },
        {
          label: 'Rol en organización',
          value: membership
            ? membership.role === 'employee'
              ? 'Empleado'
              : membership.role === 'admin'
              ? 'Administrador'
              : membership.role
            : 'Sin cuenta',
        },
      ],
    };
  }, [selectedEmployee, salons, selectedSalons]);

  useEffect(() => {
    if (isDemo) {
      const demoOrg: Organization = {
        id: 'demo-org-123',
        name: 'Salón Demo - COREBOARD',
        tax_id: '00-000000-0',
        created_at: new Date().toISOString(),
      };

      const demoMembers: Membership[] = [
        {
          id: 'demo-member-1',
          user_id: currentUser?.id || 'demo-user',
          role: 'owner',
          is_primary: true,
          user: { email: currentUser?.email || 'demo@coreboard.local' },
        },
      ];

      setOrganization(demoOrg);
      setOrgName(demoOrg.name);
      setOrgTaxId(demoOrg.tax_id || '');
      setMemberships(demoMembers);
      setLoading(false);
      loadedOrgIdRef.current = 'demo-org-123';
      previousOrgIdRef.current = 'demo-org-123';
      return;
    }

    if (currentOrgId !== previousOrgIdRef.current) {
      loadedOrgIdRef.current = null;
      loadingRef.current = false;
      previousOrgIdRef.current = currentOrgId;
    }

    if (currentOrgId && loadedOrgIdRef.current !== currentOrgId && !loadingRef.current) {
      loadOrganizationData();
    } else if (!currentOrgId) {
      setLoading(false);
      setOrganization(null);
      loadedOrgIdRef.current = null;
      previousOrgIdRef.current = null;
    }
  }, [currentOrgId, currentUser?.email, currentUser?.id, isDemo, loadOrganizationData]);

  useEffect(() => {
    if (!inviteDialogOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      return;
    }

    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, inviteDialogOpen, searchUsers]);

  useEffect(() => {
    if (!employeeDialogOpen) {
      return;
    }

    if (employeeFormData.commission_type === 'percentage') {
      setEmployeeFormData((prev) => ({
        ...prev,
        default_commission_amount: prev.default_commission_amount || 0,
      }));
    }
  }, [employeeDialogOpen, employeeFormData.commission_type]);

  const formattedCreatedAt = useMemo(() => {
    if (!organization?.created_at) return '—';
    return new Date(organization.created_at).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [organization?.created_at]);

  const ownerLabel = useMemo(
    () =>
      ownerMembership?.user?.full_name ||
      ownerMembership?.user?.email ||
      'Propietario sin asignar',
    [ownerMembership],
  );

  const openInviteDialog = useCallback(() => {
    if (!canManageMembers) {
      toastInfo('No tenés permisos para invitar miembros.');
      return;
    }
    setInviteDialogOpen(true);
  }, [canManageMembers]);

  const openEmployeeDialog = useCallback(() => {
    if (!canManageTeam) {
      toastInfo('No tenés permisos para gestionar empleados.');
      return;
    }
    handleCreateEmployeeClick();
  }, [canManageTeam, handleCreateEmployeeClick]);

  return {
    // basic info
    organization,
    memberships,
    loading,
    loadingMembers,
    loadingEmployees,
    ownerMembership,
    membersPreview,
    memberDirectory,
    heroStats,
    formattedCreatedAt,
    ownerLabel,

    // permissions
    permissions: {
      canEdit,
      canManageMembers,
      canDelete,
      canManageTeam,
      canEditCommissions,
    },

    // organization edit
    editingOrg,
    setEditingOrg,
    orgName,
    setOrgName,
    orgTaxId,
    setOrgTaxId,
    updateOrganization,

    // invite
    inviteDialogOpen,
    setInviteDialogOpen,
    openInviteDialog,
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    selectedUser,
    setSelectedUser,
    inviteRole,
    setInviteRole,
    inviting,
    inviteMember,

    // remove member
    removeMemberDialogOpen,
    setRemoveMemberDialogOpen,
    memberToRemove,
    requestRemoveMember: selectMemberForRemoval,
    clearMemberToRemove,
    removeMember,
    removing,

    // leave org
    leaveOrgDialogOpen,
    setLeaveOrgDialogOpen,
    handleLeaveOrganization,
    leaving,

    // delete org
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteOrganization,
    deleting,

    // employees
    salons,
    syncedEmployees,
    selectedEmployee,
    setSelectedEmployee,
    employeeDialogOpen,
    setEmployeeDialogOpen,
    editingEmployee,
    setEditingEmployee,
    employeeFormData,
    setEmployeeFormData,
    selectedSalons,
    handleToggleSalon,
    handleSaveEmployee,
    savingEmployee,
    handleAssociateUserId,
    handleCreateEmployeeClick,
    handleEditEmployeeFromList,
    handleSelectEmployeeFromList,
    openEmployeeDialog,
    employeeActionBarData,
    resetEmployeeForm,

    // delete employee confirmation
    employeeToDelete,
    requestEmployeeDeletion: confirmDeleteEmployee,
    clearEmployeeToDelete,
    deleteEmployee,
    deletingEmployee,

    // expose other helpers
    toastInfo,
  };
}


