import React from 'react';
import { Users, UserPlus, Edit3, Trash2, LineChart, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { ScrollArea } from '../../ui/scroll-area';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { toastInfo } from '../../../lib/toast';
import { Membership } from './types';

interface OrganizationPeoplePanelProps {
  memberships: Membership[];
  memberDirectory: Record<string, { label: string }>;
  employees: any[];
  loadingEmployees: boolean;
  onInviteMember: () => void;
  onRemoveMember: (member: Membership) => void;
  onEditEmployee: (employee: any) => void;
  onCreateEmployee: () => void;
  onDeleteEmployee: (employeeId: string) => void;
  permissions: {
    canInviteMembers: boolean;
    canRemoveMembers: boolean;
    canManageEmployees: boolean;
    canEditCommissions: boolean;
  };
}

const roleBadgeVariant: Record<Membership['role'], 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'default',
  employee: 'secondary',
  viewer: 'outline',
};

const roleLabelMap: Record<Membership['role'], string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  employee: 'Empleado',
  viewer: 'Visualizador',
};

const OrganizationPeoplePanel: React.FC<OrganizationPeoplePanelProps> = ({
  memberships,
  memberDirectory,
  employees,
  loadingEmployees,
  onInviteMember,
  onRemoveMember,
  onEditEmployee,
  onCreateEmployee,
  onDeleteEmployee,
  permissions,
}) => {
  const [memberFilter, setMemberFilter] = React.useState('');
  const normalizedFilter = memberFilter.trim().toLowerCase();

  const { canInviteMembers, canRemoveMembers, canManageEmployees, canEditCommissions } = permissions;

  const filteredMembers = React.useMemo(() => {
    if (!normalizedFilter) return memberships;
    return memberships.filter((member) => {
      const label =
        memberDirectory[member.user_id]?.label ||
        member.user?.full_name ||
        member.user?.email ||
        '';
      return label.toLowerCase().includes(normalizedFilter);
    });
  }, [memberDirectory, memberships, normalizedFilter]);

  const activeEmployees = React.useMemo(
    () => employees.filter((employee: any) => employee.active !== false),
    [employees]
  );

  const averagePercentageCommission = React.useMemo(() => {
    const percentageEmployees = activeEmployees.filter(
      (employee: any) =>
        employee.commission_type === 'percentage' &&
        typeof employee.default_commission_pct === 'number'
    );
    if (percentageEmployees.length === 0) return null;
    const total = percentageEmployees.reduce(
      (acc: number, employee: any) => acc + (employee.default_commission_pct ?? 0),
      0
    );
    return Math.round((total / percentageEmployees.length) * 10) / 10;
  }, [activeEmployees]);

  const fixedCommissionCount = React.useMemo(
    () =>
      activeEmployees.filter(
        (employee: any) =>
          employee.commission_type === 'fixed' && typeof employee.default_commission_amount === 'number'
      ).length,
    [activeEmployees]
  );

  const handlePlaceholderAction = (message: string) => {
    toastInfo(message);
  };

  const renderMembersTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4" /> Miembros de la organización
          </h3>
          <p className="text-xs text-muted-foreground">
            Invitá y administrá el acceso de tu equipo en un mismo lugar.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={memberFilter}
            onChange={(event) => setMemberFilter(event.target.value)}
            placeholder="Buscar por nombre o correo…"
            className="sm:flex-1"
          />
          {canInviteMembers && (
            <Button size="sm" onClick={onInviteMember} className="gap-2 sm:w-auto">
              <UserPlus className="h-4 w-4" /> Invitar miembro
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="max-h-[320px]">
        <div className="grid gap-2">
          {filteredMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/70 px-4 py-6 text-center text-sm text-muted-foreground">
              No se encontraron miembros con ese criterio.
            </div>
          ) : (
            filteredMembers.map((member) => {
              const label =
                memberDirectory[member.user_id]?.label ||
                member.user?.full_name ||
                member.user?.email ||
                `Usuario ${member.user_id.slice(0, 6)}`;
              const initials = label
                .split(/\s+/)
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const roleLabel = roleLabelMap[member.role] || 'Miembro';
              const canRemove = member.role !== 'owner';

              return (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-3 shadow-sm"
                >
                  <Avatar className="h-9 w-9 border border-border/40 bg-background">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{label}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{member.user?.email || 'Sin email'}</span>
                      <span>•</span>
                      <span>Rol: {roleLabel}</span>
                    </div>
                  </div>
                  <Badge variant={roleBadgeVariant[member.role]}>{roleLabel}</Badge>
                  {canRemoveMembers && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onRemoveMember(member)}
                      disabled={!canRemove}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const renderEmployeesTab = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Personal asignado</h3>
          <p className="text-xs text-muted-foreground">
            Editá datos, contactos y comisiones de cada colaborador.
          </p>
        </div>
        {canManageEmployees && (
          <Button size="sm" variant="secondary" onClick={onCreateEmployee}>
            Nuevo empleado
          </Button>
        )}
      </div>

      <ScrollArea className="max-h-[360px]">
        <div className="grid gap-2">
          {loadingEmployees ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={`employee-skeleton-${index}`} className="h-16 animate-pulse rounded-xl bg-muted/30" />
            ))
          ) : employees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/70 px-4 py-6 text-center text-sm text-muted-foreground">
              Todavía no registraste empleados. Sumá uno para comenzar a asignar comisiones.
            </div>
          ) : (
            employees.map((employee: any) => {
              const commission =
                employee.commission_type === 'fixed'
                  ? `$${employee.default_commission_amount ?? 0}`
                  : `${employee.default_commission_pct ?? 0}%`;

              return (
                <div key={employee.id} className="rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">{employee.full_name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{employee.email || 'Sin email'}</span>
                      <span>•</span>
                      <span>Comisión: {commission}</span>
                      {employee.phone && (
                        <>
                          <span>•</span>
                          <span>{employee.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => onEditEmployee(employee)}>
                      <Edit3 className="h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDeleteEmployee(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const renderCommissionsTab = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LineChart className="h-4 w-4" /> Resumen de comisiones
            </h3>
            <p className="text-xs text-muted-foreground">
              Comprendé cómo se compone la estructura de pagos del equipo.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePlaceholderAction('Configuración de comisiones disponible próximamente.')}
          >
            Ajustar reglas
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Empleados activos</span>
          <span className="text-2xl font-semibold text-foreground">{activeEmployees.length}</span>
          <span className="text-xs text-muted-foreground">con al menos una comisión configurada</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Promedio porcentaje</span>
          <span className="text-2xl font-semibold text-foreground">
            {averagePercentageCommission !== null ? `${averagePercentageCommission}%` : '—'}
          </span>
          <span className="text-xs text-muted-foreground">basado en empleados a porcentaje</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Bonos fijos</span>
          <span className="text-2xl font-semibold text-foreground">{fixedCommissionCount}</span>
          <span className="text-xs text-muted-foreground">montos fijos recurrentes</span>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Reportes</span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-0 text-sm text-primary hover:text-primary"
            onClick={() => handlePlaceholderAction('Reportes detallados disponibles próximamente.')}
          >
            <ShieldCheck className="h-4 w-4" /> Abrir dashboard
          </Button>
        </div>
      </div>
    </div>
  );

  const showEmployeesTab = canManageEmployees;
  const showCommissionsTab = canEditCommissions;

  if (!showEmployeesTab && !showCommissionsTab) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Equipo y accesos</CardTitle>
          <CardDescription>
            Invitá personas y controlá quién puede ver o editar la información de la organización.
          </CardDescription>
        </CardHeader>
        <CardContent>{renderMembersTab()}</CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="members" className="w-full">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">Organización y permisos</CardTitle>
            <CardDescription>Gestioná miembros, personal y comisiones desde una sola vista.</CardDescription>
          </div>
          <TabsList>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Miembros
            </TabsTrigger>
            {showEmployeesTab && (
              <TabsTrigger value="employees" className="gap-2">
                Personal
              </TabsTrigger>
            )}
            {showCommissionsTab && (
              <TabsTrigger value="commissions" className="gap-2">
                Comisiones
              </TabsTrigger>
            )}
          </TabsList>
        </CardHeader>
        <CardContent className="space-y-4">
          <TabsContent value="members" className="space-y-4">
            {renderMembersTab()}
          </TabsContent>
          {showEmployeesTab && (
            <TabsContent value="employees" className="space-y-4">
              {renderEmployeesTab()}
            </TabsContent>
          )}
          {showCommissionsTab && (
            <TabsContent value="commissions" className="space-y-4">
              {renderCommissionsTab()}
            </TabsContent>
          )}
        </CardContent>
      </Card>
    </Tabs>
  );
};

export default React.memo(OrganizationPeoplePanel);