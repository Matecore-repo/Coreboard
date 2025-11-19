import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "../../ui/command";
import { CustomDatePicker } from "../../ui/DatePicker";
import { TimePicker } from "../../ui/TimePicker";
import { useSalonEmployees } from "../../../hooks/useSalonEmployees";
import { useSalonServices } from "../../../hooks/useSalonServices";
import { useTurnos } from "../../../hooks/useTurnos";
import { useClients } from "../../../hooks/useClients";
import { useAuth } from "../../../contexts/AuthContext";
import { Appointment } from "./AppointmentCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { toastSuccess, toastError } from "../../../lib/toast";
import { Loader2, Info, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../../ui/utils";
import type { Turno } from "../../../stores/turnosStore";

interface Salon {
  id: string;
  name: string;
  address: string;
  image: string;
  staff?: string[];
  services?: { id: string; name: string; price: number; durationMinutes: number }[];
}

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (appointment: Partial<Appointment>) => void;
  appointment?: Appointment | null;
  salonId: string | null;
  salons: Salon[];
}

export function AppointmentDialog({
  open,
  onOpenChange,
  onSave,
  appointment,
  salonId,
  salons,
}: AppointmentDialogProps) {
  const defaultSalonId = (salonId && salonId !== 'all') ? salonId : (salons && salons.length > 0 ? salons[0].id : "");

  const [formData, setFormData] = useState<Partial<Appointment & {
    discountAmount?: number;
    taxAmount?: number;
    tipAmount?: number;
    paymentMethod?: string;
    directCost?: number;
    bookingSource?: string;
    campaignCode?: string;
    listPrice?: number;
    totalCollected?: number;
  }>>({
    clientName: "",
    date: "",
    time: "",
    status: "pending",
    salonId: defaultSalonId,
    service: "",
    stylist: "",
    discountAmount: 0,
    taxAmount: 0,
    tipAmount: 0,
    paymentMethod: "cash",
    directCost: 0,
    bookingSource: "mostrador",
    campaignCode: "",
    listPrice: 0,
    totalCollected: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const currentSalonId = (formData.salonId || salonId || undefined) === 'all' ? undefined : (formData.salonId || salonId || undefined);
  const { assignments: salonEmployees, isLoading: loadingEmployees } = useSalonEmployees(currentSalonId, { enabled: open && !!currentSalonId });
  const { services: salonServices, loading: loadingServices } = useSalonServices(currentSalonId, { enabled: open && !!currentSalonId });
  const { currentOrgId } = useAuth();
  const { clients, loading: loadingClients } = useClients(currentOrgId ?? undefined);
  
  // Usar useTurnos para validaciones y acciones
  const { createTurno, updateTurno, validateTurno, checkConflicts } = useTurnos({
    salonId: currentSalonId,
    enabled: open && !!currentSalonId
  });
  
  // Estado para el autocompletado de clientes
  const [clientOpen, setClientOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  
  // Filtrar clientes según búsqueda
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) {
      return clients.slice(0, 10); // Mostrar primeros 10 si no hay búsqueda
    }
    const searchLower = clientSearch.toLowerCase();
    return clients.filter(client => 
      client.full_name.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.includes(searchLower)
    ).slice(0, 10);
  }, [clients, clientSearch]);

  // Obtener precio del servicio seleccionado
  const selectedService = useMemo(() => {
    if (!formData.service) return null;
    return salonServices.find((s) => s.service_id === formData.service) ?? null;
  }, [formData.service, salonServices]);

  const selectedServicePrice = useMemo(() => {
    if (!selectedService) return null;
    return selectedService.price_override ?? selectedService.base_price ?? 0;
  }, [selectedService]);

  // Validación en tiempo real mejorada
  const validateField = (field: string, value: any) => {
    const newErrors: Record<string, string> = { ...errors };
    
    switch (field) {
      case 'clientName':
        if (!value || value.trim().length === 0) {
          newErrors.clientName = 'El nombre del cliente es requerido';
        } else if (value.trim().length < 2) {
          newErrors.clientName = 'El nombre debe tener al menos 2 caracteres';
        } else if (value.trim().length > 100) {
          newErrors.clientName = 'El nombre no puede exceder 100 caracteres';
        } else {
          delete newErrors.clientName;
        }
        break;
      case 'service':
        if (!value) {
          newErrors.service = 'Debes seleccionar un servicio';
        } else {
          delete newErrors.service;
        }
        break;
      case 'date':
        if (!value) {
          newErrors.date = 'La fecha es requerida';
        } else {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            newErrors.date = 'No puedes seleccionar una fecha pasada';
          } else {
            // Validar que no sea más de 1 año en el futuro
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() + 1);
            if (selectedDate > maxDate) {
              newErrors.date = 'No puedes agendar más de 1 año en el futuro';
            } else {
              // Si hay hora seleccionada, validar que fecha+hora no sea en el pasado
              if (formData.time) {
                const appointmentDateTime = new Date(`${value}T${formData.time}`);
                const now = new Date();
                if (appointmentDateTime < now) {
                  newErrors.date = 'La fecha y hora no pueden ser en el pasado';
                } else {
                  delete newErrors.date;
                }
              } else {
                delete newErrors.date;
              }
            }
          }
        }
        break;
      case 'time':
        if (!value) {
          newErrors.time = 'La hora es requerida';
        } else {
          // Validar formato de hora
          const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(value)) {
            newErrors.time = 'Formato de hora inválido';
          } else {
            // Si hay fecha seleccionada, validar que fecha+hora no sea en el pasado
            if (formData.date) {
              const appointmentDateTime = new Date(`${formData.date}T${value}`);
              const now = new Date();
              if (appointmentDateTime < now) {
                newErrors.time = 'La fecha y hora no pueden ser en el pasado';
              } else {
                delete newErrors.time;
              }
            } else {
              delete newErrors.time;
            }
          }
        }
        break;
      case 'salonId':
        if (!value || value === 'all') {
          newErrors.salonId = 'Debes seleccionar un local';
        } else {
          delete newErrors.salonId;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  // Verificar si el formulario es válido
  const isFormValid = useMemo(() => {
    return !!formData.clientName && 
           !!formData.service && 
           !!formData.date && 
           !!formData.time && 
           !!formData.salonId && 
           formData.salonId !== 'all' &&
           Object.keys(errors).length === 0;
  }, [formData.clientName, formData.service, formData.date, formData.time, formData.salonId, errors]);

  useEffect(() => {
    if (appointment) {
      setFormData({
        clientName: appointment.clientName || "",
        date: appointment.date || "",
        time: appointment.time || "",
        status: appointment.status || "pending",
        salonId: appointment.salonId || defaultSalonId,
        service: appointment.service || "",
        stylist: appointment.stylist || "",
        discountAmount: (appointment as any).discountAmount || 0,
        taxAmount: (appointment as any).taxAmount || 0,
        tipAmount: (appointment as any).tipAmount || 0,
        paymentMethod: (appointment as any).paymentMethod || "cash",
        directCost: (appointment as any).directCost || 0,
        bookingSource: (appointment as any).bookingSource || "mostrador",
        campaignCode: (appointment as any).campaignCode || "",
        listPrice: (appointment as any).listPrice || 0,
        totalCollected: (appointment as any).totalCollected || 0,
      });
    } else {
      setFormData({
        clientName: "",
        date: "",
        time: "",
        status: "pending",
        salonId: defaultSalonId,
        service: "",
        stylist: "",
        discountAmount: 0,
        taxAmount: 0,
        tipAmount: 0,
        paymentMethod: "cash",
        directCost: 0,
        bookingSource: "mostrador",
        campaignCode: "",
        listPrice: 0,
        totalCollected: 0,
      });
    }
  }, [appointment, open, salonId, defaultSalonId]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field as keyof typeof formData]);
  };

  const handleSave = async () => {
    // Marcar todos los campos como tocados
    const allFields = ['clientName', 'service', 'date', 'time', 'salonId'];
    const newTouched: Record<string, boolean> = {};
    allFields.forEach(field => {
      newTouched[field] = true;
      validateField(field, formData[field as keyof typeof formData]);
    });
    setTouched(newTouched);

    if (!isFormValid) {
      toastError('Por favor completa todos los campos requeridos correctamente');
      return;
    }
    if (formData.clientName && !/\p{L}/u.test(formData.clientName)) {
      toastError('El nombre del cliente debe incluir al menos una letra.');
      return;
    }

    // Si no hay salonId seleccionado o es 'all', usar el primer salón disponible
    let targetSalonId = formData.salonId;
    if (!targetSalonId || targetSalonId === 'all') {
      if (salons && salons.length > 0) {
        targetSalonId = salons[0].id;
        setFormData({ ...formData, salonId: targetSalonId });
      } else {
        toastError('No hay locales disponibles');
        return;
      }
    }
    
    setIsSaving(true);
    try {
      if (appointment) {
        // Edición: solo enviar campos que realmente cambiaron
        const turnoData: Partial<Turno> = {};
        
        // Comparar campos básicos
        if (formData.clientName !== appointment.clientName) {
          turnoData.clientName = formData.clientName;
        }
        if (formData.service !== appointment.service) {
          turnoData.service = formData.service || '';
          turnoData.serviceName = selectedService?.service_name;
          // Recalcular total_amount cuando cambia el servicio
          turnoData.total_amount = selectedServicePrice ?? 0;
        }
        if (formData.date !== appointment.date) {
          turnoData.date = formData.date;
        }
        if (formData.time !== appointment.time) {
          turnoData.time = formData.time;
        }
        if (formData.status !== appointment.status) {
          turnoData.status = formData.status || 'pending';
        }
        // Solo incluir stylist si realmente cambió
        const currentStylist = formData.stylist || undefined;
        const existingStylist = appointment.stylist || undefined;
        if (currentStylist !== existingStylist) {
          turnoData.stylist = currentStylist === '' || currentStylist === null ? undefined : currentStylist;
        }
        if (targetSalonId !== appointment.salonId) {
          turnoData.salonId = targetSalonId;
        }
        const currentNotes = (formData as any).notes || '';
        const existingNotes = (appointment as any).notes || '';
        if (currentNotes !== existingNotes) {
          turnoData.notes = currentNotes;
        }
        
        // Si hay cambios, actualizar
        if (Object.keys(turnoData).length > 0) {
          await updateTurno(appointment.id, turnoData);
          toastSuccess('Turno actualizado correctamente');
        } else {
          // No hay cambios, solo cerrar
          toastSuccess('No se realizaron cambios');
        }
      } else {
        // Creación: enviar todos los campos requeridos
        const turnoData = {
          clientName: formData.clientName,
          service: formData.service || '',
          serviceName: selectedService?.service_name,
          servicePrice: selectedServicePrice ?? undefined,
          date: formData.date,
          time: formData.time,
          status: formData.status || 'pending',
          stylist: formData.stylist || undefined,
          salonId: targetSalonId,
          notes: (formData as any).notes || '',
          paymentMethod: formData.paymentMethod || 'cash',
          total_amount: selectedServicePrice || 0,
          discountAmount: formData.discountAmount || 0,
          taxAmount: formData.taxAmount || 0,
          tipAmount: formData.tipAmount || 0,
          totalCollected: formData.totalCollected || 0,
          directCost: formData.directCost || 0,
          bookingSource: formData.bookingSource || 'mostrador',
          campaignCode: formData.campaignCode || '',
        };
        
        // Validar antes de guardar
        const validation = validateTurno(turnoData);
        if (!validation.valid) {
          toastError(validation.message || 'Error de validación');
          setIsSaving(false);
          return;
        }
        
        // Verificar conflictos para nuevos turnos (ya incluye duración real del servicio)
        const conflictCheck = checkConflicts(turnoData);
        if (!conflictCheck.valid) {
          const conflictMessage = conflictCheck.message || 'Hay un conflicto de horarios';
          toastError(conflictMessage);
          setIsSaving(false);
          return;
        }
        
        await createTurno(turnoData);
        toastSuccess('Turno creado correctamente');
      }
      
      // Llamar callback original para compatibilidad
      onSave(formData);
      onOpenChange(false);
      // Limpiar errores y touched al cerrar
      setErrors({});
      setTouched({});
    } catch (error: any) {
      console.error('Error guardando turno:', error);
      toastError(error?.message || 'Error al guardar el turno');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="appointment-dialog-title"
        aria-describedby="appointment-dialog-description"
        aria-modal="true"
        data-modal="appointment"
      >
        <DialogHeader>
          <DialogTitle id="appointment-dialog-title">
            {appointment ? "Editar Turno" : "Nuevo Turno"}
          </DialogTitle>
          <DialogDescription id="appointment-dialog-description">
            {appointment 
              ? "Modifica los detalles del turno existente." 
              : "Completa el formulario para crear un nuevo turno."}
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4 py-4" role="form" aria-label="Formulario de turno">
          <div className="grid gap-2">
            <Label htmlFor="salon_id">
              Local <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.salonId}
              onValueChange={(value) => handleFieldChange('salonId', value)}
            >
              <SelectTrigger 
                id="salon_id"
                aria-invalid={touched.salonId && !!errors.salonId}
                aria-label="Seleccionar local"
                aria-required="true"
                className={touched.salonId && errors.salonId ? "border-destructive" : ""}
                data-field="salon-id"
              >
                <SelectValue placeholder="Seleccionar local" />
              </SelectTrigger>
              <SelectContent>
                {salons.map((salon) => (
                  <SelectItem key={salon.id} value={salon.id} aria-label={`Local: ${salon.name}`}>
                    {salon.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {touched.salonId && errors.salonId && (
              <p className="text-sm text-destructive" role="alert" aria-live="polite">
                {errors.salonId}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client_name">
              Nombre del cliente <span className="text-destructive">*</span>
            </Label>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientOpen}
                  aria-label="Seleccionar cliente"
                  className={cn(
                    "w-full justify-between",
                    touched.clientName && errors.clientName ? "border-destructive" : "",
                    !formData.clientName && "text-muted-foreground"
                  )}
                  data-field="client-name"
                >
                  {formData.clientName || "Buscar o ingresar cliente..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Buscar cliente por nombre, email o teléfono..." 
                    value={clientSearch}
                    onValueChange={setClientSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {loadingClients ? "Cargando clientes..." : "No se encontraron clientes. Puedes escribir un nombre nuevo."}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredClients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.full_name}
                          onSelect={() => {
                            handleFieldChange('clientName', client.full_name);
                            setClientOpen(false);
                            setClientSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.clientName === client.full_name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{client.full_name}</span>
                            {(client.email || client.phone) && (
                              <span className="text-xs text-muted-foreground">
                                {client.email && client.phone 
                                  ? `${client.email} • ${client.phone}`
                                  : client.email || client.phone}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Input
              id="client_name_input"
              value={formData.clientName}
              onChange={(e) => {
                handleFieldChange('clientName', e.target.value);
                setClientSearch(e.target.value);
              }}
              onBlur={() => handleFieldBlur('clientName')}
              placeholder="O escribe un nombre nuevo..."
              aria-invalid={touched.clientName && !!errors.clientName}
              aria-label="Nombre del cliente (campo de texto)"
              aria-required="true"
              className={cn(
                touched.clientName && errors.clientName ? "border-destructive" : "",
                "mt-2"
              )}
              data-field="client-name-input"
            />
            {touched.clientName && errors.clientName && (
              <p className="text-sm text-destructive" role="alert" aria-live="polite">
                {errors.clientName}
              </p>
            )}
            {formData.clientName && !loadingClients && !clients.find(c => c.full_name.toLowerCase() === formData.clientName?.toLowerCase()) && (
              <p className="text-xs text-muted-foreground">
                Este cliente será creado automáticamente al guardar el turno
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="service">
              Servicio <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.service || ""}
              onValueChange={(value) => handleFieldChange('service', value)}
            >
              <SelectTrigger 
                id="service"
                aria-invalid={touched.service && !!errors.service}
                aria-label="Seleccionar servicio"
                aria-required="true"
                className={touched.service && errors.service ? "border-destructive" : ""}
                data-field="service"
              >
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {loadingServices ? (
                  <SelectItem value="loading" disabled>Cargando servicios...</SelectItem>
                ) : salonServices.length > 0 ? (
                  salonServices.map((svc) => (
                    <SelectItem key={svc.service_id} value={svc.service_id}>
                      {svc.service_name} - ${svc.price_override || svc.base_price}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-services" disabled>No hay servicios asignados</SelectItem>
                )}
              </SelectContent>
            </Select>
            {touched.service && errors.service && (
              <p className="text-sm text-destructive">{errors.service}</p>
            )}
            {formData.service && selectedServicePrice !== null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Precio del servicio: <strong className="text-foreground">${selectedServicePrice.toLocaleString()}</strong></span>
                {(() => {
                  const selectedService = salonServices.find(s => s.service_id === formData.service);
                  const duration = selectedService?.duration_override ?? selectedService?.duration_minutes;
                  return duration ? (
                    <span className="text-xs">• Duración: {duration} min</span>
                  ) : null;
                })()}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Este precio se calculará automáticamente al guardar el turno</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">
                Fecha <span className="text-destructive">*</span>
              </Label>
              <CustomDatePicker
                id="date"
                value={formData.date || ""}
                onChange={(value) => handleFieldChange('date', value)}
                onBlur={() => handleFieldBlur('date')}
                placeholder="Selecciona una fecha"
                minDate={new Date()}
                aria-invalid={touched.date && !!errors.date}
                className={touched.date && errors.date ? "border-destructive" : ""}
              />
              {touched.date && errors.date && (
                <p className="text-sm text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time">
                Hora <span className="text-destructive">*</span>
              </Label>
              <TimePicker
                id="time"
                value={formData.time || ""}
                onChange={(value) => handleFieldChange('time', value)}
                onBlur={() => handleFieldBlur('time')}
                placeholder="HH:MM"
                aria-invalid={touched.time && !!errors.time}
                className={touched.time && errors.time ? "border-destructive" : ""}
              />
              {touched.time && errors.time && (
                <p className="text-sm text-destructive">{errors.time}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stylist">Estilista (Opcional)</Label>
            <Select
              value={formData.stylist || "none"}
              onValueChange={(value) => {
                setFormData((prev) => ({ ...prev, stylist: value === "none" ? "" : value }));
              }}
            >
              <SelectTrigger id="stylist" aria-label="Seleccionar estilista" data-field="stylist">
                <SelectValue placeholder="Seleccionar estilista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {loadingEmployees ? (
                  <SelectItem value="loading-employees" disabled>Cargando empleados...</SelectItem>
                ) : salonEmployees.length > 0 ? (
                  salonEmployees.map((assignment) => (
                    <SelectItem
                      key={assignment.employee_id}
                      value={assignment.employee_id}
                      aria-label={`Estilista: ${assignment.employees?.full_name || `Empleado ${assignment.employee_id.substring(0, 8)}`}`}
                    >
                      {assignment.employees?.full_name || `Empleado ${assignment.employee_id.substring(0, 8)}`}
                    </SelectItem>
                  ))
                ) : null}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="payment-method-main">Método de Pago</Label>
            <Select
              value={formData.paymentMethod || "cash"}
              onValueChange={(value) => {
                setFormData((prev) => ({ ...prev, paymentMethod: value }));
              }}
            >
              <SelectTrigger id="payment-method-main" aria-label="Método de Pago" data-field="payment-method">
                <SelectValue placeholder="Seleccionar método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {appointment && (
            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status || "pending"}
                onValueChange={(value: any) => {
                  setFormData((prev) => ({ ...prev, status: value }));
                }}
              >
                <SelectTrigger id="status" aria-label="Estado del turno" data-field="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {appointment && formData.status === 'completed' && (
            <Tabs defaultValue="basic" className="w-full" role="tablist" aria-label="Secciones de información del turno">
              <TabsList role="tablist" aria-label="Navegación de secciones">
                <TabsTrigger value="basic" role="tab" aria-label="Información básica" aria-controls="basic-tabpanel">Básico</TabsTrigger>
                <TabsTrigger value="financial" role="tab" aria-label="Información financiera" aria-controls="financial-tabpanel">Financiero</TabsTrigger>
              </TabsList>
              
              <TabsContent value="financial" className="space-y-4 mt-4" role="tabpanel" id="financial-tabpanel" aria-label="Información financiera del turno" aria-labelledby="financial-tab">
                <div className="grid gap-2" role="group" aria-label="Campos financieros">
                  <Label htmlFor="list-price">Precio de Lista</Label>
                  <Input
                    id="list-price"
                    type="number"
                    step="0.01"
                    value={formData.listPrice || 0}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, listPrice: parseFloat(e.target.value) || 0 }));
                    }}
                    placeholder="0.00"
                    aria-label="Precio de lista"
                    data-field="list-price"
                  />
                </div>

                <div className="grid gap-2" role="group" aria-label="Campos financieros">
                  <Label htmlFor="discount-amount">Descuento</Label>
                  <Input
                    id="discount-amount"
                    type="number"
                    step="0.01"
                    value={formData.discountAmount || 0}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }));
                    }}
                    placeholder="0.00"
                    aria-label="Descuento"
                    data-field="discount-amount"
                  />
                </div>

                <div className="grid gap-2" role="group" aria-label="Campos financieros">
                  <Label htmlFor="tax-amount">Impuestos (IVA)</Label>
                  <Input
                    id="tax-amount"
                    type="number"
                    step="0.01"
                    value={formData.taxAmount || 0}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, taxAmount: parseFloat(e.target.value) || 0 }));
                    }}
                    placeholder="0.00"
                    aria-label="Impuestos IVA"
                    data-field="tax-amount"
                  />
                </div>

                <div className="grid gap-2" role="group" aria-label="Campos financieros">
                  <Label htmlFor="tip-amount">Propina</Label>
                  <Input
                    id="tip-amount"
                    type="number"
                    step="0.01"
                    value={formData.tipAmount || 0}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, tipAmount: parseFloat(e.target.value) || 0 }));
                    }}
                    placeholder="0.00"
                    aria-label="Propina"
                    data-field="tip-amount"
                  />
                </div>

                <div className="grid gap-2" role="group" aria-label="Campos financieros">
                  <Label htmlFor="total-collected">Total Cobrado</Label>
                  <Input
                    id="total-collected"
                    type="number"
                    step="0.01"
                    value={formData.totalCollected || 0}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, totalCollected: parseFloat(e.target.value) || 0 }));
                    }}
                    placeholder="0.00"
                    aria-label="Total cobrado"
                    data-field="total-collected"
                  />
                </div>

                <div className="grid gap-2" role="group" aria-label="Campos financieros">
                  <Label htmlFor="payment-method-financial">Método de Pago</Label>
                  <Select
                    value={formData.paymentMethod || "cash"}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ ...prev, paymentMethod: value }));
                    }}
                  >
                    <SelectTrigger id="payment-method-financial" aria-label="Seleccionar método de pago" data-field="payment-method-financial">
                      <SelectValue placeholder="Seleccionar método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2" role="group" aria-label="Campos financieros">
                  <Label htmlFor="direct-cost">Costo Directo</Label>
                  <Input
                    id="direct-cost"
                    type="number"
                    step="0.01"
                    value={formData.directCost || 0}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, directCost: parseFloat(e.target.value) || 0 }));
                    }}
                    placeholder="0.00"
                    aria-label="Costo directo"
                    data-field="direct-cost"
                  />
                </div>

                <div className="grid gap-2" role="group" aria-label="Campos financieros">
                  <Label htmlFor="booking-source">Fuente de Reserva</Label>
                  <Select
                    value={formData.bookingSource || "mostrador"}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ ...prev, bookingSource: value }));
                    }}
                  >
                    <SelectTrigger id="booking-source" aria-label="Seleccionar fuente de reserva" data-field="booking-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="mostrador">Mostrador</SelectItem>
                      <SelectItem value="campaña">Campaña</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2" role="group" aria-label="Campos financieros">
                  <Label htmlFor="campaign-code">Código de Campaña/Cupón</Label>
                  <Input
                    id="campaign-code"
                    value={formData.campaignCode || ""}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, campaignCode: e.target.value }));
                    }}
                    placeholder="Código de promoción..."
                    aria-label="Código de campaña o cupón"
                    data-field="campaign-code"
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </form>

        <DialogFooter role="group" aria-label="Acciones del formulario de turno">
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              setErrors({});
              setTouched({});
            }}
            disabled={isSaving}
            aria-label="Cancelar creación/edición de turno"
            data-action="cancel-appointment"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isFormValid || isSaving}
            aria-label={appointment ? "Guardar cambios del turno" : "Crear nuevo turno"}
            data-action={appointment ? "update-appointment" : "create-appointment"}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
