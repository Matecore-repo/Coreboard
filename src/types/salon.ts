// ============================================================================
// TIPOS PARA SALÓN
// ============================================================================
// Define las interfaces para salones y servicios

/**
 * Interface SalonService
 * Representa un servicio ofrecido en un salón
 */
export interface SalonService {
  id: string;              // ID único del servicio
  name: string;            // Nombre del servicio (ej: "Corte")
  price: number;           // Precio del servicio
  durationMinutes: number; // Duración en minutos
}

/**
 * Interface Salon
 * Representa un salón de belleza completo
 */
export interface Salon {
  id: string;              // ID único del salón
  name: string;            // Nombre del salón
  address: string;         // Dirección del salón
  image: string;           // URL de imagen del salón
  staff?: string[];        // Lista de estilistas
  rentPrice?: number;      // Precio de alquiler mensual
  phone?: string;          // Teléfono del salón
  email?: string;          // Email del salón
  notes?: string;          // Notas adicionales
  openingHours?: string;   // Horarios de apertura
  services?: SalonService[]; // Servicios disponibles
}
