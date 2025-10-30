// ============================================================================
// COMPONENTE: ProfileView (REFACTORIZADO - Layout Simplificado)
// ============================================================================
// Vista de perfil del usuario con layout simplificado consistente con HomeView

import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export default function ProfileView() {
  const { user, currentRole, currentOrgId } = useAuth();

  return (
    <div className="pb-20">
      <div className="p-4 md:p-6 space-y-4">
        {/* Header - Simplificado como HomeView */}
        <div>
          <h2>Mi Perfil</h2>
        </div>

        {/* Información Personal */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>
              Tu información de cuenta y configuración
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-lg font-medium">{user?.email || 'No disponible'}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Rol</label>
                <p className="text-lg font-medium capitalize">
                  <Badge variant="secondary">{currentRole || 'Sin rol'}</Badge>
                </p>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Organización</label>
                <p className="text-lg font-medium">{currentOrgId || 'No seleccionada'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
