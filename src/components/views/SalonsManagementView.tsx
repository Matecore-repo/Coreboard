import React, { useState, useCallback } from "react";
import { Plus, Users, MapPin, Upload, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { GenericActionBar } from "../GenericActionBar";
import { toast } from "sonner@2.0.3";

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
}

interface SalonsManagementViewProps {
  salons: Salon[];
  onAddSalon: (salon: Omit<Salon, 'id'>) => void;
  onEditSalon: (id: string, salon: Partial<Salon>) => void;
  onDeleteSalon: (id: string) => void;
}

export function SalonsManagementView({ salons, onAddSalon, onEditSalon, onDeleteSalon }: SalonsManagementViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
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
  });
  const [newStaff, setNewStaff] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const handleOpenDialog = (salon?: Salon) => {
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
      });
      setImagePreview("");
    }
    setImageFile(null);
    setDialogOpen(true);
    setSelectedSalon(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen no debe superar los 5MB");
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setFormData({ ...formData, image: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData({ ...formData, image: "" });
  };

  const handleSave = () => {
    if (!formData.name || !formData.address) {
      toast.error("Por favor completa todos los campos requeridos (Nombre y Dirección)");
      return;
    }

    const dataToSave = {
      ...formData,
      image: imagePreview || "https://images.unsplash.com/photo-1560066984-138dadb4c035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    };

    if (editingSalon) {
      onEditSalon(editingSalon.id, dataToSave);
      toast.success("Peluquería actualizada correctamente");
    } else {
      onAddSalon(dataToSave);
      toast.success("Peluquería creada correctamente");
    }
    setDialogOpen(false);
  };

  const handleDelete = (salon: Salon) => {
    if (confirm(`¿Estás seguro de eliminar "${salon.name}"?`)) {
      onDeleteSalon(salon.id);
      toast.success("Peluquería eliminada");
      setSelectedSalon(null);
    }
  };

  const handleAddStaff = () => {
    if (newStaff.trim()) {
      setFormData({
        ...formData,
        staff: [...formData.staff, newStaff.trim()],
      });
      setNewStaff("");
    }
  };

  const handleRemoveStaff = (index: number) => {
    setFormData({
      ...formData,
      staff: formData.staff.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="p-6 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1>Gestión de Peluquerías</h1>
          <p className="text-muted-foreground text-sm">Administra tus sucursales y personal</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Peluquería
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
            <div className="h-32 overflow-hidden">
              <img 
                src={salon.image} 
                alt={salon.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="mb-1">{salon.name}</h3>
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <MapPin className="h-3 w-3" />
                <span className="text-xs">{salon.address}</span>
              </div>
              
              <div className="space-y-2">
                {salon.rentPrice && (
                  <div className="text-sm text-muted-foreground">
                    Alquiler: ${salon.rentPrice.toLocaleString()}/mes
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Personal: {salon.staff?.length || 0}</span>
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

      {/* Generic Action Bar */}
      <GenericActionBar
        title={selectedSalon?.name || ""}
        subtitle={selectedSalon?.address}
        isOpen={selectedSalon !== null}
        onClose={() => setSelectedSalon(null)}
        onEdit={() => {
          if (selectedSalon) {
            handleOpenDialog(selectedSalon);
          }
        }}
        onDelete={() => {
          if (selectedSalon) {
            handleDelete(selectedSalon);
          }
        }}
        detailFields={selectedSalon ? [
          { label: "Dirección", value: selectedSalon.address },
          { label: "Teléfono", value: selectedSalon.phone || "No especificado" },
          { label: "Email", value: selectedSalon.email || "No especificado" },
          { label: "Alquiler", value: selectedSalon.rentPrice ? `$${selectedSalon.rentPrice.toLocaleString()}/mes` : "No especificado" },
          { label: "Horarios", value: selectedSalon.openingHours || "No especificado" },
          { label: "Personal", value: `${selectedSalon.staff?.length || 0} empleados` },
          { 
            label: "Equipo", 
            value: selectedSalon.staff && selectedSalon.staff.length > 0 
              ? selectedSalon.staff.join(", ") 
              : "Sin personal asignado" 
          },
          { label: "Notas", value: selectedSalon.notes || "Sin notas" },
        ] : undefined}
      />

      {/* Dialog para crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSalon ? "Editar Peluquería" : "Nueva Peluquería"}
            </DialogTitle>
            <DialogDescription>
              {editingSalon 
                ? "Modifica los datos de la peluquería" 
                : "Completa los datos para crear una nueva peluquería"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Información Básica</h3>
              
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
                  placeholder="Ej: Av. Corrientes 1234, CABA"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Ej: +54 11 1234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Ej: contacto@salon.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Información financiera y operativa */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Información Financiera y Operativa</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rentPrice">Precio de Alquiler ($/mes)</Label>
                  <Input
                    id="rentPrice"
                    type="number"
                    placeholder="Ej: 150000"
                    value={formData.rentPrice || ""}
                    onChange={(e) => setFormData({ ...formData, rentPrice: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openingHours">Horarios de Atención</Label>
                  <Input
                    id="openingHours"
                    placeholder="Ej: Lun-Vie 9-18hs"
                    value={formData.openingHours}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  placeholder="Información adicional sobre la peluquería..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {/* Imagen */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Imagen del Local</h3>
              
              <div className="space-y-2">
                <Label htmlFor="image">Cargar Imagen</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="flex-1"
                  />
                  {imagePreview && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Formato: JPG, PNG. Tamaño máximo: 5MB
                </p>
                {imagePreview && (
                  <div className="mt-2 rounded-lg overflow-hidden border">
                    <img 
                      src={imagePreview} 
                      alt="Vista previa" 
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Personal */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Personal</h3>
              
              <div className="space-y-2">
                <Label>Agregar Empleados</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del empleado"
                    value={newStaff}
                    onChange={(e) => setNewStaff(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddStaff()}
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
                        <button
                          onClick={() => handleRemoveStaff(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
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
              {editingSalon ? "Guardar Cambios" : "Crear Peluquería"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}