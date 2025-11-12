import React, { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LineChart, Sparkles, UserPlus, Users } from 'lucide-react';

import { PageContainer } from '../layout/PageContainer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { GenericActionBar } from '../GenericActionBar';
import { ShortcutBanner } from '../ShortcutBanner';
import { useCommandPalette } from '../../contexts/CommandPaletteContext';
import { OrganizationInviteDialog } from './organization/OrganizationInviteDialog';
import { OrganizationEmployeeDialog } from './organization/OrganizationEmployeeDialog';
import { useOrganizationManagement } from './organization/useOrganizationManagement';
import type { EmployeeFormData } from './organization/useOrganizationManagement';

const OrganizationSummarySidebar = dynamic(
  () => import('./organization/OrganizationSummarySidebar'),
  { ssr: false },
);
const OrganizationPeoplePanel = dynamic(
  () => import('./organization/OrganizationPeoplePanel'),
  { ssr: false },
);

interface OrganizationViewProps {
  isDemo?: boolean;
}

const getInitials = (text: string | undefined) => {
  if (!text) return '';
  const cleaned = text.trim();
  if (!cleaned) return '';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
};

const OrganizationView: React.FC<OrganizationViewProps> = ({ isDemo = false }) => {
  const palette = useCommandPalette(true);
  const {
    organization,
    memberships,
    loading,
    loadingMembers,
    loadingEmployees,
    ownerMembership,
    membersPreview,
    memberDirectory,
    heroStats,
    formattedCreatedAt,
    ownerLabel,
    permissions,
    inviteDialogOpen,
    setInviteDialogOpen,
    openInviteDialog,
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    selectedUser,
    setSelectedUser,
    inviteRole,
    setInviteRole,
    inviting,
    inviteMember,
    removeMemberDialogOpen,
    setRemoveMemberDialogOpen,
    memberToRemove,
    requestRemoveMember,
    clearMemberToRemove,
    removeMember,
    removing,
    leaveOrgDialogOpen,
    setLeaveOrgDialogOpen,
    handleLeaveOrganization,
    leaving,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteOrganization,
    deleting,
    salons,
    syncedEmployees,
    selectedEmployee,
    setSelectedEmployee,
    employeeDialogOpen,
    setEmployeeDialogOpen,
    editingEmployee,
    employeeFormData,
    setEmployeeFormData,
    selectedSalons,
    handleToggleSalon,
    handleSaveEmployee,
    savingEmployee,
    handleAssociateUserId,
    handleCreateEmployeeClick,
    handleEditEmployeeFromList,
    handleSelectEmployeeFromList,
    employeeActionBarData,
    resetEmployeeForm,
    employeeToDelete,
    requestEmployeeDeletion,
    clearEmployeeToDelete,
    deleteEmployee,
    deletingEmployee,
    toastInfo,
  } = useOrganizationManagement({ isDemo });

  const { canManageMembers, canDelete, canManageTeam, canEditCommissions } = permissions;

  const selectedActionEmployee = selectedEmployee?.employee ?? null;

  const handleEmployeeFormChange = useCallback(
    (updates: Partial<EmployeeFormData>) => {
      setEmployeeFormData((prev) => ({ ...prev, ...updates }));
    },
    [setEmployeeFormData],
  );

  const handleDeleteEmployeePrompt = useCallback(
    (employeeId: string) => {
      const target = syncedEmployees.find((employee) => employee.id === employeeId);
      if (target) {
        requestEmployeeDeletion(target);
      }
    },
    [syncedEmployees, requestEmployeeDeletion],
  );

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!organization) {
    return (
      <PageContainer>
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
          <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            Organización
          </span>
          <p className="text-muted-foreground">No tienes una organización asignada.</p>
        </div>
      </PageContainer>
    );
  }

  const totalMembers = memberships.length;

  return (
    <PageContainer className="space-y-8 pb-16">
      <ShortcutBanner
        icon={<Sparkles className="size-4 text-primary" aria-hidden="true" />}
        message={
          <>
            Usa <span className="font-semibold">Ctrl + K</span> o{' '}
            <span className="font-semibold">Ctrl + B</span> para abrir la paleta de comandos.
          </>
        }
        onShortcutClick={palette?.openPalette}
      />

      <Card className="border-0 shadow-none">
        <CardHeader className="gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Organización
            </span>
            <CardTitle className="text-3xl font-semibold text-foreground md:text-4xl">
              {organization.name}
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm md:text-base">
              Coordiná la comunicación interna, asigná responsabilidades y mantené a tu equipo
              sincronizado desde una sola vista.
            </CardDescription>
          </div>
          <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground sm:items-end sm:text-right">
            <div className="flex flex-col gap-1 sm:items-end">
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Propietario
              </span>
              <span className="font-medium text-foreground">{ownerLabel}</span>
            </div>
            <div className="flex flex-col gap-1 sm:items-end">
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Creada
              </span>
              <span>{formattedCreatedAt}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/20 p-4"
              >
                <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {stat.label}
                </span>
                <span className="text-2xl font-semibold text-foreground">{stat.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 font-medium text-foreground">
              Activa
            </span>
            <span className="hidden md:inline">•</span>
            <span>{organization.tax_id ? `CUIT ${organization.tax_id}` : 'Sin identificación fiscal'}</span>
            <span className="hidden md:inline">•</span>
            <span>{totalMembers} miembros registrados</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManageMembers && (
              <Button onClick={openInviteDialog} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invitar miembro
              </Button>
            )}
            {canManageTeam && (
              <Button variant="secondary" onClick={handleCreateEmployeeClick} className="gap-2">
                <Users className="h-4 w-4" />
                Nuevo empleado
              </Button>
            )}
            {(canManageTeam || canEditCommissions) && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => toastInfo('Reportes de organización disponibles próximamente.')}
              >
                <LineChart className="h-4 w-4" />
                Ver reportes
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <OrganizationSummarySidebar
          organization={organization}
          ownerMembership={ownerMembership}
          memberships={memberships}
          membersPreview={membersPreview}
          loadingMembers={loadingMembers}
          onInvite={canManageMembers ? openInviteDialog : undefined}
          onDelete={canDelete ? () => setDeleteDialogOpen(true) : undefined}
          canDelete={canDelete}
          getInitials={getInitials}
          onMemberOptions={canManageMembers ? requestRemoveMember : undefined}
        />
        <OrganizationPeoplePanel
          memberships={memberships}
          memberDirectory={memberDirectory}
          employees={syncedEmployees}
          loadingEmployees={loadingEmployees}
          onInviteMember={openInviteDialog}
          onRemoveMember={canManageMembers ? requestRemoveMember : () => {}}
          onEditEmployee={canManageTeam ? handleEditEmployeeFromList : () => {}}
          onCreateEmployee={canManageTeam ? handleCreateEmployeeClick : () => {}}
          onDeleteEmployee={canManageTeam ? handleDeleteEmployeePrompt : () => {}}
          onSelectEmployee={canManageTeam ? handleSelectEmployeeFromList : undefined}
          permissions={{
            canInviteMembers: canManageMembers,
            canRemoveMembers: canManageMembers,
            canManageEmployees: canManageTeam,
            canEditCommissions,
          }}
        />
      </div>

      <OrganizationInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchResults={searchResults}
        searching={searching}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        inviteRole={inviteRole}
        onInviteRoleChange={setInviteRole}
        onInvite={inviteMember}
        inviting={inviting}
      />

      <OrganizationEmployeeDialog
        open={employeeDialogOpen}
        onOpenChange={setEmployeeDialogOpen}
        formData={employeeFormData}
        onFormChange={handleEmployeeFormChange}
        onSubmit={handleSaveEmployee}
        onCancel={resetEmployeeForm}
        editingEmployee={editingEmployee}
        selectedSalons={selectedSalons}
        salons={salons}
        onToggleSalon={handleToggleSalon}
        onAssociateUser={handleAssociateUserId}
        isSaving={savingEmployee}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar organización?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la organización "{organization.name}" y
              todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteOrganization}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removeMemberDialogOpen}
        onOpenChange={(open) => {
          setRemoveMemberDialogOpen(open);
          if (!open) {
            clearMemberToRemove();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar miembro de la organización?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas quitar a{' '}
              {memberToRemove?.user?.full_name || memberToRemove?.user?.email || 'este miembro'} de
              la organización? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={clearMemberToRemove}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removing}
            >
              {removing ? 'Quitando…' : 'Quitar miembro'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveOrgDialogOpen} onOpenChange={setLeaveOrgDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir de la organización?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas salir de la organización "{organization.name}"? Esta acción
              no se puede deshacer. Ya no tendrás acceso a los datos de esta organización.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveOrganization}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={leaving}
            >
              {leaving ? 'Saliendo…' : 'Salir de la organización'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(employeeToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            clearEmployeeToDelete();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
            <AlertDialogDescription>
              {employeeToDelete
                ? `Se eliminará la ficha de ${employeeToDelete.full_name || employeeToDelete.email || 'este empleado'}.`
                : 'Se eliminará la ficha del empleado.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={clearEmployeeToDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteEmployee}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingEmployee}
            >
              {deletingEmployee ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {employeeActionBarData && selectedEmployee && !employeeDialogOpen && (
        <GenericActionBar
          title={employeeActionBarData.title || "Empleado sin nombre"}
          subtitle={employeeActionBarData.subtitle || undefined}
          badge={employeeActionBarData.badge}
          isOpen={Boolean(selectedEmployee) && !employeeDialogOpen}
          onClose={() => setSelectedEmployee(null)}
          onEdit={
            selectedActionEmployee
              ? () => handleEditEmployeeFromList(selectedActionEmployee)
              : undefined
          }
          onDelete={
            selectedActionEmployee
              ? () => requestEmployeeDeletion(selectedActionEmployee)
              : undefined
          }
          detailFields={employeeActionBarData.detailFields}
        />
      )}
    </PageContainer>
  );
};

export default OrganizationView;


