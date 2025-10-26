import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { UserPlus, Mail, User, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface InviteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteEmployeeModal: React.FC<InviteEmployeeModalProps> = ({ isOpen, onClose }) => {
  const { currentOrgId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      return;
    }

    try {
      setLoading(true);
      
      // TODO: Implementar lógica de invitación
      // 1. Crear usuario en auth.users si no existe
      // 2. Crear empleado en employees
      // 3. Crear membresía en memberships
      // 4. Enviar email de invitación
      
      
      // Simular éxito
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onClose();
      // TODO: Mostrar toast de éxito
    } catch (error) {
      // TODO: Mostrar error al usuario
    } finally {
      setLoading(false);
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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input
                  id="name"
                  placeholder="Ej: María García"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ej: maria@peluqueria.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="Ej: +54 11 1234-5678"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim() || !formData.email.trim()}
            >
              {loading ? 'Enviando invitación...' : 'Enviar invitación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
