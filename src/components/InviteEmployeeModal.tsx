import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { UserPlus, Mail, User, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useInvitations } from '../hooks/useInvitations';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface InviteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InviteEmployeeModal: React.FC<InviteEmployeeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentOrgId, currentRole } = useAuth();
  const { createInvitation, loadInvitations, loading: invitationLoading } = useInvitations(currentOrgId);
  const [role, setRole] = useState<'employee' | 'admin' | 'viewer'>('employee');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Resetear form cuando se abre/cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: '', email: '', phone: '' });
      setRole('employee');
    }
  }, [isOpen]);

  // Verificar permisos (solo owner/admin pueden invitar)
  const canInvite = currentRole === 'owner' || currentRole === 'admin';
  const canSetAdminRole = currentRole === 'owner'; // Solo owner puede invitar como admin

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    if (!currentOrgId) {
      toast.error('No hay organización seleccionada');
      return;
    }

    if (!canInvite) {
      toast.error('No tienes permisos para invitar empleados');
      return;
    }

    try {
      // Crear invitación usando el hook (ya maneja su propio loading)
      const token = await createInvitation(formData.email.trim(), role, 7);
      
      if (!token) {
        // El hook ya muestra error si falla
        return;
      }

      // Mostrar toast de éxito (el hook no lo muestra)
      toast.success(`Invitación enviada a ${formData.email}`);
      
      // Recargar invitaciones si existe callback
      if (loadInvitations) {
        await loadInvitations();
      }
      
      // Ejecutar callback de éxito si existe
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      setFormData({ name: '', email: '', phone: '' });
      setRole('employee');
    } catch (error: any) {
      console.error('Error invitando empleado:', error);
      toast.error(error.message || 'Error al enviar invitación');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <UserPlus className="h-6 w-6 text-primary" />
            Invitar Empleado
          </DialogTitle>
          <DialogDescription className="text-base">
            Agregá un nuevo miembro a tu equipo. Podrán gestionar sus propios turnos y comisiones.
          </DialogDescription>
        </DialogHeader>

        {!canInvite ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No tienes permisos para invitar empleados. Solo los propietarios y administradores pueden invitar miembros.
              </p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Información del Empleado
                </CardTitle>
                <CardDescription>
                  Datos básicos del nuevo miembro del equipo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="name" className="text-sm font-medium">Nombre completo *</Label>
                <Input
                  id="name"
                  placeholder="Ej: María García"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ej: maria@peluqueria.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              
              <div className="space-y-2.5">
                <Label htmlFor="phone" className="text-sm font-medium">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="Ej: +54 11 1234-5678"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="role" className="text-sm font-medium">Rol *</Label>
                <Select value={role} onValueChange={(value: 'employee' | 'admin' | 'viewer') => setRole(value)} disabled={invitationLoading}>
                  <SelectTrigger id="role" className="mt-1">
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Empleado</SelectItem>
                    {canSetAdminRole && <SelectItem value="admin">Administrador</SelectItem>}
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {role === 'employee' && 'Puede gestionar sus propios turnos y comisiones'}
                  {role === 'admin' && 'Puede gestionar la organización y sus miembros'}
                  {role === 'viewer' && 'Solo puede ver información, no puede realizar cambios'}
                </p>
              </div>
            </CardContent>
          </Card>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={invitationLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={invitationLoading || !formData.name.trim() || !formData.email.trim()}
              >
                {invitationLoading ? 'Enviando invitación...' : 'Enviar invitación'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
