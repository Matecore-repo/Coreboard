import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Appointment } from "./AppointmentCard";

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description?: string;
}

interface ServicesPanelProps {
  services?: Service[];
  onChange?: (services: Service[]) => void;
}

export function ServicesPanel({ services = [], onChange }: ServicesPanelProps) {
  const [localServices, setLocalServices] = useState<Service[]>(services);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);

  const addNew = () => {
    const newService: Service = { id: Date.now().toString(), name: "Nuevo Servicio", price: 0, durationMinutes: 30 };
    const updated = [newService, ...localServices];
    setLocalServices(updated);
    onChange?.(updated);
  };

  const saveEdit = (id: string) => {
    if (!editing) return;
    const updated = localServices.map(s => s.id === id ? { ...s, ...(editing as Service) } : s);
    setLocalServices(updated);
    setEditing(null);
    onChange?.(updated);
  };

  const remove = (id: string) => {
    const updated = localServices.filter(s => s.id !== id);
    setLocalServices(updated);
    onChange?.(updated);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Servicios</h4>
        <Button size="sm" onClick={addNew}>Agregar</Button>
      </div>

      <div className="space-y-2">
        {localServices.map((s) => (
          <div key={s.id} className="p-2 border rounded-md flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{s.name}</p>
                <span className="text-muted-foreground text-xs">· {s.durationMinutes} min</span>
              </div>
              <p className="text-muted-foreground text-sm">${s.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>Editar</Button>
              <Button size="sm" variant="destructive" onClick={() => remove(s.id)}>Eliminar</Button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="mt-3 p-3 border rounded-md">
          <div className="grid grid-cols-1 gap-2">
            <Label>Nombre</Label>
            <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Label>Precio</Label>
            <Input type="number" value={editing.price?.toString() || "0"} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            <Label>Duración (min)</Label>
            <Input type="number" value={editing.durationMinutes?.toString() || "30"} onChange={(e) => setEditing({ ...editing, durationMinutes: Number(e.target.value) })} />
            <div className="flex gap-2 mt-2">
              <Button onClick={() => { if (editing?.id) saveEdit(editing.id as string); }}>Guardar</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServicesPanel;


