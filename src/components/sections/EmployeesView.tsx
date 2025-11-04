import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployees } from '../../hooks/useEmployees';
import { useSalons } from '../../hooks/useSalons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { EmptyStateEmployees } from '../empty-states/EmptyStateEmployees';
import { toast } from 'sonner';
import { Users, UserPlus, Mail, Phone, DollarSign, Edit3, Trash2, Plus, Building2 } from 'lucide-react';
import { EmptyState } from '../ui/empty-state';
import supabase from '../../lib/supabase';

const EmployeesView: React.FC = () => {
  const { currentOrgId, isDemo, user } = useAuth();
  const { employees, isLoading, createEmployee, updateEmployee, deleteEmployee } = useEmployees(currentOrgId ?? undefined);
  const { salons } = useSalons(currentOrgId ?? undefined, { enabled: true });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [selectedSalons, setSelectedSalons] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    commission_type: 'percentage' as 'percentage' | 'fixed',
    default_commission_pct: 50.0,
    default_commission_amount: 0,
  });

  const handleSave = async () => {
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, formData);
        
        // Actualizar asignación a salones
        if (selectedSalons.size > 0) {
          const { data: userData } = await supabase.auth.getUser();
          const assignmentPromises = Array.from(selectedSalons).map(async (salonId) => {
            // Verificar si ya existe la asignación
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
                  assigned_by: userData?.data?.user?.id,
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

        const createdEmployee = await createEmployee({
          ...formData,
          org_id: currentOrgId,
          user_id: null, // El owner puede asociar el user_id después de que acepten la invitación
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
                assigned_by: userData?.data?.user?.id,
                is_active: true,
              }]);
            
            if (assignError) throw assignError;
          });
          
          await Promise.all(assignmentPromises);
        }
        
        toast.success('Empleado creado correctamente');
      }

      setDialogOpen(false);
      setEditingEmployee(null);
      setSelectedSalons(new Set());
      setFormData({ full_name: '', email: '', phone: '', commission_type: 'percentage', default_commission_pct: 50.0, default_commission_amount: 0 });
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Error al guardar el empleado');
    }
  };

  const handleEdit = async (employee: any) => {
    setEditingEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      email: employee.email || '',
      phone: employee.phone || '',
      commission_type: employee.commission_type || 'percentage',
      default_commission_pct: employee.default_commission_pct || 0,
      default_commission_amount: employee.default_commission_amount || 0,
    });
    
    // Cargar salones asignados del empleado
    const { data: assignments } = await supabase
      .from('salon_employees')
      .select('salon_id')
      .eq('employee_id', employee.id)
      .eq('is_active', true);
    
    const assignedSalonIds = new Set((assignments || []).map(a => a.salon_id));
    setSelectedSalons(assignedSalonIds);
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
    setSelectedSalons(new Set());
    setFormData({ full_name: '', email: '', phone: '', commission_type: 'percentage', default_commission_pct: 50.0, default_commission_amount: 0 });
    setDialogOpen(true);
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

  if (!currentOrgId && !isDemo) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building2}
          title="Seleccioná una organización"
          description="Crea o elegí una organización para gestionar tu equipo."
          actionLabel="Crear organización"
          onAction={() => toast.info('Creación de organización próximamente')}
        />
      </div>
    );
  }

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
                  <span>
                    Comisión: {
                      employee.commission_type === 'fixed' 
                        ? `$${employee.default_commission_amount?.toFixed(2) || 0}`
                        : `${employee.default_commission_pct}%`
                    }
                  </span>
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
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="juan@email.com"
                  />
                  {formData.email && editingEmployee && !editingEmployee.user_id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        // Buscar usuario por email y asociar
                        try {
                          // Buscar el usuario por email en profiles
                          const { data: profiles } = await supabase
                            .from('profiles')
                            .select('id, email')
                            .eq('email', formData.email.toLowerCase().trim())
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
                          await updateEmployee(editingEmployee.id, { user_id: userId });
                          toast.success('Usuario asociado correctamente');
                          setDialogOpen(false);
                        } catch (error) {
                          console.error('Error asociando usuario:', error);
                          toast.error('Error al asociar usuario');
                        }
                      }}
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
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+54911234567"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="commission_type">Tipo de comisión</Label>
                <Select
                  value={formData.commission_type}
                  onValueChange={(value: 'percentage' | 'fixed') => {
                    setFormData({
                      ...formData,
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

              {formData.commission_type === 'percentage' ? (
                <div className="grid gap-2">
                  <Label htmlFor="commission_pct">Tasa de comisión (%)</Label>
                  <Input
                    id="commission_pct"
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
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="commission_amount">Monto fijo de comisión ($)</Label>
                  <Input
                    id="commission_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.default_commission_amount}
                    onChange={(e) => setFormData({
                      ...formData,
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
