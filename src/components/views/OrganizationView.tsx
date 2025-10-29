import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Users, UserPlus, Settings, Copy, Mail, Shield, Building2 } from 'lucide-react';
import { generateDemoOrganizationData } from '../../lib/demoData';

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
  user: {
    email: string;
  };
}

interface Invitation {
  id: string;
  email?: string;
  role: 'admin' | 'owner' | 'employee';
  expires_at: string;
  used_at?: string;
  created_at: string;
}

interface OrganizationViewProps {
  isDemo?: boolean;
}

const OrganizationView: React.FC<OrganizationViewProps> = ({ isDemo = false }) => {
  const { user, currentRole, currentOrgId } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgTaxId, setOrgTaxId] = useState('');

  // Estado para crear invitaciones
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'employee'>('employee');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const isAdmin = currentRole === 'admin';
  const isOwner = currentRole === 'owner';
  const canEdit = isAdmin || isOwner;
  const canCreateInvites = isAdmin || isOwner;

  useEffect(() => {
    if (isDemo) {
      // En modo demo, no cargar desde BD
      setLoading(false);
      return;
    }
    if (currentOrgId) {
      loadOrganizationData();
    } else if (isAdmin) {
      // Admin puede ver todas las orgs, pero por ahora mostramos mensaje
      setLoading(false);
    }
  }, [currentOrgId, isAdmin, isDemo]);

  const loadDemoData = () => {
    // Organización mockup
    const demoOrg: Organization = {
      id: 'demo-org-123',
      name: 'Salón Demo - COREBOARD',
      tax_id: '00-000000-0',
      created_at: new Date().toISOString()
    };

    // Miembros mockup
    const demoMembers: Membership[] = [
      {
        id: 'demo-member-1',
        user_id: user?.id || 'demo-user',
        role: 'owner',
        is_primary: true,
        user: { email: user?.email || 'demo@coreboard.local' }
      },
      {
        id: 'demo-member-2',
        user_id: 'emp-123',
        role: 'employee',
        is_primary: false,
        user: { email: 'empleado@salon.com' }
      },
      {
        id: 'demo-member-3',
        user_id: 'emp-456',
        role: 'employee',
        is_primary: false,
        user: { email: 'barbero@salon.com' }
      }
    ];

    // Invitaciones mockup
    const demoInvites: Invitation[] = [
      {
        id: 'demo-invite-1',
        email: 'nuevo.empleado@salon.com',
        role: 'employee',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: 'demo-invite-2',
        email: 'gerente@salon.com',
        role: 'owner',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      }
    ];

    setOrganization(demoOrg);
    setOrgName(demoOrg.name);
    setOrgTaxId(demoOrg.tax_id || '');
    setMemberships(demoMembers);
    setInvitations(demoInvites);
    setLoading(false);
    toast.success('✨ Datos demo cargados exitosamente');
  };

  // Exponer loadDemoData globalmente para que App.tsx pueda llamarla
  useEffect(() => {
    if (isDemo && typeof window !== 'undefined') {
      (window as any).__loadOrganizationDemoData = loadDemoData;
    }
  }, [loadDemoData, isDemo]);

  const loadOrganizationData = async () => {
    if (!currentOrgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          await loadOrgData(currentOrgId);
          break;
        } catch (error) {
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500 * retries));
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error loading organization data:', error);
      toast.error('Error al cargar datos de la organización. Intenta refrescar.');
      // Cargar datos parciales para que al menos se vea algo
      try {
        const { data: org } = await supabase
          .from('orgs')
          .select('*')
          .eq('id', currentOrgId)
          .single();
        if (org) {
          setOrganization(org);
          setOrgName(org.name);
          setOrgTaxId(org.tax_id || '');
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadOrgData = async (orgId: string) => {
    // Cargar organización
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgError) throw orgError;
    setOrganization(org);
    setOrgName(org.name);
    setOrgTaxId(org.tax_id || '');

    // Cargar miembros (con fallback si falla por RLS)
    const { data: members, error: membersError } = await supabase
      .from('memberships')
      .select('user_id, role, is_primary')
      .eq('org_id', orgId);

    let membershipsWithEmails: Membership[] = [];
    if (members && members.length > 0) {
      membershipsWithEmails = await Promise.all(
        members.map(async (member) => {
          return {
            ...member,
            user: { email: `Usuario ${member.user_id.substring(0, 8)}` }
          };
        })
      );
    } else if (membersError && (membersError as any).code === '42501') {
      // Error 42501 = permission denied (RLS), mostrar mensaje informativo
      console.warn('No tienes permiso para ver los miembros de esta organización');
      toast.info('No tienes permiso para ver los miembros');
    }

    setMemberships(membershipsWithEmails);

    // Cargar invitaciones activas (solo si puede verlas)
    if (canCreateInvites) {
      try {
        const now = new Date().toISOString();
        const { data: invites, error: invitesError } = await supabase
          .from('invitations')
          .select('*')
          .eq('organization_id', orgId)
          .is('used_at', null)
          .gt('expires_at', now)
          .order('created_at', { ascending: false });

        if (invitesError) {
          console.warn('Error cargando invitaciones:', invitesError);
          setInvitations([]);
        } else {
          setInvitations(invites || []);
        }
      } catch (err) {
        console.warn('Exception loading invitations:', err);
        setInvitations([]);
      }
    } else {
      setInvitations([]);
    }
  };

  const updateOrganization = async () => {
    if (!organization || !canEdit) return;

    try {
      const { error } = await supabase
        .from('orgs')
        .update({
          name: orgName,
          tax_id: orgTaxId || null
        })
        .eq('id', organization.id);

      if (error) throw error;

      setOrganization({ ...organization, name: orgName, tax_id: orgTaxId });
      setEditingOrg(false);
      toast.success('Organización actualizada');
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Error al actualizar la organización');
    }
  };

  const createInvitation = async () => {
    if (!currentOrgId || !canCreateInvites) return;

    try {
      setCreatingInvite(true);

      // Generar token único
      const token = `INVITE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (isDemo) {
        // En modo demo, crear invitación mockeada
        const mockInvitation: Invitation = {
          id: `mock-${Date.now()}`,
          email: inviteEmail || undefined,
          role: inviteRole,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        };

        // Añadir a la lista de invitaciones
        setInvitations([mockInvitation, ...invitations]);
        
        // Mostrar token generado
        setGeneratedToken(token);
        toast.success('Invitación creada (modo demo)');
      } else {
        // Usar RPC para crear invitación con hash
        const { data, error } = await supabase.rpc('create_invitation', {
          p_organization_id: currentOrgId,
          p_email: inviteEmail || null,
          p_role: inviteRole,
          p_token: token,
          p_expires_days: 7
        });

        if (error) throw error;

        // Recargar invitaciones
        await loadOrgData(currentOrgId);

        // Mostrar token generado
        setGeneratedToken(token);
        toast.success('Invitación creada exitosamente');
      }

      setInviteEmail('');
      setInviteRole('employee');

    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error('Error al crear la invitación');
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAdmin && !currentOrgId) {
    return (
      <div className="w-full min-h-screen bg-background animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Selecciona una Organización</CardTitle>
              <CardDescription>
                Como administrador, puedes gestionar todas las organizaciones del sistema.
                Selecciona una organización para ver sus detalles y miembros.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidad completa próximamente. Por ahora, únete a una organización específica.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="w-full min-h-screen bg-background animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          <h1 className="text-2xl font-bold">Organización</h1>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No tienes una organización asignada.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-6 w-6 text-primary flex-shrink-0" />
            <h1 className="text-2xl font-bold truncate">Organización</h1>
          </div>

        {canCreateInvites && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invitar Miembro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Invitación</DialogTitle>
                <DialogDescription>
                  Crea un token de invitación para agregar un nuevo miembro a la organización.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="invite-email">Email (opcional)</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Si no especificas email, cualquiera puede usar el token.
                  </p>
                </div>

                <div>
                  <Label htmlFor="invite-role">Rol</Label>
                  <Select value={inviteRole} onValueChange={(value: 'owner' | 'employee') => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Empleado</SelectItem>
                      <SelectItem value="owner">Propietario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {generatedToken && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Token Generado</h4>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-2 bg-white border rounded text-sm font-mono">
                        {generatedToken}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedToken)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-green-600 mt-2">
                      Comparte este token con la persona que quieres invitar.
                      Expira en 7 días.
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setInviteDialogOpen(false);
                      setGeneratedToken(null);
                      setInviteEmail('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={createInvitation} disabled={creatingInvite}>
                    {creatingInvite ? 'Creando...' : 'Crear Invitación'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="members">Miembros</TabsTrigger>
          {canCreateInvites && <TabsTrigger value="invitations">Invitaciones</TabsTrigger>}
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Información de la Organización</CardTitle>
                  <CardDescription>
                    Gestiona la información básica de tu organización
                  </CardDescription>
                </div>
                {canEdit && !editingOrg && (
                  <Button variant="outline" onClick={() => setEditingOrg(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingOrg ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="org-name">Nombre de la Organización</Label>
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
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setEditingOrg(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={updateOrganization}>
                      Guardar Cambios
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Nombre</Label>
                    <p className="text-lg">{organization.name}</p>
                  </div>
                  {organization.tax_id && (
                    <div>
                      <Label className="text-sm font-medium">CUIT/CUIL</Label>
                      <p>{organization.tax_id}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Creada</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(organization.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Miembros de la Organización</CardTitle>
              <CardDescription>
                {memberships.length} miembro{memberships.length !== 1 ? 's' : ''} en total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {memberships.map((membership) => (
                  <div key={membership.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{membership.user.email}</p>
                        <div className="flex items-center space-x-2">
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
            </CardContent>
          </Card>
        </TabsContent>

        {canCreateInvites && (
          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invitaciones Pendientes</CardTitle>
                <CardDescription>
                  Gestiona las invitaciones enviadas a nuevos miembros
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {invitation.email || 'Sin email específico'}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{invitation.role}</Badge>
                            <span className="text-sm text-muted-foreground">
                              Expira: {new Date(invitation.expires_at).toLocaleDateString()}
                            </span>
                            {invitation.used_at && (
                              <Badge variant="secondary">Usada</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {invitations.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No hay invitaciones pendientes
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      </div>
    </div>
  );
};

export default OrganizationView;