// ============================================================================
// COMPONENTE: OrganizationView (REFACTORIZADO - Sistema de Invitación)
// ============================================================================
// Gestión completa de organizaciones: ver, renombrar, invitar miembros y eliminar
// Layout simplificado consistente con HomeView

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Trash2, Pencil, Save, X, Users, Mail, UserPlus, Search, Check } from 'lucide-react';

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
        
        // Obtener emails de profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        // Obtener nombres completos de employees si tienen user_id
        const { data: employees } = await supabase
          .from('employees')
          .select('user_id, full_name')
          .eq('org_id', orgId)
          .in('user_id', userIds)
          .not('user_id', 'is', null);

        const profileMap = new Map((profiles || []).map(p => [p.id, p.email]));
        const employeeMap = new Map((employees || []).map(e => [e.user_id, e.full_name]));

        setMemberships(members.map((m: any) => ({
          ...m,
          user: {
            email: profileMap.get(m.user_id) || `Usuario ${m.user_id.substring(0, 8)}`,
            full_name: employeeMap.get(m.user_id)
          }
        })));
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
      
      // Buscar en profiles por email
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', `%${searchTerm}%`)
        .limit(10);

      if (profilesError) {
        console.error('Error searching profiles:', profilesError);
      }

      // Buscar en employees por full_name (solo si tienen user_id)
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('user_id, full_name, email')
        .ilike('full_name', `%${searchTerm}%`)
        .not('user_id', 'is', null)
        .limit(10);

      if (employeesError) {
        console.error('Error searching employees:', employeesError);
      }

      // Combinar resultados
      const userMap = new Map<string, SearchedUser>();
      
      (profiles || []).forEach((p: any) => {
        if (!userMap.has(p.id)) {
          userMap.set(p.id, {
            id: p.id,
            email: p.email || '',
            full_name: undefined
          });
        }
      });

      (employees || []).forEach((e: any) => {
        if (e.user_id && e.full_name) {
          const existing = userMap.get(e.user_id);
          if (existing) {
            existing.full_name = e.full_name;
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
                    {memberships.map((membership) => (
                      <div key={membership.user_id} className="flex items-center justify-between p-4 border border-border/60 dark:border-border/40 rounded-2xl bg-card">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {membership.user?.full_name || membership.user?.email || `Usuario ${membership.user_id.substring(0, 8)}`}
                            </p>
                            {membership.user?.full_name && membership.user?.email && (
                              <p className="text-sm text-muted-foreground">{membership.user.email}</p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
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
                          {/* Botón para quitar miembro (solo para admin/owner, no el usuario actual) */}
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
                    ))}

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
    </PageContainer>
  );
};

export default OrganizationView;
