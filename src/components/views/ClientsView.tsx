import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useClients } from '../../hooks/useClients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { EmptyStateClients } from '../empty-states/EmptyStateClients';
import { toast } from 'sonner';
import { Trash2, Edit3, Plus } from 'lucide-react';

const ClientsView: React.FC = () => {
  const { currentOrgId } = useAuth();
  const { clients, loading, createClient, updateClient, deleteClient } = useClients(currentOrgId ?? undefined);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
  });

  const handleSave = async () => {
    try {
      if (!formData.full_name.trim()) {
        toast.error('El nombre del cliente es requerido');
        return;
      }

      if (!currentOrgId) {
        toast.error('No se puede crear cliente: organización no encontrada');
        return;
      }

      if (editingClient) {
        await updateClient(editingClient.id, formData);
        toast.success('Cliente actualizado correctamente');
      } else {
        await createClient({
          ...formData,
          org_id: currentOrgId,
        } as any);
        toast.success('Cliente creado correctamente');
      }

      setDialogOpen(false);
      setEditingClient(null);
      setFormData({ full_name: '', phone: '', email: '' });
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Error al guardar el cliente');
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
      toast.success('Cliente eliminado correctamente');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Error al eliminar el cliente');
    }
  };

  const handleNew = () => {
    setEditingClient(null);
    setFormData({ full_name: '', phone: '', email: '' });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Cargando clientes...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestión de Clientes</CardTitle>
              <CardDescription>
                {clients.length} {clients.length === 1 ? 'cliente registrado' : 'clientes registrados'}
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNew}>
                  <Plus className="w-4 h-4 mr-2" />
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
        </CardHeader>

        <CardContent>
          {clients.length === 0 ? (
            <EmptyStateClients
              onAddClient={handleNew}
              onImportClients={() => toast.info('Importar clientes próximamente')}
              onSyncContacts={() => toast.info('Sincronizar contactos próximamente')}
            />
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{client.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.phone && <span>{client.phone}</span>}
                      {client.phone && client.email && <span> • </span>}
                      {client.email && <span>{client.email}</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(client)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(client.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsView;
