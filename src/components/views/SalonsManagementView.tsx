import React, { useState, useCallback, lazy } from "react";
import { Plus, Users, MapPin, Upload, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
// import { GenericActionBar } from "../GenericActionBar";
const ServicesPanel = lazy(() => import("../ServicesPanel").then(m => ({ default: m.ServicesPanel })));
import { toast } from "sonner";

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
      toast.error("Por favor completa todos los campos requeridos (Nombre y DirecciÃ³n)");
      return;
    }

    const dataToSave = {
      ...formData,
      image: imagePreview || "https://images.unsplash.com/photo-1560066984-138dadb4c035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    };

    if (editingSalon) {
      onEditSalon(editingSalon.id, dataToSave);
      toast.success("PeluquerÃ­a actualizada correctamente");
    } else {
      onAddSalon(dataToSave);
      toast.success("PeluquerÃ­a creada correctamente");
    }
    setDialogOpen(false);
  };

  const handleDelete = (salon: Salon) => {
    if (confirm(`Â¿EstÃ¡s seguro de eliminar "${salon.name}"?`)) {
      onDeleteSalon(salon.id);
      toast.success("PeluquerÃ­a eliminada");
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
          <h1>GestiÃ³n de PeluquerÃ­as</h1>
          <p className="text-muted-foreground text-sm">Administra tus sucursales y personal</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva PeluquerÃ­a
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

      {selectedSalon && (
        <div className="mt-6 space-y-4">
          <h3 className="mb-3">Detalle de {selectedSalon.name}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="text-sm"><span className="text-muted-foreground">Dirección:</span> {selectedSalon.address || "No especificada"}</div>
            <div className="text-sm"><span className="text-muted-foreground">Teléfono:</span> {selectedSalon.phone || "No especificado"}</div>
            <div className="text-sm"><span className="text-muted-foreground">Email:</span> {selectedSalon.email || "No especificado"}</div>
            <div className="text-sm"><span className="text-muted-foreground">Alquiler:</span> {selectedSalon.rentPrice ? `$${selectedSalon.rentPrice.toLocaleString()}/mes` : "No especificado"}</div>
            <div className="text-sm"><span className="text-muted-foreground">Horarios:</span> {selectedSalon.openingHours || "No especificado"}</div>
            <div className="text-sm"><span className="text-muted-foreground">Personal:</span> {(selectedSalon.staff?.length || 0)} empleados</div>
          </div>
          {selectedSalon.notes && (
            <div className="text-sm"><span className="text-muted-foreground">Notas:</span> {selectedSalon.notes}</div>
          )}
          {selectedSalon.staff && selectedSalon.staff.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedSalon.staff.map((m, i) => (
                <Badge key={i} variant="secondary">{m}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedSalon && (
        <div className="mt-6">
          <h3 className="mb-3">Servicios de {selectedSalon.name}</h3>
          <React.Suspense fallback={<div>Cargando servicios...</div>}>
            <ServicesPanel services={[]} onChange={(s) => { /* conectar con estado en App */ }} />
          </React.Suspense>
        </div>
      )}

      {/* Generic Action Bar eliminado */}
    </div>
  );
}



