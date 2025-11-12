import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { UISalon } from '../../../hooks/useSalons';
import { EmployeeFormData, SyncedEmployee } from './useOrganizationManagement';

interface OrganizationEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: EmployeeFormData;
  onFormChange: (updates: Partial<EmployeeFormData>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  editingEmployee: SyncedEmployee | null;
  selectedSalons: Set<string>;
  salons: UISalon[];
  onToggleSalon: (salonId: string) => void;
  onAssociateUser: () => void;
  isSaving: boolean;
}

export const OrganizationEmployeeDialog: React.FC<OrganizationEmployeeDialogProps> = ({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  onCancel,
  editingEmployee,
  selectedSalons,
  salons,
  onToggleSalon,
  onAssociateUser,
  isSaving,
}) => {
  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      onCancel();
    }
    onOpenChange(nextOpen);
  };

  const handleInputChange =
    (field: keyof EmployeeFormData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        event.target.type === 'number' ? Number(event.target.value) || 0 : event.target.value;
      onFormChange({ [field]: value } as Partial<EmployeeFormData>);
    };

  const disableAssociateButton = !formData.email.trim() || Boolean(editingEmployee?.user_id);

  const handleAssociate = () => {
    if (!disableAssociateButton) {
      onAssociateUser();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingEmployee ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
          <DialogDescription>
            Gestioná la información de contacto y comisiones del personal de tu organización.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4 py-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="employee-full-name">Nombre completo</Label>
            <Input
              id="employee-full-name"
              value={formData.full_name}
              onChange={handleInputChange('full_name')}
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="employee-email">Email (opcional)</Label>
            <div className="flex gap-2">
              <Input
                id="employee-email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder="juan@email.com"
              />
              {editingEmployee && !editingEmployee.user_id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAssociate}
                  disabled={disableAssociateButton}
                >
                  Asociar usuario
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              El email debe corresponder a un usuario invitado a la organización.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="employee-phone">Teléfono (opcional)</Label>
            <Input
              id="employee-phone"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              placeholder="+54911234567"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="employee-commission-type">Tipo de comisión</Label>
            <Select
              value={formData.commission_type}
              onValueChange={(value: 'percentage' | 'fixed') =>
                onFormChange({ commission_type: value })
              }
            >
              <SelectTrigger id="employee-commission-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                <SelectItem value="fixed">Monto fijo ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.commission_type === 'percentage' ? (
            <div className="grid gap-2">
              <Label htmlFor="employee-commission-pct">Tasa de comisión (%)</Label>
              <Input
                id="employee-commission-pct"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.default_commission_pct}
                onChange={handleInputChange('default_commission_pct')}
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="employee-commission-amount">Monto fijo de comisión ($)</Label>
              <Input
                id="employee-commission-amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.default_commission_amount}
                onChange={handleInputChange('default_commission_amount')}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Asignar a salones</Label>
            {salons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay salones disponibles</p>
            ) : (
              <div className="space-y-2 rounded-lg border border-border/60 p-3 max-h-48 overflow-y-auto">
                {salons.map((salon) => {
                  const checked = selectedSalons.has(salon.id);
                  return (
                    <label
                      key={salon.id}
                      htmlFor={`employee-salon-${salon.id}`}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-border/40 bg-card px-3 py-2 shadow-sm"
                    >
                      <input
                        id={`employee-salon-${salon.id}`}
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleSalon(salon.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{salon.name}</p>
                        {salon.address && (
                          <p className="text-xs text-muted-foreground">{salon.address}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !formData.full_name.trim()}>
              {isSaving ? 'Guardando…' : editingEmployee ? 'Actualizar empleado' : 'Crear empleado'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


