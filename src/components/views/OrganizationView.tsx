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
import { Copy, Trash2, Pencil, Save, X, Users, Mail } from 'lucide-react';

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

interface RegistrationToken {
  id: string;
  role: 'admin' | 'owner' | 'employee';
  expires_at: string;
  used_at?: string;
  created_at: string;
}

interface OrganizationViewProps {
  isDemo?: boolean;
}

const OrganizationView: React.FC<OrganizationViewProps> = ({ isDemo = false }) => {
  const { user, currentRole, currentOrgId } = useAuth() as any;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [tokens, setTokens] = useState<RegistrationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  
  // Estados de edición
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgTaxId, setOrgTaxId] = useState('');

  // Estados para tokens de registro
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenRole, setTokenRole] = useState<'employee'>('employee');
  const [creatingToken, setCreatingToken] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Estado para eliminar organización
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Refs para evitar cargas múltiples
  const loadingRef = useRef(false);
  const loadedOrgIdRef = useRef<string | null>(null);

  const isAdmin = currentRole === 'admin';
  const isOwner = currentRole === 'owner';
  const isEmployee = currentRole === 'employee';
  const canEdit = isAdmin || isOwner;
  const canCreateTokens = isAdmin || isOwner;
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

  const loadRegistrationTokens = useCallback(async (orgId: string) => {
    setLoadingTokens(true);
    try {
      const { data: inviteTokens, error } = await supabase
        .from('invitations')
        .select('id, role, expires_at, used_at, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading registration tokens:', error);
        return;
      }

      // Mapear invitations a RegistrationToken
      setTokens((inviteTokens || []).map(inv => ({
        id: inv.id,
        role: inv.role as 'admin' | 'owner' | 'employee',
        expires_at: inv.expires_at,
        used_at: inv.used_at || undefined,
        created_at: inv.created_at
      })));
    } catch (error) {
      console.error('Error loading registration tokens:', error);
    } finally {
      setLoadingTokens(false);
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
      const userCanCreateTokens = currentRole === 'admin' || currentRole === 'owner';
      const parallelLoads: Promise<any>[] = [loadMemberships(currentOrgId)];
      if (userCanCreateTokens) parallelLoads.push(loadRegistrationTokens(currentOrgId));

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
  }, [currentOrgId, loadMemberships, loadRegistrationTokens, currentRole]);

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
      setTokens([]);
      setLoading(false);
      loadedOrgIdRef.current = 'demo-org-123';
      return;
    }

    if (currentOrgId && loadedOrgIdRef.current !== currentOrgId && !loadingRef.current) {
      loadOrganizationData();
    } else if (!currentOrgId) {
      setLoading(false);
      setOrganization(null);
      loadedOrgIdRef.current = null;
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

  const createRegistrationToken = async () => {
    if (!currentOrgId || !canCreateTokens) return;

    try {
      setCreatingToken(true);

      // Generar token seguro para registro
      const token = `REG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;

      if (isDemo) {
        const mockToken: RegistrationToken = {
          id: `mock-${Date.now()}`,
          role: tokenRole,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        };

        setTokens(prev => [mockToken, ...prev]);
        setGeneratedToken(token);
        toast.success('Token de registro creado (modo demo)');
      } else {
        const { data, error } = await supabase.rpc('create_invitation', {
          p_organization_id: currentOrgId,
          p_email: null, // No requiere email para tokens de registro
          p_role: tokenRole,
          p_token: token,
          p_expires_days: 7
        });

        if (error) {
          console.error('RPC error:', error);
          throw error;
        }

        await loadRegistrationTokens(currentOrgId);
        setGeneratedToken(token);
        toast.success('Token de registro creado exitosamente');
      }

      setTokenRole('employee');
    } catch (error: any) {
      console.error('Error creating registration token:', error);
      toast.error(error.message || 'Error al crear el token de registro');
    } finally {
      setCreatingToken(false);
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

  const copyToClipboard = async (text: string) => {
    try {
      // Verificar si navigator.clipboard está disponible (requiere HTTPS o localhost)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success('Copiado al portapapeles');
      } else {
        // Método de fallback para navegadores sin Clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            toast.success('Copiado al portapapeles');
          } else {
            throw new Error('Fallback copy failed');
          }
        } catch (err) {
          // Si falla, mostrar el token para que el usuario lo copie manualmente
          toast.error('No se pudo copiar automáticamente. El token se muestra a continuación.');
          alert(`Token: ${text}\n\nCopia este token manualmente.`);
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error: any) {
      console.error('Error copying to clipboard:', error);
      toast.error('No se pudo copiar al portapapeles. Intenta copiarlo manualmente.');
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
            {canCreateTokens && (
              <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    Crear Token de Registro
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Token de Registro</DialogTitle>
                    <DialogDescription>
                      Genera un token que permite crear una cuenta directamente como parte de esta organización.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="token-role">Rol</Label>
                      <Select value={tokenRole} onValueChange={(value: 'employee') => setTokenRole(value)}>
                        <SelectTrigger id="token-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Empleado</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-1">
                        Los usuarios que se registren con este token tendrán rol de empleado.
                      </p>
                    </div>

                    {generatedToken && (
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Token Generado</h4>
                        <div className="flex items-center space-x-2">
                          <code className="flex-1 p-2 bg-white dark:bg-gray-900 border rounded text-sm font-mono break-all">
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
                        <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                          Comparte este token con quien quieres que se registre. Al crear su cuenta, deberá ingresar este token en el campo "Token secreto".
                        </p>
                      </div>
                    )}

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTokenDialogOpen(false);
                          setGeneratedToken(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={createRegistrationToken} disabled={creatingToken}>
                        {creatingToken ? 'Creando...' : 'Crear Token'}
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
            {canCreateTokens && (
              <TabsTrigger value="tokens">
                Tokens de Registro {loadingTokens ? '(...)' : `(${tokens.length})`}
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

          {/* Tab: Tokens de Registro */}
          {canCreateTokens && (
            <TabsContent value="tokens" className="space-y-4">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Tokens de Registro</CardTitle>
                  <CardDescription>
                    Tokens que permiten crear cuentas directamente como parte de esta organización
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingTokens ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tokens.map((token) => (
                        <div key={token.id} className="flex items-center justify-between p-4 border border-border/60 dark:border-border/40 rounded-2xl bg-card">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <Mail className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p>Token de {token.role}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline">{token.role}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  Expira: {new Date(token.expires_at).toLocaleDateString()}
                                </span>
                                {token.used_at && (
                                  <Badge variant="secondary">Usado</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {tokens.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">
                          No hay tokens de registro creados
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
