// ============================================================================
// COMPONENTE: ProfileView (REFACTORIZADO - Layout Simplificado)
// ============================================================================
// Vista de perfil del usuario con layout simplificado consistente con HomeView

import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { PageContainer } from '../layout/PageContainer';
import { Section } from '../layout/Section';

export default function ProfileView() {
  const { user, currentRole, currentOrgId } = useAuth();

  return (
    <PageContainer>
      <Section title="Mi Perfil">
        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>
              Tu información de cuenta y configuración
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="text-lg">{user?.email || 'No disponible'}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Rol</label>
                <p className="text-lg capitalize">
                  <Badge variant="secondary">{currentRole || 'Sin rol'}</Badge>
                </p>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-muted-foreground">Organización</label>
                <p className="text-lg">{currentOrgId || 'No seleccionada'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </PageContainer>
  );
}
