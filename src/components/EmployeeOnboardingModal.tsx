import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useSalons } from '../hooks/useSalons';
import { useEmployees, type CreateEmployeeData } from '../hooks/useEmployees';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import supabase from '../lib/supabase';

interface EmployeeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmployeeOnboardingModal({ isOpen, onClose }: EmployeeOnboardingModalProps) {
  const { user, currentOrgId } = useAuth();
  const { salons, isLoading: salonsLoading } = useSalons(currentOrgId ?? undefined);
  const { employees, createEmployee, fetchEmployees } = useEmployees(currentOrgId ?? undefined);
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [commission, setCommission] = useState('50');
  const [selectedSalons, setSelectedSalons] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Verificar si el usuario ya tiene un registro de empleado
  useEffect(() => {
    if (user?.id && employees.length > 0) {
      const existingEmployee = employees.find(emp => emp.user_id === user.id);
      if (existingEmployee && isOpen) {
        // Ya tiene registro de empleado, cerrar modal
        onClose();
      }
    }
  }, [user?.id, employees, isOpen, onClose]);

  const handleToggleSalon = (salonId: string) => {
    setSelectedSalons(prev => {
      const next = new Set(prev);
      if (next.has(salonId)) {
        next.delete(salonId);
      } else {
        next.add(salonId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('El nombre completo es requerido');
      return;
    }

    if (!currentOrgId) {
      toast.error('No hay organización seleccionada');
      return;
    }

    if (!user?.id) {
      toast.error('No hay usuario autenticado');
      return;
    }

    const commissionNum = parseFloat(commission);
    if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      toast.error('La comisión debe ser un número entre 0 y 100');
      return;
    }

    setSubmitting(true);

    try {
      // Crear el empleado
      const employeeData: CreateEmployeeData = {
        org_id: currentOrgId,
        user_id: user.id,
        full_name: fullName.trim(),
        email: user.email || undefined,
        phone: phone.trim() || undefined,
        default_commission_pct: commissionNum,
        active: true,
      };

      const createdEmployee = await createEmployee(employeeData);
      
      if (!createdEmployee) {
        throw new Error('No se pudo crear el empleado');
      }

      // Asignar el empleado a las peluquerías seleccionadas
      const { data: userData } = await supabase.auth.getUser();
      
      const assignmentPromises = Array.from(selectedSalons).map(async (salonId) => {
        const { error: assignError } = await supabase
          .from('salon_employees')
          .insert([{
            salon_id: salonId,
            employee_id: createdEmployee.id,
            assigned_by: userData?.user?.id,
          }]);

        if (assignError) {
          throw assignError;
        }
      });

      await Promise.all(assignmentPromises);

      toast.success('Perfil completado correctamente');
      await fetchEmployees();
      onClose();
    } catch (error: any) {
      console.error('Error completando perfil de empleado:', error);
      toast.error(error?.message || 'Error al completar el perfil');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[min(92vw,600px)] max-h-[90vh] overflow-y-auto rounded-2xl p-0">
        <form onSubmit={handleSubmit} className="relative flex h-full flex-col">
          <DialogHeader className="border-b border-border px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-2xl">
                  Completar tu perfil
                </DialogTitle>
                <DialogDescription>
                  Completa tu información para formar parte del equipo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Paso 1: Información personal */}
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  Ingresa tus datos básicos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: +54 11 1234-5678"
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commission">Comisión (%) *</Label>
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="Ej: 50"
                    required
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Porcentaje de comisión por defecto para tus servicios
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Paso 2: Asignación a peluquerías */}
            <Card>
              <CardHeader>
                <CardTitle>Asignación a Peluquerías</CardTitle>
                <CardDescription>
                  Selecciona las peluquerías donde trabajarás
                </CardDescription>
              </CardHeader>
              <CardContent>
                {salonsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : salons.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No hay peluquerías disponibles en esta organización
                  </p>
                ) : (
                  <div className="space-y-3">
                    {salons.map((salon) => (
                      <div
                        key={salon.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          id={`salon-${salon.id}`}
                          checked={selectedSalons.has(salon.id)}
                          onChange={() => handleToggleSalon(salon.id)}
                          disabled={submitting}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <label
                          htmlFor={`salon-${salon.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium">{salon.name}</div>
                          {salon.address && (
                            <div className="text-sm text-muted-foreground">
                              {salon.address}
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !fullName.trim() || selectedSalons.size === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Completar Perfil'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

