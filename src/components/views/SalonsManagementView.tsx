import React, { useState, useCallback, lazy, useRef } from "react";
import { Plus, Users, MapPin, Upload, X, Phone, Mail, Clock, DollarSign, Edit3, FileText, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
const ServicesPanel = lazy(() => import("../ServicesPanel"));
import type { Service } from "../ServicesPanel";
import { EmptyStateServices } from "../empty-states/EmptyStateServices";
import { toast } from "sonner";
import { useSalonServices } from "../../hooks/useSalonServices";
import { useServices } from "../../hooks/useServices";
import { useAuth } from "../../contexts/AuthContext";

interface Salon {
  id: string;
  name: string;
  address: string;
  image: string;
  staff?: string[];
  rentPrice?: number;
  phone?: string;
  email?: string;
  notes?: string;
  openingHours?: string;
  services?: Service[];
}

interface SalonsManagementViewProps {
  salons: Salon[];
  onAddSalon: (salon: Omit<Salon, "id">) => void;
  onEditSalon: (id: string, salon: Partial<Salon>) => void;
  onDeleteSalon: (id: string) => void;
}

function SalonsManagementView({ salons, onAddSalon, onEditSalon, onDeleteSalon }: SalonsManagementViewProps) {
  const { currentOrgId } = useAuth();
  const { services: allServices } = useServices(currentOrgId ?? undefined);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const { services: salonServices, assignService, unassignService, updateServiceAssignment } = useSalonServices(selectedSalon?.id);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    image: "",
    staff: [] as string[],
    rentPrice: 0,
    phone: "",
    email: "",
    notes: "",
    openingHours: "",
    services: [] as Service[],
  });
  const [newStaff, setNewStaff] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const servicesSectionRef = useRef<HTMLDivElement | null>(null);

  const handleOpenDialog = useCallback((salon?: Salon) => {
    if (salon) {
      setEditingSalon(salon);
      setFormData({
        name: salon.name,
        address: salon.address,
        image: salon.image,
        staff: salon.staff || [],
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
        staff: [],
        rentPrice: 0,
        phone: "",
        email: "",
        notes: "",
        openingHours: "",
        services: [],
      });
      setImagePreview("");
    }
    setImageFile(null);
    setDialogOpen(true);
    setSelectedSalon(null);
  }, []);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 5MB");
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

  const handleSave = useCallback(async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      toast.error("Por favor completa los campos requeridos (Nombre y Dirección)");
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
        toast.success("Peluquería actualizada correctamente");
      } else {
        await onAddSalon(dataToSave);
        toast.success("Peluquería creada correctamente");
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('❌ Error en handleSave:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Ocurrió un error'}`);
    }
  }, [formData, imagePreview, editingSalon, onAddSalon, onEditSalon]);

  const handleDelete = useCallback(
    async (salon: Salon) => {
      if (confirm('¿Estás seguro de eliminar "' + salon.name + '"?')) {
        await onDeleteSalon(salon.id);
        toast.success("Peluquería eliminada");
        setSelectedSalon(null);
      }
    },
    [onDeleteSalon],
  );

  const handleAddStaff = useCallback(() => {
    if (!newStaff.trim()) return;
    setFormData((prev) => ({ ...prev, staff: [...prev.staff, newStaff.trim()] }));
    setNewStaff("");
  }, [newStaff]);

  const handleRemoveStaff = useCallback((index: number) => {
    setFormData((prev) => ({ ...prev, staff: prev.staff.filter((_, i) => i !== index) }));
  }, []);

  const handleServicesChange = useCallback(
    (updated: Service[]) => {
      if (!selectedSalon) return;
      onEditSalon(selectedSalon.id, { services: updated });
      setSelectedSalon((prev) => (prev ? { ...prev, services: updated } : prev));
    },
    [selectedSalon, onEditSalon],
  );

  return (
    <div className="p-6 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1>Gestión de Peluquerías</h1>
          <p className="text-muted-foreground text-sm">Administra tus sucursales y personal</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva peluquería
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {salons.map((salon) => (
          <div
            key={salon.id}
            onClick={() => setSelectedSalon(selectedSalon?.id === salon.id ? null : salon)}
            className={`bg-card border rounded-2xl overflow-hidden transition-all cursor-pointer ${
              selectedSalon?.id === salon.id
                ? "border-primary ring-2 ring-primary/20 shadow-lg"
                : "border-border hover:shadow-md hover:border-primary/50"
            }`}
          >
            <div className="h-32 overflow-hidden relative">
              <img src={salon.image} alt={salon.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <h3>{salon.name}</h3>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs">{salon.address}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {typeof salon.rentPrice === "number" && (
                  <div className="text-muted-foreground">Alquiler: ${salon.rentPrice.toLocaleString()}/mes</div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Personal: {salon.staff?.length || 0}</span>
                </div>
                {salon.staff && salon.staff.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {salon.staff.slice(0, 3).map((member, index) => (
                      <Badge key={index} variant="secondary">
                        {member}
                      </Badge>
                    ))}
                    {salon.staff.length > 3 && (
                      <Badge variant="secondary">+{salon.staff.length - 3}</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

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
                Editar peluquería
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
              <span><span className="font-medium text-foreground">Personal:</span> {(selectedSalon.staff?.length || 0)} empleados</span>
            </div>
            {selectedSalon.notes && (
              <div className="flex items-center gap-3 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span><span className="font-medium text-foreground">Notas:</span> {selectedSalon.notes}</span>
              </div>
            )}
            {selectedSalon.staff && selectedSalon.staff.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedSalon.staff.map((m, i) => (
                  <Badge key={i} variant="secondary">
                    {m}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedSalon && (
        <div className="mt-6" ref={servicesSectionRef}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Servicios de {selectedSalon.name}</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Asignar Servicio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Asignar servicios a {selectedSalon.name}</DialogTitle>
                  <DialogDescription>
                    Selecciona los servicios disponibles para ofrecer en este salón
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allServices.map((service) => {
                    const isAssigned = salonServices.some(ss => ss.service_id === service.id);
                    return (
                      <div key={service.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${service.base_price} - {service.duration_minutes} min
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
                                  toast.success(`Servicio "${service.name}" removido`);
                                }
                              } else {
                                await assignService(service.id);
                                toast.success(`Servicio "${service.name}" asignado`);
                              }
                            } catch (error) {
                              console.error('Error managing service assignment:', error);
                              toast.error('Error al gestionar el servicio');
                            }
                          }}
                        >
                          {isAssigned ? 'Remover' : 'Asignar'}
                        </Button>
                      </div>
                    );
                  })}
                  {allServices.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No hay servicios disponibles. Crea servicios primero.
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {salonServices.length === 0 ? (
            <EmptyStateServices
              salonName={selectedSalon.name}
              onCreateService={() => {
                toast.info("Crea servicios en la sección de configuración primero");
              }}
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
                              toast.success('Servicio actualizado');
                            }
                          } catch (error) {
                            console.error('Error updating service:', error);
                            toast.error('Error al actualizar el servicio');
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
                              toast.success('Servicio removido del salón');
                            } catch (error) {
                              console.error('Error removing service:', error);
                              toast.error('Error al remover el servicio');
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
            <DialogTitle>{editingSalon ? "Editar Peluquería" : "Nueva Peluquería"}</DialogTitle>
            <DialogDescription>
              {editingSalon ? "Modifica los datos de la peluquería" : "Completa los datos para crear una nueva peluquería"}
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
                  placeholder="Información adicional sobre la peluquería..."
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
                <Label>Agregar empleados</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del empleado"
                    value={newStaff}
                    onChange={(e) => setNewStaff(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddStaff();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddStaff} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.staff.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.staff.map((member, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {member}
                        <button onClick={() => handleRemoveStaff(index)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
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
              {editingSalon ? "Guardar cambios" : "Crear peluquería"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SalonsManagementView;
