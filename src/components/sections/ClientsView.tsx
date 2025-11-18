import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useClients } from '../../hooks/useClients';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { EmptyStateClients } from '../empty-states/EmptyStateClients';
import { toastSuccess, toastError, toastInfo } from '../../lib/toast';
import { Trash2, Edit3, Plus, User, Phone, Mail, Search, Sparkles } from 'lucide-react';
import { EmptyState } from '../ui/empty-state';
import { Building2 } from 'lucide-react';
import { PageContainer } from '../layout/PageContainer';
import { Section } from '../layout/Section';
import { ShortcutBanner } from '../ShortcutBanner';
import { ConfirmDialog } from '../ui/ConfirmDialog';
interface ClientsViewProps {}

const ClientsView: React.FC<ClientsViewProps> = () => {
  const { currentOrgId, isDemo } = useAuth();
  const { clients, loading: hooksLoading, error: clientsError, createClient, updateClient, deleteClient } = useClients(currentOrgId ?? undefined);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLoading, setDisplayLoading] = useState(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, []);

  // Mostrar loading pero con timeout de 5 segundos
  useEffect(() => {
    if (hooksLoading) {
      setDisplayLoading(true);
      loadTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          console.warn('Clients loading timeout');
          setDisplayLoading(false);
        }
      }, 5000);
    } else {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setDisplayLoading(false);
    }

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [hooksLoading]);

  // Mostrar error si existe
  useEffect(() => {
    if (clientsError) {
      console.error('Error loading clients:', clientsError);
      toastError('Error al cargar clientes');
    }
  }, [clientsError]);

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return true; // Email es opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone.trim()) return true; // Teléfono es opcional
    // Permitir números, espacios, guiones, paréntesis y el símbolo +
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
  };

  const handleSave = async () => {
    try {
      // Validar nombre requerido
      if (!formData.full_name.trim()) {
        toastError('El nombre del cliente es requerido');
        return;
      }

      // Validar formato de nombre (debe tener al menos una letra)
      if (!/\p{L}/u.test(formData.full_name.trim())) {
        toastError('El nombre del cliente debe incluir al menos una letra');
        return;
      }

      // Validar formato de email si se proporciona
      if (formData.email && !validateEmail(formData.email)) {
        toastError('El email no tiene un formato válido');
        return;
      }

      // Validar formato de teléfono si se proporciona
      if (formData.phone && !validatePhone(formData.phone)) {
        toastError('El teléfono no tiene un formato válido (mínimo 7 dígitos)');
        return;
      }

      if (!currentOrgId) {
        toastError('No se puede crear cliente: organización no encontrada');
        return;
      }

      // Limpiar espacios en blanco
      const cleanedData = {
        full_name: formData.full_name.trim(),
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
      };

      if (editingClient) {
        await updateClient(editingClient.id, cleanedData);
        toastSuccess('Cliente actualizado correctamente');
      } else {
        await createClient({
          ...cleanedData,
          org_id: currentOrgId,
        } as any);
        toastSuccess('Cliente creado correctamente');
      }

      setDialogOpen(false);
      setEditingClient(null);
      setFormData({ full_name: '', phone: '', email: '' });
    } catch (error: any) {
      console.error('Error saving client:', error);
      const errorMessage = error?.message || 'Error al guardar el cliente';
      toastError(errorMessage);
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name || '',
      phone: client.phone || '',
      email: client.email || '',
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setClientToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    try {
      await deleteClient(clientToDelete);
      toastSuccess('Cliente eliminado correctamente');
      setClientToDelete(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      toastError('Error al eliminar el cliente');
    }
  };

  const handleNew = () => {
    setEditingClient(null);
    setFormData({ full_name: '', phone: '', email: '' });
    setDialogOpen(true);
  };

  // Filtrar clientes según el término de búsqueda
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }
    const query = searchQuery.toLowerCase();
    return clients.filter(client => 
      client.full_name.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.includes(query)
    );
  }, [clients, searchQuery]);

  if (!currentOrgId && !isDemo) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building2}
          title="Seleccioná una organización"
          description="Para gestionar clientes necesitás elegir o crear una organización."
          actionLabel="Crear organización"
          onAction={() => toastInfo('Creación de organización próximamente')}
        />
      </div>
    );
  }

  if (displayLoading && hooksLoading) {
    return <div className="p-6 text-center text-muted-foreground">Cargando clientes...</div>;
  }

  if (clientsError && !hooksLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error al cargar clientes: {clientsError.message}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageContainer>
      <ShortcutBanner
        icon={<Sparkles className="size-4 text-primary" aria-hidden="true" />}
        message={(
          <>
            Usa <span className="font-semibold">Ctrl + K</span> para abrir la paleta de comandos o <span className="font-semibold">Ctrl + ←/→</span> para alternar vistas.
          </>
        )}
      />
      <section className="mt-4" role="region" aria-label="Gestión de clientes">
        <Section
          title="Gestión de Clientes"
          description={`${filteredClients.length} ${filteredClients.length === 1 ? 'cliente' : 'clientes'}${searchQuery ? ' encontrado' + (filteredClients.length === 1 ? '' : 's') : ' registrado' + (clients.length === 1 ? '' : 's')}${clients.length !== filteredClients.length ? ` (de ${clients.length} total)` : ''}`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9"
                  aria-label="Buscar clientes"
                  data-field="search-clients"
                />
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={handleNew}
                    aria-label="Crear nuevo cliente"
                    data-action="new-client"
                  >
                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                    Nuevo Cliente
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
                  <DialogDescription>
                    {editingClient ? 'Actualiza los datos del cliente' : 'Crea un nuevo cliente'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      placeholder="Nombre completo"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      placeholder="+54 9 11 1234-5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="cliente@mail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    {editingClient ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
        }
      >
      {clients.length === 0 ? (
        <EmptyStateClients
          onAddClient={handleNew}
          onImportClients={() => toastInfo('Importar clientes próximamente')}
          onSyncContacts={() => toastInfo('Sincronizar contactos próximamente')}
        />
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No se encontraron clientes que coincidan con "{searchQuery}"</p>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label={`Lista de ${filteredClients.length} clientes`}>
          {filteredClients.map((client) => (
            <article 
              key={client.id}
              className="bg-card border rounded-2xl p-3 hover:shadow-md transition-all cursor-pointer border-border"
              role="listitem"
              aria-label={`Cliente: ${client.full_name}`}
              data-client-id={client.id}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0 flex-1" role="group" aria-label="Información del cliente">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 max-w-full">
                      <p className="font-medium truncate" aria-label={`Nombre: ${client.full_name}`}>
                        {client.full_name}
                      </p>
                      {(client.phone || client.email) && (
                        <p className="text-sm text-muted-foreground truncate" aria-label={`Contacto: ${client.phone || ''} ${client.email || ''}`}>
                          {client.phone && client.email 
                            ? `${client.phone} • ${client.email}`
                            : client.phone || client.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {client.phone && (
                    <div className="hidden lg:flex items-center gap-2 min-w-0 max-w-[180px] flex-shrink-0" aria-label={`Teléfono: ${client.phone}`}>
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground truncate text-sm">{client.phone}</span>
                    </div>
                  )}

                  {client.email && (
                    <div className="hidden xl:flex items-center gap-2 min-w-0 max-w-[220px] flex-shrink-0" aria-label={`Email: ${client.email}`}>
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground truncate text-sm">{client.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-auto" role="group" aria-label={`Acciones para ${client.full_name}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(client);
                    }}
                    aria-label={`Editar cliente ${client.full_name}`}
                    data-action="edit-client"
                    data-client-id={client.id}
                  >
                    <Edit3 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(client.id);
                    }}
                    aria-label={`Eliminar cliente ${client.full_name}`}
                    data-action="delete-client"
                    data-client-id={client.id}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      </Section>
      </section>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="¿Estás seguro?"
        description="¿Estás seguro de que quieres eliminar este cliente? Esta acción no se puede deshacer."
        confirmLabel="Continuar"
        cancelLabel="Cancelar"
        variant="destructive"
      />
    </PageContainer>
  );
};

export default ClientsView;
