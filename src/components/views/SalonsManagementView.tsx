import React, { useState, useCallback, lazy, useRef, useEffect, useMemo } from "react";
import { Plus, Users, MapPin, X, Edit3, Trash2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
const ServicesPanel = lazy(() => import("../ServicesPanel"));
import type { Service as SalonServiceUI } from "../ServicesPanel";
import type { Service as OrgService } from "../../hooks/useServices";
import { EmptyStateServices } from "../empty-states/EmptyStateServices";
import { PageContainer } from "../layout/PageContainer";
import { Section } from "../layout/Section";
import { toastSuccess, toastError, toastInfo } from "../../lib/toast";
import { useSalonServices } from "../../hooks/useSalonServices";
import { useServices } from "../../hooks/useServices";
import { useAuth } from "../../contexts/AuthContext";
import { useEmployees } from "../../hooks/useEmployees";
import { useSalonEmployees } from "../../hooks/useSalonEmployees";
import { ShortcutBanner } from "../ShortcutBanner";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { supabase } from "../../lib/supabase";

interface Salon {
  id: string;
  name: string;
  address: string;
  image: string;
  // staff?: string[]; // DEPRECATED: Ya no se usa. Los empleados se gestionan a través de salon_employees
  rentPrice?: number;
  phone?: string;
  email?: string;
  notes?: string;
  openingHours?: string;
  services?: SalonServiceUI[];
}

interface SalonsManagementViewProps {
  salons: Salon[];
  onAddSalon: (salon: Omit<Salon, "id">) => Promise<void>;
  onEditSalon: (id: string, salon: Partial<Salon>) => Promise<void>;
  onDeleteSalon: (id: string) => Promise<void>;
}

function SalonsManagementView({ salons, onAddSalon, onEditSalon, onDeleteSalon }: SalonsManagementViewProps) {
  const { currentOrgId } = useAuth();
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const { services: allServices, createService: createOrgService, isLoading: servicesLoading } = useServices(currentOrgId ?? undefined);
  
  // Empleados de la organización (excluir dueños, ya que tienen acceso total)
  const { employees: allEmployees, isLoading: loadingEmployees } = useEmployees(currentOrgId ?? undefined, { enabled: true });
  
  // Filtrar empleados: excluir dueños (owner) de la lista de asignación a salones
  // Los dueños tienen acceso total a todos los salones, no necesitan ser asignados
  const employees = useMemo(() => {
    return allEmployees.filter(emp => emp.role !== 'owner');
  }, [allEmployees]);
  
  // Asignaciones de empleados al salón seleccionado (para mostrar en vista de detalle)
  const { assignments: selectedSalonEmployeeAssignments } = useSalonEmployees(
    selectedSalon?.id,
    { enabled: !!selectedSalon?.id }
  );
  
  // Estado de edición
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [deleteSalonDialogOpen, setDeleteSalonDialogOpen] = useState(false);
  const [salonToDelete, setSalonToDelete] = useState<Salon | null>(null);
  const [removeServiceDialogOpen, setRemoveServiceDialogOpen] = useState(false);
  const [serviceToRemove, setServiceToRemove] = useState<{ id: string; name: string } | null>(null);
  
  // Asignaciones de empleados al salón (cuando se edita un salón)
  const { assignments: salonEmployeeAssignments, assignEmployee, unassignEmployee, isLoading: loadingSalonEmployees } = useSalonEmployees(
    editingSalon?.id,
    { enabled: !!editingSalon?.id }
  );
  
  // Estado de empleados seleccionados (IDs de empleados asignados al salón)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const { services: salonServices, assignService, unassignService, updateServiceAssignment } = useSalonServices(selectedSalon?.id);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceActionId, setServiceActionId] = useState<string | null>(null);
  const [customService, setCustomService] = useState({ name: "", price: "", duration: "45" });
  const [editServiceDialogOpen, setEditServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<{ id: string; name: string; price?: number; duration?: number; base_price: number; duration_minutes: number } | null>(null);
  const [editServiceForm, setEditServiceForm] = useState({ price: "", duration: "" });
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    image: "",
    rentPrice: 0,
    phone: "",
    email: "",
    notes: "",
    openingHours: "",
    services: [] as SalonServiceUI[],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const servicesSectionRef = useRef<HTMLDivElement | null>(null);

  // Mapa de salon_id -> número de empleados asignados
  const [employeeCountsBySalon, setEmployeeCountsBySalon] = useState<Map<string, number>>(new Map());

  // Obtener conteo de empleados para todos los salones
  useEffect(() => {
    if (!salons.length || !currentOrgId) {
      setEmployeeCountsBySalon(new Map());
      return;
    }

    const fetchEmployeeCounts = async () => {
      try {
        const salonIds = salons.map(s => s.id);
        const { data, error } = await supabase
          .from('salon_employees')
          .select('salon_id')
          .in('salon_id', salonIds)
          .eq('active', true);

        if (error) throw error;

        // Contar empleados por salón
        const counts = new Map<string, number>();
        salonIds.forEach(id => counts.set(id, 0));
        
        (data || []).forEach((assignment: { salon_id: string }) => {
          const current = counts.get(assignment.salon_id) || 0;
          counts.set(assignment.salon_id, current + 1);
        });

        setEmployeeCountsBySalon(counts);
      } catch (error) {
        console.error('Error fetching employee counts:', error);
        // En caso de error, inicializar con 0 para todos
        const counts = new Map<string, number>();
        salons.forEach(s => counts.set(s.id, 0));
        setEmployeeCountsBySalon(counts);
      }
    };

    fetchEmployeeCounts();
  }, [salons, currentOrgId]);

  const resetCustomService = useCallback(() => {
    setCustomService({ name: "", price: "", duration: "45" });
  }, []);

  const handleCreateAndAssignService = useCallback(async (input: { key: string; name: string; base_price: number; duration_minutes: number; }) => {
    if (!selectedSalon) {
      toastError("Selecciona un local primero");
      return;
    }
    if (!currentOrgId) {
      toastError("Organización no disponible");
      return;
    }

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      toastError("El servicio debe tener un nombre");
      return;
    }

    setServiceActionId(input.key);
    try {
      let serviceRecord: OrgService | undefined = allServices.find(
        (svc) => svc.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (!serviceRecord) {
        const created = await createOrgService({
          org_id: currentOrgId,
          name: trimmedName,
          base_price: input.base_price,
          duration_minutes: input.duration_minutes,
          active: true,
        });
        serviceRecord = created as OrgService;
        toastSuccess(`Servicio "${trimmedName}" creado`);
      }

      if (salonServices.some((ss) => ss.service_id === serviceRecord.id)) {
        toastInfo(`"${trimmedName}" ya está asignado a este salón`);
      } else {
        await assignService(serviceRecord.id);
        toastSuccess(`"${trimmedName}" asignado a ${selectedSalon.name}`);
      }
    } catch (error) {
      console.error("Error creando/asignando servicio", error);
      toastError("No se pudo crear/asignar el servicio");
    } finally {
      setServiceActionId(null);
    }
  }, [assignService, allServices, createOrgService, currentOrgId, salonServices, selectedSalon]);

  const handleCustomServiceSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number(customService.price);
    const duration = Number(customService.duration);

    if (!customService.name.trim()) {
      toastError("Ingresa un nombre para el servicio");
      return;
    }
    if (isNaN(price) || price <= 0) {
      toastError("Ingresa un precio válido");
      return;
    }
    if (isNaN(duration) || duration <= 0) {
      toastError("Ingresa una duración válida");
      return;
    }

    await handleCreateAndAssignService({
      key: "custom",
      name: customService.name,
      base_price: price,
      duration_minutes: duration,
    });

    resetCustomService();
  }, [customService, handleCreateAndAssignService, resetCustomService]);

  const handleOpenDialog = useCallback((salon?: Salon) => {
    if (salon) {
      setEditingSalon(salon);
      setFormData({
        name: salon.name,
        address: salon.address,
        image: salon.image,
        rentPrice: salon.rentPrice || 0,
        phone: salon.phone || "",
        email: salon.email || "",
        notes: salon.notes || "",
        openingHours: salon.openingHours || "",
        services: salon.services || [],
      });
      setImagePreview(salon.image);
    } else {
      setEditingSalon(null);
      setFormData({
        name: "",
        address: "",
        image: "",
        rentPrice: 0,
        phone: "",
        email: "",
        notes: "",
        openingHours: "",
        services: [],
      });
      setImagePreview("");
      setSelectedEmployeeIds(new Set());
    }
    setImageFile(null);
    setDialogOpen(true);
    setSelectedSalon(null);
  }, []);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toastError("La imagen no debe superar los 5MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setFormData((prev) => ({ ...prev, image: result }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    setImagePreview("");
    setFormData((prev) => ({ ...prev, image: "" }));
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      toastError("Por favor completa los campos requeridos (Nombre y Dirección)");
      return;
    }

    try {
      const dataToSave: Omit<Salon, "id"> = {
        ...formData,
        image:
          imagePreview ||
          "https://images.unsplash.com/photo-1560066984-138dadb4c035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      };

      if (editingSalon) {
        await onEditSalon(editingSalon.id, dataToSave);
        toastSuccess("Local actualizado correctamente");
        
        // Gestionar asignaciones de empleados al editar
        if (editingSalon.id && selectedEmployeeIds.size >= 0) {
          // Comparar asignaciones actuales con seleccionadas
          const currentAssignments = salonEmployeeAssignments;
          const currentEmployeeIds = new Set(currentAssignments.map(a => a.employee_id));
          
          // Empleados a agregar (están seleccionados pero no asignados)
          const toAdd = Array.from(selectedEmployeeIds).filter(id => !currentEmployeeIds.has(id));
          // Empleados a remover (estaban asignados pero ya no están seleccionados)
          const toRemove = currentAssignments.filter(a => !selectedEmployeeIds.has(a.employee_id));

          // Agregar nuevos empleados
          for (const employeeId of toAdd) {
            try {
              await assignEmployee(employeeId);
            } catch (error) {
              console.error(`Error asignando empleado ${employeeId}:`, error);
              toastError(`Error al asignar empleado`);
            }
          }

          // Remover empleados desasignados
          for (const assignment of toRemove) {
            try {
              await unassignEmployee(assignment.id);
            } catch (error) {
              console.error(`Error desasignando empleado ${assignment.employee_id}:`, error);
              toastError(`Error al desasignar empleado`);
            }
          }
        }
      } else {
        // Crear nuevo salón
        await onAddSalon(dataToSave);
        toastSuccess("Local creado correctamente");
        // Nota: Las asignaciones de empleados al crear un salón nuevo
        // se pueden hacer después editando el salón recién creado
      }

      // Resetear formulario y cerrar dialog
      setEditingSalon(null);
      setFormData({
        name: "",
        address: "",
        image: "",
        rentPrice: 0,
        phone: "",
        email: "",
        notes: "",
        openingHours: "",
        services: [],
      });
      setImagePreview("");
      setImageFile(null);
      setSelectedEmployeeIds(new Set());
      setDialogOpen(false);
    } catch (error) {
      console.error('❌ Error en handleSave:', error);
      toastError(`Error: ${error instanceof Error ? error.message : 'Ocurrió un error'}`);
      // No cerrar el dialog si hay un error para que el usuario pueda corregir
    }
  };

  const handleDeleteClick = (salon: Salon) => {
    setSalonToDelete(salon);
    setDeleteSalonDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!salonToDelete) return;
    
    try {
      await onDeleteSalon(salonToDelete.id);
      toastSuccess("Local eliminado");
      setSelectedSalon(null);
      setSalonToDelete(null);
    } catch (error) {
      console.error('❌ Error eliminando salón:', error);
      toastError(`Error: ${error instanceof Error ? error.message : 'Ocurrió un error'}`);
    }
  };

  const handleRemoveServiceConfirm = async () => {
    if (!serviceToRemove) return;
    
    try {
      await unassignService(serviceToRemove.id);
      toastSuccess('Servicio removido del salón');
      setServiceToRemove(null);
    } catch (error) {
      console.error('Error removing service:', error);
      toastError('Error al remover el servicio');
    }
  };

  const handleEditServiceClick = (service: typeof salonServices[0]) => {
    setEditingService({
      id: service.id,
      name: service.service_name,
      price: service.price_override,
      duration: service.duration_override,
      base_price: service.base_price,
      duration_minutes: service.duration_minutes,
    });
    setEditServiceForm({
      price: service.price_override?.toString() || "",
      duration: service.duration_override?.toString() || "",
    });
    setEditServiceDialogOpen(true);
  };

  const handleUpdateService = async () => {
    if (!editingService) return;
    
    try {
      const updates: any = {};
      const price = editServiceForm.price.trim() ? Number(editServiceForm.price) : null;
      const duration = editServiceForm.duration.trim() ? Number(editServiceForm.duration) : null;
      
      if (price !== null && !isNaN(price) && price > 0) {
        updates.price_override = price;
      } else if (editServiceForm.price.trim() === "") {
        // Si está vacío, remover el override para usar el precio base
        updates.price_override = null;
      }
      
      if (duration !== null && !isNaN(duration) && duration > 0) {
        updates.duration_override = duration;
      } else if (editServiceForm.duration.trim() === "") {
        // Si está vacío, remover el override para usar la duración base
        updates.duration_override = null;
      }
      
      if (Object.keys(updates).length > 0) {
        await updateServiceAssignment(editingService.id, updates);
        toastSuccess('Servicio actualizado');
        setEditServiceDialogOpen(false);
        setEditingService(null);
        setEditServiceForm({ price: "", duration: "" });
      } else {
        toastError('Ingresa al menos un valor válido');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      toastError('Error al actualizar el servicio');
    }
  };

  // Cargar empleados asignados al salón cuando se abre el diálogo de edición
  useEffect(() => {
    if (editingSalon?.id) {
      // Cargar asignaciones existentes del salón
      const assignedIds = new Set(salonEmployeeAssignments.map(a => a.employee_id));
      setSelectedEmployeeIds(assignedIds);
    } else if (!editingSalon) {
      // Limpiar selección cuando se cierra el diálogo
      setSelectedEmployeeIds(new Set());
    }
  }, [editingSalon?.id, salonEmployeeAssignments]);

  // Resetear formulario cuando se cierra el dialog
  useEffect(() => {
    if (!dialogOpen && !editingSalon) {
      // Resetear formulario solo si no hay un salón en edición
      setFormData({
        name: "",
        address: "",
        image: "",
        rentPrice: 0,
        phone: "",
        email: "",
        notes: "",
        openingHours: "",
        services: [],
      });
      setImagePreview("");
      setImageFile(null);
      setSelectedEmployeeIds(new Set());
    }
  }, [dialogOpen, editingSalon]);

  // Toggle de empleado seleccionado (para checkboxes)
  const handleToggleEmployee = useCallback((employeeId: string) => {
    setSelectedEmployeeIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  }, []);

  const handleServicesChange = useCallback(
    (updated: SalonServiceUI[]) => {
      if (!selectedSalon) return;
      onEditSalon(selectedSalon.id, { services: updated });
      setSelectedSalon((prev) => (prev ? { ...prev, services: updated } : prev));
    },
    [selectedSalon, onEditSalon],
  );

  return (
    <PageContainer>
      <ShortcutBanner
        icon={<Sparkles className="size-4 text-primary" aria-hidden="true" />}
        message={(
          <>
            Usa <span className="font-semibold">Ctrl + K</span> para abrir la paleta de comandos o <span className="font-semibold">Ctrl + ←/→</span> para alternar vistas.
          </>
        )}
      />
      <Section 
        title="Gestión de Locales"
        description="Administra tus sucursales y personal"
        action={
          <div className="flex items-center gap-2">
            {selectedSalon && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenDialog(selectedSalon)}
                  aria-label="Editar local"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => handleDeleteClick(selectedSalon)}
                  aria-label="Eliminar local"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button 
              onClick={() => handleOpenDialog()}
              aria-label="Crear nuevo local"
              data-action="new-salon"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Nuevo local
            </Button>
          </div>
        }
      >
      <section className="space-y-4" role="region" aria-label="Gestión de locales">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4" role="list" aria-label="Lista de locales">
        {salons.map((salon) => (
          <article
            key={salon.id}
            onClick={() => setSelectedSalon(selectedSalon?.id === salon.id ? null : salon)}
            className={`bg-card border border-border/60 dark:border-border/40 rounded-2xl overflow-hidden transition-all cursor-pointer ${
              selectedSalon?.id === salon.id
                ? "border-primary ring-2 ring-primary/20 shadow-lg"
                : "hover:shadow-md hover:border-primary/50"
            }`}
            role="listitem"
            tabIndex={0}
            aria-label={`Local: ${salon.name} en ${salon.address}`}
            aria-pressed={selectedSalon?.id === salon.id}
            data-salon-id={salon.id}
            data-salon-name={salon.name}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedSalon(selectedSalon?.id === salon.id ? null : salon);
              }
            }}
          >
            <div className="h-32 overflow-hidden relative">
              <img src={salon.image} alt={salon.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <h3 className="font-semibold" aria-label={`Nombre del local: ${salon.name}`}>
                  {salon.name}
                </h3>
                <div className="flex items-center gap-2 text-muted-foreground" aria-label={`Dirección: ${salon.address}`}>
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  <span className="text-xs">{salon.address}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">
                  Alquiler: ${(typeof salon.rentPrice === "number" ? salon.rentPrice : 0).toLocaleString()}/mes
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Personal: {employeeCountsBySalon.get(salon.id) ?? 0} empleado{(employeeCountsBySalon.get(salon.id) ?? 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      </section>

      {selectedSalon && (
        <div className="mt-6" ref={servicesSectionRef}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Servicios de {selectedSalon.name}</h3>
            <Dialog open={serviceDialogOpen} onOpenChange={(open) => {
              setServiceDialogOpen(open);
              if (!open) {
                setServiceActionId(null);
                resetCustomService();
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => setServiceDialogOpen(true)}
                  disabled={!selectedSalon}
                  className={!selectedSalon ? "pointer-events-none opacity-60" : undefined}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Asignar Servicio
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Gestionar servicios de {selectedSalon.name}</DialogTitle>
                  <DialogDescription>
                    Crea nuevos servicios o asigna los existentes a este salón.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {servicesLoading && (
                    <div className="text-sm text-muted-foreground">Cargando servicios disponibles…</div>
                  )}
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <h4 className="text-sm font-semibold mb-2">Crear servicio personalizado</h4>
                    <form className="grid gap-3" onSubmit={handleCustomServiceSubmit}>
                      {serviceActionId === "custom" && (
                        <p className="text-xs text-muted-foreground">Creando servicio…</p>
                      )}
                      <div className="grid gap-2">
                        <Label htmlFor="custom-service-name">Nombre</Label>
                        <Input
                          id="custom-service-name"
                          placeholder="Ej: Balayage con nutrición"
                          value={customService.name}
                          onChange={(e) => setCustomService((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="custom-service-price">Precio</Label>
                          <Input
                            id="custom-service-price"
                            type="number"
                            min="0"
                            step="100"
                            placeholder="Ej: 6500"
                            value={customService.price}
                            onChange={(e) => setCustomService((prev) => ({ ...prev, price: e.target.value }))}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="custom-service-duration">Duración (min)</Label>
                          <Input
                            id="custom-service-duration"
                            type="number"
                            min="15"
                            step="5"
                            placeholder="Ej: 45"
                            value={customService.duration}
                            onChange={(e) => setCustomService((prev) => ({ ...prev, duration: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={resetCustomService}>
                          Limpiar
                        </Button>
                        <Button type="submit" disabled={serviceActionId === "custom"}>
                          {serviceActionId === "custom" ? "Procesando..." : "Guardar y asignar"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {salonServices.length === 0 ? (
            <EmptyStateServices
              salonName={selectedSalon.name}
              onCreateService={() => setServiceDialogOpen(true)}
              className="max-w-md mx-auto"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salonServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.service_name}</TableCell>
                    <TableCell>${service.price_override ?? service.base_price}</TableCell>
                    <TableCell>{service.duration_override ?? service.duration_minutes} min</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditServiceClick(service)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setServiceToRemove({ id: service.id, name: service.service_name });
                            setRemoveServiceDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSalon ? "Editar Local" : "Nuevo Local"}</DialogTitle>
            <DialogDescription>
              {editingSalon ? "Modifica los datos del local" : "Completa los datos para crear un nuevo local"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Información básica</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Studio Elegance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  placeholder="Ej: Av. Principal 123, Ciudad"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Información de contacto</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    placeholder="Ej: +54 11 1234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="Ej: contacto@sucursal.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Información financiera y operativa</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rentPrice">Alquiler ($/mes)</Label>
                  <Input
                    id="rentPrice"
                    type="number"
                    placeholder="Ej: 150000"
                    value={formData.rentPrice || ""}
                    onChange={(e) => setFormData({ ...formData, rentPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openingHours">Horarios de atención</Label>
                  <Input
                    id="openingHours"
                    placeholder="Ej: Lun-Vie 9-18 hs"
                    value={formData.openingHours}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas adicionales</Label>
                <Textarea
                  id="notes"
                  placeholder="Información adicional sobre el local..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Imagen del local</h3>

              <div className="space-y-2">
                <Label htmlFor="image">Cargar imagen</Label>
                <div className="flex items-center gap-4">
                  <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="flex-1" />
                  {imagePreview && (
                    <Button type="button" variant="outline" size="sm" onClick={handleRemoveImage}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Formato: JPG, PNG. Tamaño máximo: 5MB</p>
                {imagePreview && (
                  <div className="mt-2 rounded-lg overflow-hidden border relative h-40">
                    <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Personal</h3>
              <div className="space-y-2">
                <Label>Asignar empleados al salón</Label>
                {loadingEmployees ? (
                  <div className="text-sm text-muted-foreground">Cargando empleados...</div>
                ) : employees.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No hay empleados en la organización</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {employees.map((employee) => {
                      const isSelected = selectedEmployeeIds.has(employee.id);
                      return (
                        <label
                          key={employee.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleEmployee(employee.id)}
                            className="rounded"
                          />
                          <span className="text-sm">{employee.full_name}</span>
                          {employee.email && (
                            <span className="text-xs text-muted-foreground">({employee.email})</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedEmployeeIds.size > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {selectedEmployeeIds.size} empleado{selectedEmployeeIds.size > 1 ? 's' : ''} seleccionado{selectedEmployeeIds.size > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingSalon ? "Guardar cambios" : "Crear local"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteSalonDialogOpen}
        onOpenChange={setDeleteSalonDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="¿Estás seguro?"
        description={salonToDelete ? `¿Estás seguro de eliminar "${salonToDelete.name}"? Esta acción no se puede deshacer.` : ""}
        confirmLabel="Continuar"
        cancelLabel="Cancelar"
        variant="destructive"
      />

      <ConfirmDialog
        open={removeServiceDialogOpen}
        onOpenChange={setRemoveServiceDialogOpen}
        onConfirm={handleRemoveServiceConfirm}
        title="¿Remover servicio?"
        description={serviceToRemove ? `¿Remover "${serviceToRemove.name}" de este salón?` : ""}
        confirmLabel="Continuar"
        cancelLabel="Cancelar"
        variant="default"
      />

      <Dialog open={editServiceDialogOpen} onOpenChange={setEditServiceDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Servicio</DialogTitle>
            <DialogDescription>
              {editingService && `Actualiza el precio y/o duración para "${editingService.name}" en este local. Deja vacío para usar el valor base.`}
            </DialogDescription>
          </DialogHeader>
          
          {editingService && (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Precio</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    min="0"
                    step="100"
                    placeholder={`Precio base: $${editingService.base_price}`}
                    value={editServiceForm.price}
                    onChange={(e) => setEditServiceForm(prev => ({ ...prev, price: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deja vacío para usar el precio base del servicio (${editingService.base_price})
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Duración (minutos)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    min="15"
                    step="5"
                    placeholder={`Duración base: ${editingService.duration_minutes} min`}
                    value={editServiceForm.duration}
                    onChange={(e) => setEditServiceForm(prev => ({ ...prev, duration: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deja vacío para usar la duración base del servicio ({editingService.duration_minutes} min)
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditServiceDialogOpen(false);
                  setEditingService(null);
                  setEditServiceForm({ price: "", duration: "" });
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateService}>
                  Guardar cambios
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      </Section>
    </PageContainer>
  );
}

export default SalonsManagementView;
