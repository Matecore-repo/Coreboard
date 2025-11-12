import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { ScrollArea } from '../../ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { SearchedUser } from './useOrganizationManagement';

interface OrganizationInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchResults: SearchedUser[];
  searching: boolean;
  selectedUser: SearchedUser | null;
  onSelectUser: (user: SearchedUser | null) => void;
  inviteRole: 'employee' | 'admin' | 'viewer';
  onInviteRoleChange: (role: 'employee' | 'admin' | 'viewer') => void;
  onInvite: () => void;
  inviting: boolean;
}

const roleLabels: Record<'employee' | 'admin' | 'viewer', string> = {
  employee: 'Empleado',
  admin: 'Administrador',
  viewer: 'Visualizador',
};

export const OrganizationInviteDialog: React.FC<OrganizationInviteDialogProps> = ({
  open,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searching,
  selectedUser,
  onSelectUser,
  inviteRole,
  onInviteRoleChange,
  onInvite,
  inviting,
}) => {
  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      onSelectUser(null);
      onSearchQueryChange('');
    }
    onOpenChange(nextOpen);
  };

  const renderResults = () => {
    if (!searchQuery.trim()) {
      return (
        <p className="px-2 text-sm text-muted-foreground">
          Escribí al menos 2 caracteres para buscar por correo o nombre.
        </p>
      );
    }

    if (searching) {
      return <div className="px-2 text-sm text-muted-foreground">Buscando usuarios…</div>;
    }

    if (searchResults.length === 0) {
      return <div className="px-2 text-sm text-muted-foreground">No se encontraron resultados.</div>;
    }

    return searchResults.map((user) => {
      const isSelected = selectedUser?.id === user.id;
      return (
        <button
          key={user.id}
          type="button"
          onClick={() => onSelectUser(isSelected ? null : user)}
          className={[
            'flex w-full flex-col rounded-lg border px-3 py-2 text-left transition-colors',
            isSelected
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5',
          ].join(' ')}
        >
          <span className="text-sm font-medium">{user.full_name || user.email}</span>
          {user.full_name && (
            <span className="text-xs text-muted-foreground">{user.email}</span>
          )}
        </button>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invitar miembro</DialogTitle>
          <DialogDescription>
            Buscá usuarios registrados y asignales un rol dentro de la organización.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="invite-search">Buscar usuario</Label>
            <Input
              id="invite-search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Ingresá un correo o nombre"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Solo se mostrarán usuarios que aún no pertenezcan a la organización.
            </p>
          </div>

          <ScrollArea className="max-h-48 space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex flex-col gap-2">{renderResults()}</div>
          </ScrollArea>

          <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="space-y-1">
              <Label>Rol del miembro</Label>
              <p className="text-xs text-muted-foreground">
                El rol determina los permisos que tendrá dentro de la organización.
              </p>
            </div>
            <RadioGroup value={inviteRole} onValueChange={(value) => onInviteRoleChange(value as any)}>
              {(['employee', 'admin', 'viewer'] as const).map((role) => (
                <div key={role} className="flex items-center gap-3 rounded-md border border-border/50 bg-card px-3 py-2">
                  <RadioGroupItem value={role} id={`invite-role-${role}`} />
                  <Label htmlFor={`invite-role-${role}`} className="flex-1 cursor-pointer">
                    <span className="text-sm font-medium">{roleLabels[role]}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onInvite}
            disabled={!selectedUser || inviting}
            className="gap-2"
          >
            {inviting ? 'Enviando…' : 'Enviar invitación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


