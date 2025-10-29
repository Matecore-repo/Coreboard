import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { useServices } from "../../hooks/useServices";
import { useAuth } from "../../contexts/AuthContext";
import { Trash2, Edit3, Plus } from "lucide-react";

export function SettingsView() {
  const { currentOrgId } = useAuth();
  const { services, createService, updateService, deleteService, isLoading } = useServices(currentOrgId ?? undefined);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    base_price: 0,
    duration_minutes: 30,
  });

  const handleAddNew = () => {
    setFormData({ name: "", base_price: 0, duration_minutes: 30 });
    setIsCreating(true);
    setEditingId(null);
  };

  const handleEdit = (service: any) => {
    setFormData({
      name: service.name,
      base_price: service.base_price,
      duration_minutes: service.duration_minutes,
    });
    setEditingId(service.id);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre del servicio es requerido");
      return;
    }
    
    if (!currentOrgId) {
      toast.error("Organización no seleccionada");
      return;
    }

    try {
      if (editingId) {
        await updateService(editingId, formData);
        toast.success("Servicio actualizado");
      } else {
        await createService({
          name: formData.name,
          base_price: formData.base_price,
          duration_minutes: formData.duration_minutes,
          active: true,
          org_id: currentOrgId || '',
        } as any);
        toast.success("Servicio creado");
      }
      setFormData({ name: "", base_price: 0, duration_minutes: 30 });
      setIsCreating(false);
      setEditingId(null);
    } catch (error) {
      toast.error("Error al guardar servicio");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este servicio?")) return;
    
    try {
      await deleteService(id);
      toast.success("Servicio eliminado");
    } catch (error) {
      toast.error("Error al eliminar servicio");
      console.error(error);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", base_price: 0, duration_minutes: 30 });
    setIsCreating(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Servicios</CardTitle>
          <CardDescription>Administra los servicios disponibles en tu organización</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {isLoading ? (
            <p className="text-muted-foreground">Cargando servicios...</p>
          ) : services.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">No hay servicios creados</p>
              <Button onClick={handleAddNew}>+ Crear primer servicio</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${service.base_price} - {service.duration_minutes} min
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulario de creación/edición */}
          {(isCreating || editingId) && (
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3">
                {editingId ? "Editar Servicio" : "Nuevo Servicio"}
              </h4>
              <div className="space-y-3">
                <div>
                  <Label>Nombre del servicio</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Corte, Teñido, Manicure"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Precio base ($)</Label>
                    <Input
                      type="number"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label>Duración (minutos)</Label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                      min="5"
                      step="5"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave}>
                    {editingId ? "Actualizar" : "Crear"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isCreating && !editingId && services.length > 0 && (
            <Button onClick={handleAddNew} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Agregar servicio
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsView;
