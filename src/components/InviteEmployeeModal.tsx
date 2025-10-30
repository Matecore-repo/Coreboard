import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { UserPlus, Mail, User, Phone, Copy, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import supabase from '../lib/supabase';

interface InviteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteEmployeeModal: React.FC<InviteEmployeeModalProps> = ({ isOpen, onClose }) => {
  const { currentOrgId, isDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'employee' as 'owner' | 'admin' | 'employee' | 'viewer'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      toast.error('El email es requerido');
      return;
    }

    if (isDemo) {
      toast.info('En modo demo, las invitaciones no están disponibles');
      return;
    }

    if (!currentOrgId) {
      toast.error('No hay organización seleccionada');
      return;
    }

    try {
      setLoading(true);
      
      // Llamar a la función RPC para crear la invitación
      const { data, error } = await supabase.rpc('create_invitation', {
        p_organization_id: currentOrgId,
        p_email: formData.email.trim(),
        p_role: formData.role,
        p_expires_days: 7
      });

      if (error) {
        throw error;
      }

      if (data && data.token) {
        setInvitationToken(data.token);
        toast.success('Invitación creada exitosamente');
      } else {
        throw new Error('No se recibió el token de invitación');
      }
    } catch (error: any) {
      console.error('Error al crear invitación:', error);
      toast.error(error.message || 'Error al crear la invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!invitationToken) return;
    try {
      await navigator.clipboard.writeText(invitationToken);
      setCopied(true);
      toast.success('Token copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('No se pudo copiar el token');
    }
  };

  const handleClose = () => {
    setInvitationToken(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'employee'
    });
    setCopied(false);
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Si hay token de invitación, mostrar pantalla de éxito
  if (invitationToken) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <UserPlus className="h-6 w-6 text-primary" />
              Invitación Creada
            </DialogTitle>
            <DialogDescription className="text-base">
              Compartí este token con el invitado para que se registre y se una a tu organización.
            </DialogDescription>
          </DialogHeader>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-primary" />
                Token de Invitación
              </CardTitle>
              <CardDescription>
                El invitado necesitará este token al registrarse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email del invitado</Label>
                <Input
                  value={formData.email}
                  readOnly
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Rol asignado</Label>
                <Input
                  value={formData.role === 'employee' ? 'Empleado' : formData.role === 'admin' ? 'Administrador' : formData.role === 'owner' ? 'Propietario' : 'Visualizador'}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Token de invitación</Label>
                <div className="flex gap-2">
                  <Input
                    value={invitationToken}
                    readOnly
                    className="bg-muted font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyToken}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="font-medium mb-1">⚠️ Importante:</p>
                <p>Este token solo se mostrará una vez. Guardalo en un lugar seguro y compartilo con el invitado.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setInvitationToken(null);
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  role: 'employee'
                });
              }}
            >
              Crear otra invitación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <UserPlus className="h-6 w-6 text-primary" />
            Invitar Usuario
          </DialogTitle>
          <DialogDescription className="text-base">
            Agregá un nuevo miembro a tu equipo. Crearás un token de invitación que deberás compartir con ellos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Información del Usuario
              </CardTitle>
              <CardDescription>
                Datos del nuevo miembro del equipo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label htmlFor="role">Rol *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange('role', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.role === 'employee' && 'Puede gestionar turnos y clientes en sus salones asignados'}
                  {formData.role === 'admin' && 'Acceso completo a la organización excepto configuración'}
                  {formData.role === 'viewer' && 'Solo lectura de turnos y clientes'}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.email.trim()}
            >
              {loading ? 'Creando invitación...' : 'Crear invitación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
