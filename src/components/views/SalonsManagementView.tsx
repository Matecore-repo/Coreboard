import React, { useState, useCallback, lazy, useRef, useEffect, useMemo } from "react";
import { Plus, Users, MapPin, Upload, X, Phone, Mail, Clock, DollarSign, Edit3, FileText, Trash2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
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

const RECOMMENDED_SERVICES: Array<{ key: string; name: string; base_price: number; duration_minutes: number; description: string }> = [
  { key: "corte-clasico", name: "Corte Clásico", base_price: 3500, duration_minutes: 30, description: "El servicio esencial para nuevos clientes o mantenimiento." },
  { key: "coloracion-premium", name: "Coloración Premium", base_price: 8500, duration_minutes: 90, description: "Incluye diagnóstico, color y terminación profesional." },
  { key: "tratamiento-nutritivo", name: "Tratamiento Nutritivo", base_price: 6200, duration_minutes: 45, description: "Reparación profunda con masaje de relajación." },
  { key: "peinado-eventos", name: "Peinado para Eventos", base_price: 7800, duration_minutes: 50, description: "Peinados editoriales y de fiesta listos para fotos." },
  { key: "barberia-premium", name: "Barbería Premium", base_price: 4200, duration_minutes: 35, description: "Corte + perfilado de barba + tratamiento hot towel." },
  { key: "alisado-keratina", name: "Alisado con Keratina", base_price: 19500, duration_minutes: 120, description: "Cabello liso, suave y sin frizz por hasta 3 meses." },
];

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

      setDialogOpen(false);
    } catch (error) {
      console.error('❌ Error en handleSave:', error);
      toastError(`Error: ${error instanceof Error ? error.message : 'Ocurrió un error'}`);
    }
  };

  const handleDelete = async (salon: Salon) => {
      if (confirm('¿Estás seguro de eliminar "' + salon.name + '"?')) {
      try {
        await onDeleteSalon(salon.id);
        toastSuccess("Local eliminado");
        setSelectedSalon(null);
      } catch (error) {
        console.error('❌ Error eliminando salón:', error);
        toastError(`Error: ${error instanceof Error ? error.message : 'Ocurrió un error'}`);
      }
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
          <Button 
            onClick={() => handleOpenDialog()}
            aria-label="Crear nuevo local"
            data-action="new-salon"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Nuevo local
          </Button>
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
                {typeof salon.rentPrice === "number" && (
                  <div className="text-muted-foreground">Alquiler: ${salon.rentPrice.toLocaleString()}/mes</div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Personal: -</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      </section>

      {selectedSalon && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-semibold">Detalle de {selectedSalon.name}</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenDialog(selectedSalon)}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Editar local
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => servicesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Gestionar servicios
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-red-600"
                onClick={() => handleDelete(selectedSalon)}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span><span className="font-medium text-foreground">Dirección:</span> {selectedSalon.address || "No especificada"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span><span className="font-medium text-foreground">Teléfono:</span> {selectedSalon.phone || "No especificado"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span><span className="font-medium text-foreground">Email:</span> {selectedSalon.email || "No especificado"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span><span className="font-medium text-foreground">Alquiler:</span> {typeof selectedSalon.rentPrice === "number" ? "$" + selectedSalon.rentPrice.toLocaleString() + "/mes" : "No especificado"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span><span className="font-medium text-foreground">Horarios:</span> {selectedSalon.openingHours || "No especificado"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span><span className="font-medium text-foreground">Personal:</span> {selectedSalonEmployeeAssignments.length} empleado{selectedSalonEmployeeAssignments.length !== 1 ? 's' : ''}</span>
            </div>
            {selectedSalon.notes && (
              <div className="flex items-center gap-3 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span><span className="font-medium text-foreground">Notas:</span> {selectedSalon.notes}</span>
              </div>
            )}
            {selectedSalonEmployeeAssignments.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedSalonEmployeeAssignments.map((assignment) => {
                  const employee = employees.find(emp => emp.id === assignment.employee_id);
                  return (
                    <Badge key={assignment.id} variant="secondary">
                      {employee?.full_name || assignment.employees?.full_name || 'Empleado'}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
              <DialogContent>
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
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Servicios recomendados</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {RECOMMENDED_SERVICES.map((service) => {
                        const existing = allServices.find((s) => s.name.toLowerCase() === service.name.toLowerCase());
                        const alreadyAssigned = existing ? salonServices.some((ss) => ss.service_id === existing.id) : false;
                        const isProcessing = serviceActionId === service.key;
                        const disabled = !selectedSalon || alreadyAssigned || isProcessing;
                        const label = !selectedSalon
                          ? "Selecciona un salón"
                          : alreadyAssigned
                          ? "Asignado"
                          : existing
                          ? "Asignar"
                          : "Crear y asignar";

                        return (
                          <div key={service.key} className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-sm">{service.name}</p>
                                <p className="text-xs text-muted-foreground">${service.base_price} · {service.duration_minutes} min</p>
                                <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                              </div>
                              <Button
                                size="sm"
                                disabled={disabled}
                                onClick={() => handleCreateAndAssignService({
                                  key: service.key,
                                  name: service.name,
                                  base_price: service.base_price,
                                  duration_minutes: service.duration_minutes,
                                })}
                              >
                                {isProcessing ? "Procesando..." : label}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

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

                  <div className="pt-2 border-t">
                    <h4 className="text-sm font-semibold mb-2">Servicios disponibles</h4>
                    {servicesLoading ? (
                      <p className="text-sm text-muted-foreground">Cargando servicios...</p>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {allServices.map((service) => {
                          const isAssigned = salonServices.some(ss => ss.service_id === service.id);
                          return (
                            <div key={service.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="font-medium text-sm">{service.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  ${service.base_price} · {service.duration_minutes} min
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant={isAssigned ? "destructive" : "default"}
                                onClick={async () => {
                                  try {
                                    if (isAssigned) {
                                      const assignment = salonServices.find(ss => ss.service_id === service.id);
                                      if (assignment) {
                                        await unassignService(assignment.id);
                                        toastSuccess(`Servicio "${service.name}" removido`);
                                      }
                                    } else {
                                      await assignService(service.id);
                                      toastSuccess(`Servicio "${service.name}" asignado`);
                                    }
                                  } catch (error) {
                                    console.error('Error managing service assignment:', error);
                                    toastError('Error al gestionar el servicio');
                                  }
                                }}
                              >
                                {isAssigned ? 'Remover' : 'Asignar'}
                              </Button>
                            </div>
                          );
                        })}
                        {allServices.length === 0 && (
                          <p className="text-center text-sm text-muted-foreground py-4">
                            Aún no hay servicios creados para tu organización.
                          </p>
                        )}
                      </div>
                    )}
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
            <div className="space-y-2">
              {salonServices.map((service) => (
                <div key={service.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{service.service_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Precio: ${service.price_override ?? service.base_price} |
                        Duración: {service.duration_override ?? service.duration_minutes} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const newPrice = prompt('Nuevo precio (deja vacío para precio base):', service.price_override?.toString() || '');
                            const newDuration = prompt('Nueva duración en minutos (deja vacío para duración base):', service.duration_override?.toString() || '');

                            const updates: any = {};
                            if (newPrice && newPrice.trim()) {
                              updates.price_override = Number(newPrice);
                            }
                            if (newDuration && newDuration.trim()) {
                              updates.duration_override = Number(newDuration);
                            }

                            if (Object.keys(updates).length > 0) {
                              await updateServiceAssignment(service.id, updates);
                              toastSuccess('Servicio actualizado');
                            }
                          } catch (error) {
                            console.error('Error updating service:', error);
                            toastError('Error al actualizar el servicio');
                          }
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (confirm(`¿Remover "${service.service_name}" de este salón?`)) {
                            try {
                              await unassignService(service.id);
                              toastSuccess('Servicio removido del salón');
                            } catch (error) {
                              console.error('Error removing service:', error);
                              toastError('Error al remover el servicio');
                            }
                          }
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
      </Section>
    </PageContainer>
  );
}

export default SalonsManagementView;
