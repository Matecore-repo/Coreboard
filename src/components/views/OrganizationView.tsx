// ============================================================================
// COMPONENTE: OrganizationView (REFACTORIZADO - Tokens de Registro)
// ============================================================================
// Gestión completa de organizaciones: ver, renombrar, crear tokens de registro y eliminar
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
import { Copy, Trash2, Pencil, Save, X, Users, Mail, Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useInvitations, Invitation } from '../../hooks/useInvitations';

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
  role: 'admin' | 'owner' | 'employee';
  is_primary: boolean;
  user?: {
    email: string;
    full_name?: string;
  };
}


interface OrganizationViewProps {
  isDemo?: boolean;
}

const OrganizationView: React.FC<OrganizationViewProps> = ({ isDemo = false }) => {
  const { user, currentRole, currentOrgId } = useAuth() as any;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Estados de edición
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgTaxId, setOrgTaxId] = useState('');

  // Hook de invitaciones
  const { invitations, loading: loadingInvitations, loadInvitations, createInvitation, cancelInvitation } = useInvitations(currentOrgId);

  // Estados para invitaciones por email
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'employee' | 'admin' | 'viewer'>('employee');
  const [inviting, setInviting] = useState(false);

  // Estado para eliminar organización
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Refs para evitar cargas múltiples
  const loadingRef = useRef(false);
  const loadedOrgIdRef = useRef<string | null>(null);
  const previousOrgIdRef = useRef<string | null>(null);

  const isAdmin = currentRole === 'admin';
  const isOwner = currentRole === 'owner';
  const isEmployee = currentRole === 'employee';
  const canEdit = isAdmin || isOwner;
  const canInvite = isAdmin || isOwner; // Reemplaza canCreateTokens
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
        .select('user_id, role, is_primary')
        .eq('org_id', orgId)
        .limit(100);

      if (error) {
        console.error('Error loading memberships:', error);
        return;
      }

      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p.email]));

        setMemberships(members.map((m: any) => ({
          ...m,
          user: {
            email: profileMap.get(m.user_id) || `Usuario ${m.user_id.substring(0, 8)}`,
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

      // Cargas secundarias en paralelo con tolerancia a fallos
      const parallelLoads: Promise<any>[] = [loadMemberships(currentOrgId)];
      if (canInvite) {
        // Cargar invitaciones usando el hook
        parallelLoads.push(loadInvitations());
      }

      const results = await Promise.allSettled(parallelLoads);
      results.forEach((r) => {
        if (r.status === 'rejected') {
          console.warn('Carga parcial fallida en Organización:', r.reason);
        }
      });

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
  }, [currentOrgId, loadMemberships, loadInvitations, canInvite]);

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
        user_id: user?.id || 'demo-user',
        role: 'owner',
        is_primary: true,
        user: { email: user?.email || 'demo@coreboard.local' }
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

  const handleCreateInvitation = async () => {
    if (!currentOrgId || !canInvite || !inviteEmail.trim()) {
      toast.error('Ingresa un email válido');
      return;
    }

    try {
      setInviting(true);

      if (isDemo) {
        // Modo demo: simular creación
        toast.success('Invitación creada (modo demo)');
        setInviteEmail('');
        setInviteRole('employee');
        setInviteDialogOpen(false);
      } else {
        // Crear invitación real
        const token = await createInvitation(
          inviteEmail.trim(),
          inviteRole,
          7 // 7 días de expiración
        );

        if (token) {
          // El token se devuelve para enviarlo por email (vía n8n)
          // Aquí solo mostramos éxito, el envío de email se hace externamente
          toast.success(`Invitación creada para ${inviteEmail}. El link de invitación se enviará por email.`);
          setInviteEmail('');
          setInviteRole('employee');
          setInviteDialogOpen(false);
        }
      }
    } catch (error: any) {
      console.error('Error creando invitación:', error);
      toast.error(error.message || 'Error al crear la invitación');
    } finally {
      setInviting(false);
    }
  };

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.used_at) {
      return { label: 'Aceptada', icon: CheckCircle2, variant: 'secondary' as const };
    }
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      return { label: 'Expirada', icon: XCircle, variant: 'destructive' as const };
    }
    return { label: 'Pendiente', icon: Clock, variant: 'default' as const };
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
            {canInvite && (
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Invitar por Email
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invitar Miembro</DialogTitle>
                    <DialogDescription>
                      Envía una invitación por email. El invitado recibirá un link para aceptar la invitación.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="invitado@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        El invitado recibirá un link de invitación en este email.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="invite-role">Rol</Label>
                      <Select value={inviteRole} onValueChange={(value: 'employee' | 'admin' | 'viewer') => setInviteRole(value)}>
                        <SelectTrigger id="invite-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Empleado</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="viewer">Solo Lectura</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-1">
                        El invitado tendrá este rol en la organización.
                      </p>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setInviteDialogOpen(false);
                          setInviteEmail('');
                          setInviteRole('employee');
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateInvitation} disabled={inviting || !inviteEmail.trim()}>
                        {inviting ? 'Enviando...' : 'Enviar Invitación'}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            )}

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
            {canInvite && (
              <TabsTrigger value="invitations">
                Invitaciones {loadingInvitations ? '(...)' : `(${invitations.length})`}
              </TabsTrigger>
            )}
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
                <CardTitle>Miembros de la Organización</CardTitle>
                <CardDescription>
                  {memberships.length} miembro{memberships.length !== 1 ? 's' : ''} en total
                </CardDescription>
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
                            <p>{membership.user?.email || `Usuario ${membership.user_id.substring(0, 8)}`}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={
                                membership.role === 'admin' ? 'default' :
                                membership.role === 'owner' ? 'secondary' : 'outline'
                              }>
                                {membership.role}
                              </Badge>
                              {membership.is_primary && (
                                <Badge variant="outline">Principal</Badge>
                              )}
                            </div>
                          </div>
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

          {/* Tab: Invitaciones */}
          {canInvite && (
            <TabsContent value="invitations" className="space-y-4">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Invitaciones Enviadas</CardTitle>
                  <CardDescription>
                    Invitaciones por email enviadas a miembros potenciales
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingInvitations ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invitations.map((invitation) => {
                        const status = getInvitationStatus(invitation);
                        const StatusIcon = status.icon;
                        return (
                          <div key={invitation.id} className="flex items-center justify-between p-4 border border-border/60 dark:border-border/40 rounded-2xl bg-card">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <StatusIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium">{invitation.email || 'Sin email'}</p>
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">{invitation.role}</Badge>
                                  <span>Expira: {new Date(invitation.expires_at).toLocaleDateString('es-AR')}</span>
                                  {invitation.used_at && (
                                    <span>• Aceptada: {new Date(invitation.used_at).toLocaleDateString('es-AR')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {!invitation.used_at && status.label === 'Pendiente' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelInvitation(invitation.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}

                      {invitations.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">
                          No hay invitaciones enviadas
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </Section>

      {/* Dialog de confirmación para eliminar */}
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
    </PageContainer>
  );
};

export default OrganizationView;
