import React from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/card';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { MoreHorizontal } from 'lucide-react';
import { Organization, Membership } from './types';

interface OrganizationSummarySidebarProps {
  organization: Organization;
  ownerMembership?: Membership;
  memberships: Membership[];
  membersPreview: Membership[];
  loadingMembers: boolean;
  onInvite?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canDelete: boolean;
  getInitials: (text: string | undefined) => string;
  onMemberOptions?: (member: Membership) => void;
}

const OrganizationSummarySidebar: React.FC<OrganizationSummarySidebarProps> = ({
  organization,
  ownerMembership,
  memberships,
  membersPreview,
  loadingMembers,
  onInvite,
  onEdit,
  onDelete,
  canDelete,
  getInitials,
  onMemberOptions,
}) => {
  return (
    <Card className="h-fit">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">Resumen de la organización</CardTitle>
            <CardDescription>Información rápida y accesos directos.</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs uppercase tracking-[0.14em]">
            Activa
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Información</p>
          <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Nombre</span>
              <span className="text-right font-medium text-foreground">{organization.name}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Propietario</span>
              <span className="text-right font-medium text-foreground">
                {ownerMembership?.user?.email || ownerMembership?.user?.full_name || 'No asignado'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Creada</span>
              <span className="text-foreground">
                {new Date(organization.created_at).toLocaleDateString('es-AR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Miembros</p>
            <span className="text-xs text-muted-foreground">{memberships.length} en total</span>
          </div>
          <div className="space-y-2">
            {loadingMembers ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={`member-skeleton-${index}`} className="h-12 animate-pulse rounded-xl bg-muted/30" />
              ))
            ) : membersPreview.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/70 px-4 py-4 text-center text-sm text-muted-foreground">
                No hay miembros cargados.
              </div>
            ) : (
              membersPreview.map((member) => {
                const label =
                  member.user?.full_name || member.user?.email || `Usuario ${member.user_id.substring(0, 4)}`;
                const roleLabel =
                  member.role === 'owner'
                    ? 'Propietario'
                    : member.role === 'admin'
                    ? 'Administrador'
                    : member.role === 'employee'
                    ? 'Empleado'
                    : 'Visualizador';

                return (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2"
                  >
                    <Avatar className="h-9 w-9 border border-border/40">
                      <AvatarFallback>{getInitials(label)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{roleLabel}</p>
                    </div>
                    {onMemberOptions && member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Opciones para ${label}`}
                        onClick={() => onMemberOptions(member)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
      {(onInvite || onEdit || (canDelete && onDelete)) && (
        <CardFooter className="flex flex-wrap gap-2">
          {onInvite && (
            <Button size="sm" className="flex-1 min-w-[120px]" onClick={onInvite}>
              Invitar
            </Button>
          )}
          {onEdit && (
            <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={onEdit}>
              Editar
            </Button>
          )}
          {canDelete && onDelete && (
            <Button size="sm" variant="destructive" className="flex-1 min-w-[120px]" onClick={onDelete}>
              Eliminar
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default React.memo(OrganizationSummarySidebar);


