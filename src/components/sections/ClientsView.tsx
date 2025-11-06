import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useClients } from '../../hooks/useClients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { EmptyStateClients } from '../empty-states/EmptyStateClients';
import { toastSuccess, toastError, toastInfo } from '../../lib/toast';
import { Trash2, Edit3, Plus } from 'lucide-react';
import { EmptyState } from '../ui/empty-state';
import { Building2 } from 'lucide-react';
import { PageContainer } from '../layout/PageContainer';
import { Section } from '../layout/Section';
import { SalonCarousel } from '../SalonCarousel';
import type { Salon } from '../../types/salon';

interface ClientsViewProps {
  salons?: Salon[];
  selectedSalon?: string | null;
  onSelectSalon?: (salonId: string, salonName: string) => void;
}

const ClientsView: React.FC<ClientsViewProps> = ({ salons = [], selectedSalon = null, onSelectSalon }) => {
  const { currentOrgId, isDemo } = useAuth();
  const { clients, loading: hooksLoading, error: clientsError, createClient, updateClient, deleteClient } = useClients(currentOrgId ?? undefined);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
  });
  const [displayLoading, setDisplayLoading] = useState(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

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

  const handleSave = async () => {
    try {
      if (!formData.full_name.trim()) {
        toastError('El nombre del cliente es requerido');
        return;
      }

      if (!currentOrgId) {
        toastError('No se puede crear cliente: organización no encontrada');
        return;
      }

      if (editingClient) {
        await updateClient(editingClient.id, formData);
        toastSuccess('Cliente actualizado correctamente');
      } else {
        await createClient({
          ...formData,
          org_id: currentOrgId,
        } as any);
        toastSuccess('Cliente creado correctamente');
      }

      setDialogOpen(false);
      setEditingClient(null);
      setFormData({ full_name: '', phone: '', email: '' });
    } catch (error) {
      console.error('Error saving client:', error);
      toastError('Error al guardar el cliente');
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

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;

    try {
      await deleteClient(id);
      toastSuccess('Cliente eliminado correctamente');
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
      {salons.length > 0 && (
        <section className="mb-4 p-4 sm:p-6" role="region" aria-label="Selector de salón para clientes">
          <h2 className="mb-4 text-xl md:text-2xl font-semibold">Seleccionar clientes</h2>
          <div>
            <SalonCarousel 
              salons={salons}
              selectedSalon={selectedSalon}
              onSelectSalon={onSelectSalon || (() => {})}
            />
          </div>
        </section>
      )}
      <section className="mt-4" role="region" aria-label="Gestión de clientes">
        <Section
          title="Gestión de Clientes"
          description={`${clients.length} ${clients.length === 1 ? 'cliente registrado' : 'clientes registrados'}`}
          action={
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
        }
      >
      {clients.length === 0 ? (
        <EmptyStateClients
          onAddClient={handleNew}
          onImportClients={() => toastInfo('Importar clientes próximamente')}
          onSyncContacts={() => toastInfo('Sincronizar contactos próximamente')}
        />
      ) : (
        <div className="space-y-3" role="list" aria-label={`Lista de ${clients.length} clientes`}>
          {clients.map((client) => (
            <Card key={client.id} role="listitem" aria-label={`Cliente: ${client.full_name}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" aria-label={`Nombre: ${client.full_name}`}>
                      {client.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate" aria-label={`Contacto: ${client.phone || ''} ${client.email || ''}`}>
                      {client.phone && <span>{client.phone}</span>}
                      {client.phone && client.email && <span> • </span>}
                      {client.email && <span>{client.email}</span>}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4 flex-shrink-0" role="group" aria-label={`Acciones para ${client.full_name}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(client)}
                      aria-label={`Editar cliente ${client.full_name}`}
                      data-action="edit-client"
                      data-client-id={client.id}
                    >
                      <Edit3 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(client.id)}
                      aria-label={`Eliminar cliente ${client.full_name}`}
                      data-action="delete-client"
                      data-client-id={client.id}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </Section>
      </section>
    </PageContainer>
  );
};

export default ClientsView;
