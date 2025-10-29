import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployees, CreateEmployeeData } from '../../hooks/useEmployees';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { EmptyStateEmployees } from '../empty-states/EmptyStateEmployees';
import { toast } from 'sonner';
import { Users, UserPlus, Mail, Phone, DollarSign, Edit3, Trash2, Plus } from 'lucide-react';

const EmployeesView: React.FC = () => {
  const { currentOrgId } = useAuth();
  const { employees, isLoading, createEmployee, updateEmployee, deleteEmployee } = useEmployees(currentOrgId ?? undefined);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    default_commission_pct: 50.0,
  });

  const handleSave = async () => {
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, formData);
        toast.success('Empleado actualizado correctamente');
      } else {
        if (!currentOrgId) {
          toast.error('No se puede crear empleado: organización no encontrada');
          return;
        }

        await createEmployee({
          ...formData,
          org_id: currentOrgId,
          user_id: null, // Por ahora no asignamos usuarios
          active: true,
        });
        toast.success('Empleado creado correctamente');
      }

      setDialogOpen(false);
      setEditingEmployee(null);
      setFormData({ full_name: '', email: '', phone: '', default_commission_pct: 50.0 });
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Error al guardar el empleado');
    }
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      email: employee.email || '',
      phone: employee.phone || '',
      default_commission_pct: employee.default_commission_pct,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este empleado?')) return;

    try {
      await deleteEmployee(id);
      toast.success('Empleado eliminado correctamente');
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Error al eliminar el empleado');
    }
  };

  const handleNew = () => {
    setEditingEmployee(null);
    setFormData({ full_name: '', email: '', phone: '', default_commission_pct: 50.0 });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-background animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Empleados</h1>
          </div>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-6 w-6 text-primary flex-shrink-0" />
            <h1 className="text-2xl font-bold truncate">Empleados</h1>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Empleado
          </Button>
        </div>

        {employees.length === 0 ? (
          <EmptyStateEmployees
            onInviteEmployee={() => setDialogOpen(true)}
            onBulkImport={() => {
              // TODO: implement bulk import
              toast.info("Importación masiva próximamente");
            }}
            className="max-w-md mx-auto"
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {employees.map((employee) => (
            <Card key={employee.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{employee.full_name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(employee)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {employee.active ? (
                    <Badge variant="secondary">Activo</Badge>
                  ) : (
                    <Badge variant="outline">Inactivo</Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {employee.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                )}
                {employee.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Comisión: {employee.default_commission_pct}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
          </>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
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
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="juan@email.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+54911234567"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="commission">Tasa de comisión (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.default_commission_pct}
                  onChange={(e) => setFormData({
                    ...formData,
                    default_commission_pct: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!formData.full_name.trim()}>
                {editingEmployee ? 'Actualizar' : 'Crear'} Empleado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EmployeesView;
