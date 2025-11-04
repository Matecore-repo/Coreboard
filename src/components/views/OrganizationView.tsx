// ============================================================================
// COMPONENTE: OrganizationView (REFACTORIZADO - Sistema de Invitación)
// ============================================================================
// Gestión completa de organizaciones: ver, renombrar, invitar miembros y eliminar
// Layout simplificado consistente con HomeView

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployees } from '../../hooks/useEmployees';
import { useSalons } from '../../hooks/useSalons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { PageContainer } from '../layout/PageContainer';
import { Section } from '../layout/Section';
import { GenericActionBar } from '../GenericActionBar';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Trash2, Pencil, Save, X, Users, Mail, UserPlus, Search, Check, DollarSign, Phone, Building2, Settings, Edit3 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  tax_id?: string;
  settings?: any;
  created_at: string;
}

interface Membership {
  id?: string;
  user_id: string;
  role: 'admin' | 'owner' | 'employee' | 'viewer';
  is_primary: boolean;
  user?: {
    email: string;
    full_name?: string;
  };
  employee?: {
    id: string;
    user_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    commission_type?: 'percentage' | 'fixed';
    default_commission_pct?: number;
    default_commission_amount?: number;
    active: boolean;
  };
}

interface SearchedUser {
  id: string;
  email: string;
  full_name?: string;
}

interface OrganizationViewProps {
  isDemo?: boolean;
}

const OrganizationView: React.FC<OrganizationViewProps> = ({ isDemo = false }) => {
  const { user: currentUser, currentRole, currentOrgId, leaveOrganization } = useAuth() as any;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Estados de edición
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgTaxId, setOrgTaxId] = useState('');

  // Estados para invitar miembros
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [inviteRole, setInviteRole] = useState<'employee' | 'admin' | 'viewer'>('employee');
  const [inviting, setInviting] = useState(false);

  // Estado para eliminar organización
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Estado para quitar miembro
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Membership | null>(null);
  const [removing, setRemoving] = useState(false);

  // Estado para salir de la organización
  const [leaveOrgDialogOpen, setLeaveOrgDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Estados para gestión de empleados
  const { employees, isLoading: loadingEmployees, createEmployee, updateEmployee, deleteEmployee } = useEmployees(currentOrgId ?? undefined);
  const { salons } = useSalons(currentOrgId ?? undefined, { enabled: true });
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [selectedSalons, setSelectedSalons] = useState<Set<string>>(new Set());
  const [employeeFormData, setEmployeeFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    commission_type: 'percentage' as 'percentage' | 'fixed',
    default_commission_pct: 50.0,
    default_commission_amount: 0,
  });

  // Refs para evitar cargas múltiples
  const loadingRef = useRef(false);
  const loadedOrgIdRef = useRef<string | null>(null);
  const previousOrgIdRef = useRef<string | null>(null);

  const isAdmin = currentRole === 'admin';
  const isOwner = currentRole === 'owner';
  const isEmployee = currentRole === 'employee';
  const canEdit = isAdmin || isOwner;
  const canManageMembers = isAdmin || isOwner;
  const canDelete = isOwner;
  const canViewMembers = true; // Todos los usuarios pueden ver miembros

  // ============================================================================
  // FUNCIONES DE GESTIÓN DE EMPLEADOS
  // ============================================================================

  const handleSelectEmployeeFromList = useCallback(async (employee: any) => {
    // Cargar salones asignados
    const { data: assignments } = await supabase
      .from('salon_employees')
      .select('salon_id')
      .eq('employee_id', employee.id)
      .eq('is_active', true);
    
    const assignedSalonIds = new Set((assignments || []).map(a => a.salon_id));
    setSelectedSalons(assignedSalonIds);
    
    setSelectedEmployee({
      employee: employee,
      membership: memberships.find(m => m.user_id === employee.user_id) || null
    });
  }, [memberships]);

  const handleEditEmployeeFromList = useCallback(async (employee: any) => {
    setEditingEmployee(employee);
    setEmployeeFormData({
      full_name: employee.full_name,
      email: employee.email || '',
      phone: employee.phone || '',
      commission_type: (employee.commission_type as 'percentage' | 'fixed') || 'percentage',
      default_commission_pct: employee.default_commission_pct || 0,
      default_commission_amount: employee.default_commission_amount || 0,
    });
    
    // Cargar salones asignados
    const { data: assignments } = await supabase
      .from('salon_employees')
      .select('salon_id')
      .eq('employee_id', employee.id)
      .eq('is_active', true);
    
    const assignedSalonIds = new Set((assignments || []).map(a => a.salon_id));
    setSelectedSalons(assignedSalonIds);
    
    setSelectedEmployee(null); // Cerrar action bar
    setTimeout(() => {
      setEmployeeDialogOpen(true);
    }, 200);
  }, []);

  const handleSaveEmployee = async () => {
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, employeeFormData);
        
        // Actualizar asignación a salones
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
              const { error: assignError } = await supabase
                .from('salon_employees')
                .insert([{
                  salon_id: salonId,
                  employee_id: editingEmployee.id,
                  assigned_by: userData?.user?.id || currentUser?.id,
                  is_active: true,
                }]);
              
              if (assignError) throw assignError;
            }
          });
          
          await Promise.all(assignmentPromises);
        }
        
        toast.success('Empleado actualizado correctamente');
      } else {
        if (!currentOrgId) {
          toast.error('No se puede crear empleado: organización no encontrada');
          return;
        }

        // Buscar usuario por email si se proporciona
        let userId: string | null = null;
        if (employeeFormData.email) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', employeeFormData.email.toLowerCase().trim())
            .limit(1);
          
          if (profiles && profiles.length > 0) {
            userId = profiles[0].id;
            
            // Verificar que el usuario tiene membresía en esta organización
            const { data: membership } = await supabase
              .from('memberships')
              .select('user_id')
              .eq('org_id', currentOrgId)
              .eq('user_id', userId)
              .single();
            
            if (!membership) {
              toast.error('El usuario con ese email no tiene membresía en esta organización');
              return;
            }
          }
        }

        const createdEmployee = await createEmployee({
          ...employeeFormData,
          org_id: currentOrgId,
          user_id: userId,
          active: true,
        });
        
        // Asignar empleado a salones seleccionados
        if (createdEmployee && selectedSalons.size > 0) {
          const { data: userData } = await supabase.auth.getUser();
          const assignmentPromises = Array.from(selectedSalons).map(async (salonId) => {
            const { error: assignError } = await supabase
              .from('salon_employees')
              .insert([{
                salon_id: salonId,
                employee_id: createdEmployee.id,
                  assigned_by: userData?.user?.id || currentUser?.id,
                is_active: true,
              }]);
            
            if (assignError) throw assignError;
          });
          
          await Promise.all(assignmentPromises);
        }
        
        toast.success('Empleado creado correctamente');
      }

      setEmployeeDialogOpen(false);
      setEditingEmployee(null);
      setSelectedSalons(new Set());
      setSelectedEmployee(null);
      setEmployeeFormData({ full_name: '', email: '', phone: '', commission_type: 'percentage', default_commission_pct: 50.0, default_commission_amount: 0 });
      await loadMemberships(currentOrgId!);
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Error al guardar el empleado');
    }
  };


  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este empleado?')) return;

    try {
      await deleteEmployee(employeeId);
      toast.success('Empleado eliminado correctamente');
      setSelectedEmployee(null);
      await loadMemberships(currentOrgId!);
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Error al eliminar el empleado');
    }
  };

  const handleToggleSalon = (salonId: string) => {
    setSelectedSalons(prev => {
      const next = new Set(prev);
      if (next.has(salonId)) {
        next.delete(salonId);
      } else {
        next.add(salonId);
      }
      return next;
    });
  };

  const handleAssociateUserId = async () => {
    if (!selectedEmployee?.user_id || !employeeFormData.email) {
      toast.error('Email requerido para asociar usuario');
      return;
    }

    try {
      // Buscar el usuario por email
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', employeeFormData.email.toLowerCase().trim())
        .limit(1);
      
      if (!profiles || profiles.length === 0) {
        toast.error('No se encontró un usuario con ese email');
        return;
      }
      
      const userId = profiles[0].id;
      
      // Verificar que el usuario tiene membresía en esta organización
      const { data: membership } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('org_id', currentOrgId)
        .eq('user_id', userId)
        .single();
      
      if (!membership) {
        toast.error('El usuario no tiene membresía en esta organización');
        return;
      }
      
      // Asociar el user_id al empleado
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, { user_id: userId });
        toast.success('Usuario asociado correctamente');
        setEmployeeDialogOpen(false);
        await loadMemberships(currentOrgId!);
      }
    } catch (error) {
      console.error('Error asociando usuario:', error);
      toast.error('Error al asociar usuario');
    }
  };

  // Obtener datos del empleado seleccionado para el action bar
  const employeeActionBarData = useMemo(() => {
    if (!selectedEmployee || !selectedEmployee.employee) return null;
    
    const employee = selectedEmployee.employee;
    const membership = selectedEmployee.membership;
    
    // Obtener nombres de salones asignados
    const assignedSalonNames = salons
      .filter(s => selectedSalons.has(s.id))
      .map(s => s.name)
      .join(', ') || 'Ninguno';
    
    return {
      title: employee.full_name,
      subtitle: employee.email || 'Sin email',
            badge: {
              text: employee.active ? 'Activo' : 'Inactivo',
              variant: (employee.active ? 'default' : 'outline') as 'default' | 'outline'
            },
      detailFields: [
        { label: 'Email', value: employee.email || 'N/A' },
        { label: 'Teléfono', value: employee.phone || 'N/A' },
        { 
          label: 'Comisión', 
          value: employee.commission_type === 'fixed' 
            ? `$${employee.default_commission_amount?.toFixed(2) || 0}`
            : `${employee.default_commission_pct || 0}%`
        },
        { label: 'Salones Asignados', value: assignedSalonNames },
        { label: 'Rol en organización', value: membership 
          ? (membership.role === 'employee' ? 'Empleado' : membership.role === 'admin' ? 'Administrador' : membership.role)
          : 'Sin cuenta' },
      ]
    };
  }, [selectedEmployee, selectedSalons, salons]);

  // ============================================================================
  // FUNCIONES DE CARGA (Memoizadas y optimizadas)
  // ============================================================================

  const loadMemberships = useCallback(async (orgId: string) => {
    setLoadingMembers(true);
    try {
      const { data: members, error } = await supabase
        .from('memberships')
        .select('id, user_id, role, is_primary')
        .eq('org_id', orgId)
        .limit(100);

      if (error) {
        console.error('Error loading memberships:', error);
        return;
      }

      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        
        // Obtener emails y nombres de profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, { email: p.email, full_name: p.full_name }]));

        // Obtener nombres de employees si no están en profiles (por user_id)
        const { data: employees } = await supabase
          .from('employees')
          .select('user_id, full_name, email')
          .in('user_id', userIds)
          .not('user_id', 'is', null);

        const employeeMap = new Map((employees || []).map(e => [e.user_id, { full_name: e.full_name, email: e.email }]));

        // Combinar información de profiles y employees
        setMemberships(members.map((m: any) => {
          const profile = profileMap.get(m.user_id);
          const employee = employeeMap.get(m.user_id);
          
          // Priorizar: profile -> employee -> fallback
          const email = profile?.email || employee?.email || `Usuario ${m.user_id.substring(0, 8)}`;
          const full_name = profile?.full_name || employee?.full_name || undefined;

          return {
            ...m,
            user: {
              email,
              full_name
            }
          };
        }));
      } else {
        setMemberships([]);
      }
    } catch (error) {
      console.error('Error loading memberships:', error);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

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
      // Abort controller con timeout suave para evitar bloqueos prolongados
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 12000);

      // Cargar organización (request principal)
      const orgResult: any = await (supabase
        .from('orgs')
        .select('id, name, tax_id, created_at')
        .eq('id', currentOrgId)
        // @ts-ignore: abortSignal está disponible en supabase-js v2
        .abortSignal ? (supabase
          .from('orgs')
          .select('id, name, tax_id, created_at')
          .eq('id', currentOrgId)
          // @ts-ignore
          .abortSignal(controller.signal)
          .single()) : (supabase
          .from('orgs')
          .select('id, name, tax_id, created_at')
          .eq('id', currentOrgId)
          .single()));

      clearTimeout(abortTimer);

      if (orgResult.error) {
        throw new Error(orgResult.error.message || 'Error al cargar la organización');
      }

      const org = orgResult.data;
      if (!org) {
        throw new Error('Organización no encontrada');
      }

      setOrganization(org);
      setOrgName(org.name || '');
      setOrgTaxId(org.tax_id || '');

      // Cargar miembros
      await loadMemberships(currentOrgId);

    } catch (error: any) {
      console.error('Error loading organization:', error);
      const errorMsg = error.message || 'Error al cargar la organización. Verifica tu conexión.';
      toast.error(errorMsg);
      setOrganization(null);
      loadedOrgIdRef.current = null;
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [currentOrgId, loadMemberships]);

  // ============================================================================
  // EFECTO PRINCIPAL
  // ============================================================================

  useEffect(() => {
    if (isDemo) {
      const demoOrg: Organization = {
        id: 'demo-org-123',
        name: 'Salón Demo - COREBOARD',
        tax_id: '00-000000-0',
        created_at: new Date().toISOString()
      };

      const demoMembers: Membership[] = [{
        id: 'demo-member-1',
        user_id: currentUser?.id || 'demo-user',
        role: 'owner',
        is_primary: true,
        user: { email: currentUser?.email || 'demo@coreboard.local' }
      }];

      setOrganization(demoOrg);
      setOrgName(demoOrg.name);
      setOrgTaxId(demoOrg.tax_id || '');
      setMemberships(demoMembers);
      setLoading(false);
      loadedOrgIdRef.current = 'demo-org-123';
      previousOrgIdRef.current = 'demo-org-123';
      return;
    }

    // Resetear carga si cambió el orgId o si se monta desde otra vista
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
  }, [currentOrgId, isDemo, loadOrganizationData]);

  // ============================================================================
  // FUNCIONES DE ACCIÓN
  // ============================================================================

  const updateOrganization = async () => {
    if (!organization || !canEdit || !orgName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      const { error } = await supabase
        .from('orgs')
        .update({
          name: orgName.trim(),
          tax_id: orgTaxId.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', organization.id);

      if (error) throw error;

      setOrganization({ ...organization, name: orgName.trim(), tax_id: orgTaxId.trim() });
      setEditingOrg(false);
      toast.success('Organización actualizada correctamente');
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error(error.message || 'Error al actualizar la organización');
    }
  };

  // ============================================================================
  // FUNCIONES DE BÚSQUEDA Y GESTIÓN DE MIEMBROS
  // ============================================================================

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const searchTerm = query.trim().toLowerCase();
      const isEmail = searchTerm.includes('@');
      
      // Buscar en profiles por email (exacto primero, luego parcial)
      let profiles: any[] = [];
      if (isEmail) {
        // Si parece un email, buscar exacto primero
        const { data: exactProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('email', searchTerm)
          .limit(10);
        
        if (exactProfiles && exactProfiles.length > 0) {
          profiles = exactProfiles;
        } else {
          // Si no hay exacto, buscar parcial
          const { data: partialProfiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .ilike('email', `%${searchTerm}%`)
            .limit(10);
          profiles = partialProfiles || [];
        }
      } else {
        // Si no es email, buscar por coincidencia parcial
        const { data: partialProfiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .ilike('email', `%${searchTerm}%`)
          .limit(10);
        profiles = partialProfiles || [];
      }

      // Buscar en employees por email (si tienen user_id)
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

      // Buscar en employees por full_name (solo si tienen user_id)
      const { data: employeesByName } = await supabase
        .from('employees')
        .select('user_id, full_name, email')
        .ilike('full_name', `%${searchTerm}%`)
        .not('user_id', 'is', null)
        .limit(10);

      // Combinar resultados
      const userMap = new Map<string, SearchedUser>();
      
      // Agregar profiles
      (profiles || []).forEach((p: any) => {
        if (!userMap.has(p.id)) {
          userMap.set(p.id, {
            id: p.id,
            email: p.email || '',
            full_name: p.full_name || undefined
          });
        }
      });

      // Agregar employees encontrados por email
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
              full_name: e.full_name || undefined
            });
          }
        }
      });

      // Agregar employees encontrados por nombre
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
              full_name: e.full_name
            });
          }
        }
      });

      // Filtrar usuarios que ya son miembros de la organización
      const memberIds = new Set(memberships.map(m => m.user_id));
      const filteredResults = Array.from(userMap.values()).filter(u => !memberIds.has(u.id));

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Error al buscar usuarios. Intenta de nuevo.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [memberships]);

  const inviteMember = async () => {
    if (!currentOrgId || !selectedUser || !canManageMembers) return;

    try {
      setInviting(true);

      if (isDemo) {
        toast.success('Miembro invitado (modo demo)');
        setInviteDialogOpen(false);
        setSelectedUser(null);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }

      // Crear invitación usando RPC
      const { data, error } = await supabase.rpc('create_invitation', {
        p_organization_id: currentOrgId,
        p_email: selectedUser.email,
        p_role: inviteRole,
        p_token: null, // Generar token automáticamente
        p_expires_days: 7
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      toast.success(`Invitación enviada a ${selectedUser.email}`);
      setInviteDialogOpen(false);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast.error(error.message || 'Error al invitar al miembro');
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async () => {
    if (!memberToRemove || !canManageMembers || memberToRemove.role === 'owner') {
      toast.error('No se puede eliminar el propietario de la organización');
      return;
    }

    try {
      setRemoving(true);

      if (isDemo) {
        setMemberships(prev => prev.filter(m => m.user_id !== memberToRemove.user_id));
        toast.success('Miembro eliminado (modo demo)');
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

      // Cancelar invitaciones pendientes para este usuario en esta organización
      // Esto permite que puedan ser invitados nuevamente sin problemas
      if (memberToRemove.user?.email) {
        await supabase
          .from('invitations')
          .update({ used_at: new Date().toISOString() })
          .eq('organization_id', currentOrgId)
          .eq('email', memberToRemove.user.email.toLowerCase().trim())
          .is('used_at', null);
      }

      setMemberships(prev => prev.filter(m => m.user_id !== memberToRemove.user_id));
      toast.success('Miembro eliminado de la organización');
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.message || 'Error al eliminar el miembro');
    } finally {
      setRemoving(false);
    }
  };

  const handleLeaveOrganization = async () => {
    if (!currentOrgId || !organization) return;

    try {
      setLeaving(true);

      if (isDemo) {
        toast.success('Has salido de la organización (modo demo)');
        setLeaveOrgDialogOpen(false);
        return;
      }

      await leaveOrganization(currentOrgId);
      toast.success('Has salido de la organización correctamente');
      setLeaveOrgDialogOpen(false);
      
      // La función leaveOrganization ya maneja la redirección
      // Si no hay más organizaciones, el usuario será redirigido al login
    } catch (error: any) {
      console.error('Error leaving organization:', error);
      toast.error(error.message || 'Error al salir de la organización');
    } finally {
      setLeaving(false);
    }
  };

  const deleteOrganization = async () => {
    if (!organization || !canDelete) return;

    try {
      setDeleting(true);

      if (isDemo) {
        toast.success('Organización eliminada (modo demo)');
        setOrganization(null);
        setDeleteDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from('orgs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', organization.id);

      if (error) throw error;

      toast.success('Organización eliminada correctamente');
      setDeleteDialogOpen(false);
      setOrganization(null);
      loadedOrgIdRef.current = null;
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast.error(error.message || 'Error al eliminar la organización');
    } finally {
      setDeleting(false);
    }
  };

  // Efecto para búsqueda con debounce
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

  // ============================================================================
  // RENDERIZADO
  // ============================================================================

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (!organization) {
    return (
      <PageContainer>
        <Section title="Organización">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No tienes una organización asignada.</p>
            </CardContent>
          </Card>
        </Section>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Section 
        title="Organización"
        action={
          <div className="flex gap-2">
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            )}
          </div>
        }
      >
        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="members">
              Miembros {loadingMembers ? '(...)' : `(${memberships.length})`}
            </TabsTrigger>
            <TabsTrigger value="employees">
              Empleados {loadingEmployees ? '(...)' : `(${employees.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Información */}
          <TabsContent value="info" className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Información de la Organización</CardTitle>
                    <CardDescription>
                      Gestiona la información básica de tu organización
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      {editingOrg ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => {
                            setEditingOrg(false);
                            setOrgName(organization.name);
                            setOrgTaxId(organization.tax_id || '');
                          }}>
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={updateOrganization}>
                            <Save className="h-4 w-4 mr-2" />
                            Guardar
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setEditingOrg(true)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingOrg ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="org-name">Nombre de la Organización *</Label>
                      <Input
                        id="org-name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Mi Organización"
                      />
                    </div>
                    <div>
                      <Label htmlFor="org-tax-id">CUIT/CUIL (opcional)</Label>
                      <Input
                        id="org-tax-id"
                        value={orgTaxId}
                        onChange={(e) => setOrgTaxId(e.target.value)}
                        placeholder="XX-XXXXXXXX-X"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Nombre</Label>
                      <p className="text-lg">{organization.name}</p>
                    </div>
                    {organization.tax_id && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">CUIT/CUIL</Label>
                        <p className="text-lg">{organization.tax_id}</p>
                      </div>
                    )}
                    {(() => {
                      const owner = memberships.find(m => m.role === 'owner');
                      return owner && (
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Propietario</Label>
                          <p className="text-lg">{owner.user?.email || owner.user?.full_name || 'No especificado'}</p>
                        </div>
                      );
                    })()}
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium text-muted-foreground">Creada</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(organization.created_at).toLocaleDateString('es-AR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Miembros */}
          <TabsContent value="members" className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Miembros de la Organización</CardTitle>
                    <CardDescription>
                      {memberships.length} miembro{memberships.length !== 1 ? 's' : ''} en total
                    </CardDescription>
                  </div>
                  {canManageMembers && (
                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invitar Miembro
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Invitar Miembro a la Organización</DialogTitle>
                          <DialogDescription>
                            Busca un usuario por email o nombre para invitarlo a unirse a la organización.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5">
                          <div className="space-y-2.5">
                            <Label htmlFor="search-user" className="text-sm font-medium">Buscar usuario</Label>
                            <div className="relative mt-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="search-user"
                                placeholder="Email o nombre completo..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                            {searching && (
                              <p className="text-sm text-muted-foreground mt-1.5">Buscando...</p>
                            )}
                          </div>

                          {searchResults.length > 0 && (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {searchResults.map((result) => (
                                <div
                                  key={result.id}
                                  onClick={() => setSelectedUser(result)}
                                  className={`p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                                    selectedUser?.id === result.id ? 'border-primary bg-accent' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">
                                        {result.full_name || result.email}
                                      </p>
                                      {result.full_name && (
                                        <p className="text-sm text-muted-foreground">{result.email}</p>
                                      )}
                                    </div>
                                    {selectedUser?.id === result.id && (
                                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                        <Check className="h-3 w-3 text-primary-foreground" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {selectedUser && (
                            <div className="p-3 bg-accent rounded-lg">
                              <p className="text-sm font-medium">Usuario seleccionado:</p>
                              <p className="text-sm">{selectedUser.full_name || selectedUser.email}</p>
                              {selectedUser.full_name && (
                                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                              )}
                            </div>
                          )}

                          <div className="space-y-2.5">
                            <Label htmlFor="invite-role" className="text-sm font-medium">Rol</Label>
                            <Select 
                              value={inviteRole} 
                              onValueChange={(value: 'employee' | 'admin' | 'viewer') => setInviteRole(value)}
                            >
                              <SelectTrigger id="invite-role" className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="employee">Empleado</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="viewer">Visualizador</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              El usuario recibirá un email con la invitación para unirse a la organización.
                            </p>
                          </div>

                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setInviteDialogOpen(false);
                                setSelectedUser(null);
                                setSearchQuery('');
                                setSearchResults([]);
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              onClick={inviteMember} 
                              disabled={inviting || !selectedUser}
                            >
                              {inviting ? 'Enviando...' : 'Enviar Invitación'}
                            </Button>
                          </DialogFooter>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberships.map((membership) => {
                      const isOwner = membership.role === 'owner';
                      
                      return (
                        <div 
                          key={membership.user_id} 
                          className="flex items-center justify-between p-4 border border-border/60 dark:border-border/40 rounded-2xl bg-card"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">
                                {membership.user?.full_name || membership.user?.email || `Usuario ${membership.user_id.substring(0, 8)}`}
                              </p>
                              {membership.user?.email && (
                                <p className="text-sm text-muted-foreground truncate">{membership.user.email}</p>
                              )}
                              <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
                                <Badge variant={
                                  membership.role === 'admin' ? 'default' :
                                  membership.role === 'owner' ? 'secondary' : 'outline'
                                }>
                                  {membership.role === 'owner' ? 'Propietario' :
                                   membership.role === 'admin' ? 'Administrador' :
                                   membership.role === 'employee' ? 'Empleado' :
                                   'Visualizador'}
                                </Badge>
                                {membership.is_primary && (
                                  <Badge variant="outline">Principal</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Botón para salir de la organización (solo para el usuario actual, no owners) */}
                            {membership.user_id === currentUser?.id && membership.role !== 'owner' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLeaveOrgDialogOpen(true)}
                                className="text-destructive hover:text-destructive"
                              >
                                Salir de la organización
                              </Button>
                            )}
                            {/* Botón para quitar miembro (solo para admin/owner, no el usuario actual, no owners) */}
                            {canManageMembers && membership.role !== 'owner' && membership.user_id !== currentUser?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setMemberToRemove(membership);
                                  setRemoveMemberDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {memberships.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        No hay miembros en esta organización
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Empleados */}
          <TabsContent value="employees" className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Empleados de la Organización</CardTitle>
                    <CardDescription>
                      Gestión de legajos laborales: comisiones, locales asignados y datos de contacto
                    </CardDescription>
                  </div>
                  {canManageMembers && (
                    <Button
                      onClick={() => {
                        setEditingEmployee(null);
                        setEmployeeFormData({ full_name: '', email: '', phone: '', commission_type: 'percentage', default_commission_pct: 50.0, default_commission_amount: 0 });
                        setSelectedSalons(new Set());
                        setEmployeeDialogOpen(true);
                      }}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Agregar Empleado
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingEmployees ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employees.map((employee) => {
                      const employeeMembership = memberships.find(m => m.user_id === employee.user_id);
                      const hasUserAccount = !!employee.user_id;
                      
                      return (
                        <div 
                          key={employee.id} 
                          className={`flex items-center justify-between p-4 border border-border/60 dark:border-border/40 rounded-2xl bg-card ${canManageMembers ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
                          onClick={() => canManageMembers && handleSelectEmployeeFromList(employee)}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">
                                {employee.full_name}
                              </p>
                              {employee.email && (
                                <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                              )}
                              <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
                                <Badge variant={employee.active ? 'default' : 'outline'}>
                                  {employee.active ? 'Activo' : 'Inactivo'}
                                </Badge>
                                {hasUserAccount && (
                                  <Badge variant="secondary" className="text-xs">
                                    Con cuenta
                                  </Badge>
                                )}
                                {!hasUserAccount && (
                                  <Badge variant="outline" className="text-xs">
                                    Sin cuenta
                                  </Badge>
                                )}
                                {employee.commission_type && (
                                  <Badge variant="secondary" className="text-xs">
                                    {employee.commission_type === 'fixed' 
                                      ? `$${employee.default_commission_amount?.toFixed(2) || 0}`
                                      : `${employee.default_commission_pct || 0}%`}
                                  </Badge>
                                )}
                                {employeeMembership && (
                                  <Badge variant="outline" className="text-xs">
                                    {employeeMembership.role === 'admin' ? 'Admin' :
                                     employeeMembership.role === 'employee' ? 'Empleado' :
                                     employeeMembership.role}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {canManageMembers && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditEmployeeFromList(employee)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                            {canManageMembers && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
                                    handleDeleteEmployee(employee.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {employees.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        No hay empleados registrados en esta organización
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Section>

      {/* Dialog de confirmación para eliminar organización */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar organización?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la organización "{organization.name}" y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteOrganization}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para quitar miembro */}
      <AlertDialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar miembro de la organización?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas quitar a {memberToRemove?.user?.full_name || memberToRemove?.user?.email || 'este miembro'} de la organización? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removing}
            >
              {removing ? 'Quitando...' : 'Quitar Miembro'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para salir de la organización */}
      <AlertDialog open={leaveOrgDialogOpen} onOpenChange={setLeaveOrgDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir de la organización?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas salir de la organización "{organization?.name}"? Esta acción no se puede deshacer. Ya no tendrás acceso a los datos de esta organización.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveOrganization}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={leaving}
            >
              {leaving ? 'Saliendo...' : 'Salir de la organización'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para crear/editar empleado */}
      <Dialog 
        open={employeeDialogOpen} 
        onOpenChange={(open) => {
          setEmployeeDialogOpen(open);
          // Si se cierra el modal, cerrar también el action bar si está abierto
          if (!open) {
            setSelectedEmployee(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
            </DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? 'Modifica los datos del empleado.'
                : 'Agrega un nuevo empleado a tu organización.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                value={employeeFormData.full_name}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, full_name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={employeeFormData.email}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                  placeholder="juan@email.com"
                />
                {employeeFormData.email && editingEmployee && !editingEmployee.user_id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAssociateUserId}
                  >
                    Asociar Usuario
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {editingEmployee && !editingEmployee.user_id 
                  ? 'Ingresa el email del empleado invitado para asociar su cuenta'
                  : 'Email del empleado'}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                value={employeeFormData.phone}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                placeholder="+54911234567"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="commission_type">Tipo de comisión</Label>
              <Select
                value={employeeFormData.commission_type}
                onValueChange={(value: 'percentage' | 'fixed') => {
                  setEmployeeFormData({
                    ...employeeFormData,
                    commission_type: value,
                  });
                }}
              >
                <SelectTrigger id="commission_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                  <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {employeeFormData.commission_type === 'percentage' ? (
              <div className="grid gap-2">
                <Label htmlFor="commission_pct">Tasa de comisión (%)</Label>
                <Input
                  id="commission_pct"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={employeeFormData.default_commission_pct}
                  onChange={(e) => setEmployeeFormData({
                    ...employeeFormData,
                    default_commission_pct: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="commission_amount">Monto fijo de comisión ($)</Label>
                <Input
                  id="commission_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={employeeFormData.default_commission_amount}
                  onChange={(e) => setEmployeeFormData({
                    ...employeeFormData,
                    default_commission_amount: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Asignar a Salones</Label>
              {salons.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay salones disponibles</p>
              ) : (
                <div className="space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                  {salons.map((salon) => (
                    <div key={salon.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`salon-${salon.id}`}
                        checked={selectedSalons.has(salon.id)}
                        onChange={() => handleToggleSalon(salon.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor={`salon-${salon.id}`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        <div className="font-medium">{salon.name}</div>
                        {salon.address && (
                          <div className="text-xs text-muted-foreground">{salon.address}</div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEmployeeDialogOpen(false);
              setEditingEmployee(null);
              setSelectedEmployee(null);
              setSelectedSalons(new Set());
              setEmployeeFormData({ full_name: '', email: '', phone: '', commission_type: 'percentage', default_commission_pct: 50.0, default_commission_amount: 0 });
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmployee} disabled={!employeeFormData.full_name.trim()}>
              {editingEmployee ? 'Actualizar' : 'Crear'} Empleado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GenericActionBar para empleado seleccionado - Solo mostrar si el modal NO está abierto */}
      {employeeActionBarData && selectedEmployee && !employeeDialogOpen && (
        <GenericActionBar
          title={employeeActionBarData.title}
          subtitle={employeeActionBarData.subtitle}
          badge={employeeActionBarData.badge}
          isOpen={!!selectedEmployee && !employeeDialogOpen}
          onClose={() => setSelectedEmployee(null)}
          onEdit={() => {
            if (selectedEmployee?.employee) {
              handleEditEmployeeFromList(selectedEmployee.employee);
            }
          }}
          onDelete={selectedEmployee.employee ? () => {
            if (selectedEmployee.employee) {
              setSelectedEmployee(null); // Cerrar action bar
              handleDeleteEmployee(selectedEmployee.employee.id);
            }
          } : undefined}
          detailFields={employeeActionBarData.detailFields}
        />
      )}
    </PageContainer>
  );
};

export default OrganizationView;
