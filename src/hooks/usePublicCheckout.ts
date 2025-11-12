import { useState, useCallback, useEffect } from 'react';
import { toastError } from '../lib/toast';
import { useAuth } from '../contexts/AuthContext';
import { getClient } from '../lib/supabase';

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

export interface PaymentLinkConfig {
  id: string;
  org_id: string;
  salon_id: string;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  salon: any;
  organization: any;
}

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

export interface Stylist {
  id: string;
  full_name: string;
  email: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface CheckoutData {
  serviceId: string | null;
  stylistId: string | null;
  date: Date | null;
  time: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
}

export function usePublicCheckout(token: string) {
  const { session } = useAuth();
  const [config, setConfig] = useState<PaymentLinkConfig | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    serviceId: null,
    stylistId: null,
    date: null,
    time: null,
    clientName: '',
    clientPhone: '',
    clientEmail: '',
  });
  
  const [loading, setLoading] = useState({
    config: true,
    services: false,
    stylists: false,
    availability: false,
    creating: false,
  });
  
  const [error, setError] = useState<string | null>(null);

  // Obtener token de autenticación de Supabase
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!session) return null;
    try {
      const supabase = getClient();
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      return currentSession?.access_token || null;
    } catch (error) {
      console.error('Error obteniendo token de autenticación:', error);
      return null;
    }
  }, [session]);

  // Cargar configuración del payment link
  const loadConfig = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, config: true }));
      const authToken = await getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${FUNCTIONS_URL}/get-payment-link-config?token=${encodeURIComponent(token)}`, {
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error cargando configuración del link');
      }
      
      const data = await response.json();
      setConfig(data);
      setError(null);
    } catch (err: any) {
      console.error('Error cargando configuración:', err);
      setError(err.message || 'Error cargando configuración del link');
      toastError(err.message || 'Error cargando configuración del link');
    } finally {
      setLoading(prev => ({ ...prev, config: false }));
    }
  }, [getAuthToken, token]);

  // Cargar servicios del salón
  const loadServices = useCallback(async (salonId: string) => {
    try {
      setLoading(prev => ({ ...prev, services: true }));
      const authToken = await getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(
        `${FUNCTIONS_URL}/public-get-salon-services?salon_id=${encodeURIComponent(salonId)}&token=${encodeURIComponent(token)}`,
        { headers }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error cargando servicios');
      }
      
      const data = await response.json();
      setServices(data.services || []);
    } catch (err: any) {
      console.error('Error cargando servicios:', err);
      toastError(err.message || 'Error cargando servicios');
    } finally {
      setLoading(prev => ({ ...prev, services: false }));
    }
  }, [getAuthToken, token]);

  // Cargar estilistas del salón
  const loadStylists = useCallback(async (salonId: string) => {
    try {
      setLoading(prev => ({ ...prev, stylists: true }));
      const authToken = await getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(
        `${FUNCTIONS_URL}/public-get-salon-stylists?salon_id=${encodeURIComponent(salonId)}&token=${encodeURIComponent(token)}`,
        { headers }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error cargando estilistas');
      }
      
      const data = await response.json();
      setStylists(data.stylists || []);
    } catch (err: any) {
      console.error('Error cargando estilistas:', err);
      toastError(err.message || 'Error cargando estilistas');
    } finally {
      setLoading(prev => ({ ...prev, stylists: false }));
    }
  }, [getAuthToken, token]);

  // Cargar disponibilidad de horarios
  const loadAvailability = useCallback(async (
    salonId: string,
    serviceId: string,
    stylistId: string | null,
    date: Date
  ) => {
    try {
      setLoading(prev => ({ ...prev, availability: true }));
      const dateStr = date.toISOString().split('T')[0];
      const stylistParam = stylistId || 'any';
      const authToken = await getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(
        `${FUNCTIONS_URL}/public-get-availability?salon_id=${encodeURIComponent(salonId)}&service_id=${encodeURIComponent(serviceId)}&stylist_id=${encodeURIComponent(stylistParam)}&date=${encodeURIComponent(dateStr)}&token=${encodeURIComponent(token)}`,
        { headers }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error cargando disponibilidad');
      }
      
      const data = await response.json();
      setTimeSlots(data.slots || []);
    } catch (err: any) {
      console.error('Error cargando disponibilidad:', err);
      toastError(err.message || 'Error cargando disponibilidad');
      setTimeSlots([]);
    } finally {
      setLoading(prev => ({ ...prev, availability: false }));
    }
  }, [getAuthToken, token]);

  // Crear turno y redirigir a Mercado Pago
  const createAppointment = useCallback(async (): Promise<string | null> => {
    if (!config || !checkoutData.serviceId || !checkoutData.date || !checkoutData.time || !checkoutData.clientName) {
      toastError('Por favor completa todos los campos requeridos');
      return null;
    }

    try {
      setLoading(prev => ({ ...prev, creating: true }));
      
      // Combinar fecha y hora
      const [hours, minutes] = checkoutData.time.split(':').map(Number);
      const appointmentDate = new Date(checkoutData.date);
      appointmentDate.setHours(hours, minutes, 0, 0);
      
      // Obtener precio del servicio
      const service = services.find(s => s.id === checkoutData.serviceId);
      const amount = service?.price || 0;
      
      const authToken = await getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${FUNCTIONS_URL}/public-create-appointment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          token,
          salon_id: config.salon_id,
          service_id: checkoutData.serviceId,
          stylist_id: checkoutData.stylistId || null,
          client_name: checkoutData.clientName,
          client_phone: checkoutData.clientPhone || null,
          client_email: checkoutData.clientEmail || null,
          starts_at: appointmentDate.toISOString(),
          amount,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error creando turno');
      }
      
      const data = await response.json();
      return data.init_point || data.sandbox_init_point || null;
    } catch (err: any) {
      console.error('Error creando turno:', err);
      toastError(err.message || 'Error creando turno');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, creating: false }));
    }
  }, [getAuthToken, token, config, checkoutData, services]);

  // Cargar configuración al montar
  useEffect(() => {
    if (token) {
      loadConfig();
    }
  }, [token, loadConfig]);

  // Cargar servicios cuando se carga la configuración
  useEffect(() => {
    if (config?.salon_id) {
      loadServices(config.salon_id);
      loadStylists(config.salon_id);
    }
  }, [config, loadServices, loadStylists]);

  // Cargar disponibilidad cuando cambian servicio, estilista o fecha
  useEffect(() => {
    if (config?.salon_id && checkoutData.serviceId && checkoutData.date) {
      loadAvailability(
        config.salon_id,
        checkoutData.serviceId,
        checkoutData.stylistId,
        checkoutData.date
      );
    }
  }, [config, checkoutData.serviceId, checkoutData.stylistId, checkoutData.date, loadAvailability]);

  return {
    config,
    services,
    stylists,
    timeSlots,
    checkoutData,
    setCheckoutData,
    loading,
    error,
    createAppointment,
    loadAvailability,
  };
}

