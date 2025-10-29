import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { User, Building, Shield } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import supabase from '../../lib/supabase';

export default function ProfileView() {
  const { user, currentRole, currentOrgId } = useAuth();
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const generateInvitationLink = async () => {
    if (!inviteeEmail.trim()) {
      toast.error('Por favor ingresa un email');
      return;
    }

    if (!currentOrgId) {
      toast.error('No hay organización seleccionada');
      return;
    }

    setIsGeneratingLink(true);
    try {
      const { data, error } = await supabase.rpc('generate_invitation', {
        p_org_id: currentOrgId,
        p_email: inviteeEmail.trim(),
        p_role: 'employee'
      });

      if (error) throw error;

      const link = `${window.location.origin}/auth/accept-invitation?token=${data.token}`;
      setInvitationLink(link);
      setInviteeEmail('');
      toast.success('Link de invitación generado');
    } catch (error) {
      console.error('Error:', error);
      toast.error('No se pudo generar el link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      toast.success('Link copiado al portapapeles');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Mi Perfil</h1>

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5" />
          Información Personal
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="text-lg font-medium">{user?.email || 'No disponible'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Rol</label>
            <p className="text-lg font-medium capitalize flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {currentRole || 'Sin rol'}
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Organización</label>
            <p className="text-lg font-medium flex items-center gap-2">
              <Building className="h-4 w-4" />
              {currentOrgId || 'No seleccionada'}
            </p>
          </div>
        </div>
      </Card>

      {currentRole === 'owner' || currentRole === 'admin' ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Invitar Empleado</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email del empleado"
                value={inviteeEmail}
                onChange={(e) => setInviteeEmail(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <Button
                onClick={generateInvitationLink}
                disabled={isGeneratingLink}
              >
                {isGeneratingLink ? 'Generando...' : 'Generar Link'}
              </Button>
            </div>

            {invitationLink && (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground mb-2">Link de invitación:</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    readOnly
                    value={invitationLink}
                    className="flex-1 px-3 py-2 bg-background border rounded-md text-sm"
                  />
                  <Button variant="outline" onClick={copyToClipboard}>
                    Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Comparte este link con el empleado para que se registre
                </p>
              </div>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
