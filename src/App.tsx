import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import {
  Calendar,
  Home,
  Users,
  Settings,
  Zap,
  DollarSign,
  Building2,
  Menu,
  LogOut,
} from "lucide-react";
import { SalonCarousel } from "./components/SalonCarousel";
import { AppointmentCard, Appointment } from "./components/AppointmentCard";
import { AppointmentDialog } from "./components/AppointmentDialog";
import { AppointmentActionBar } from "./components/AppointmentActionBar";
import { FloatingQuickActions } from "./components/FloatingQuickActions";
import { FilterBar } from "./components/FilterBar";
const HomeView = lazy(() => import("./components/views/HomeView").then((m) => ({ default: m.HomeView })));
const ClientsView = lazy(() => import("./components/views/ClientsView").then((m) => ({ default: m.ClientsView })));
const FinancesView = lazy(() => import("./components/views/FinancesView").then((m) => ({ default: m.FinancesView })));
const SettingsView = lazy(() => import("./components/views/SettingsView").then((m) => ({ default: m.SettingsView })));
const SalonsManagementView = lazy(() => import("./components/views/SalonsManagementView").then((m) => ({ default: m.SalonsManagementView })));
const LoginView = lazy(() => import("./components/views/LoginView").then((m) => ({ default: m.LoginView })));
import { Button } from "./components/ui/button";
import { ScrollArea } from "./components/ui/scroll-area";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./components/ui/sheet";
import { useIsMobile } from "./components/ui/use-mobile";
import { toast } from "sonner";
import { Toaster as Sonner } from "sonner";
import { useAuth } from "./contexts/AuthContext";
import ThemeBubble from "./components/ThemeBubble";
import DemoDataBubble from "./components/DemoDataBubble";
import DemoWelcomeModal from "./components/DemoWelcomeModal";
import { useAppointments as useDbAppointments } from "./hooks/useAppointments";
import { useSalons as useDbSalons } from "./hooks/useSalons";
import { OnboardingModal } from "./components/OnboardingModal";

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

const sampleSalons: Salon[] = [
  {
    id: "1",
    name: "Studio Elegance",
    address: "Av. Corrientes 1234, CABA",
    image: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBoYWlyJTIwc2Fsb24lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NTk5MzAyMjJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    staff: ["María García", "Ana Martínez", "Laura Fernández"],
  },
  {
    id: "2",
    name: "Barber Shop Premium",
    address: "Av. Santa Fe 3456, CABA",
    image: "https://images.unsplash.com/photo-1629881544138-c45fc917eb81?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXJiZXJzaG9wJTIwY2hhaXJ8ZW58MXx8fHwxNzU5OTM4NDQ4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    staff: ["Roberto Silva", "Diego Romero", "Carlos López"],
  },
  {
    id: "3",
    name: "Beauty Salon Luxe",
    address: "Av. Callao 789, CABA",
    image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbnxlbnwxfHx8fDE3NTk5Mzg0NDh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    staff: ["Patricia Gómez", "Laura Fernández"],
  },
  {
    id: "4",
    name: "Hair Studio Pro",
    address: "Av. Cabildo 2345, CABA",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwc3R5bGlzdHxlbnwxfHx8fDE3NTk5Mzg0NDh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    staff: ["Carlos López", "Ana Martínez"],
  },
];

const sampleAppointments: Appointment[] = [
  // Hoy - 2025-10-08
  {
    id: "1",
    clientName: "María González",
    service: "Corte y Coloración",
    date: "2025-10-08",
    time: "10:00",
    status: "completed",
    stylist: "María García",
    salonId: "1",
  },
  {
    id: "2",
    clientName: "Juan Pérez",
    service: "Corte",
    date: "2025-10-08",
    time: "11:30",
    status: "completed",
    stylist: "María García",
    salonId: "1",
  },
  {
    id: "3",
    clientName: "Laura Martínez",
    service: "Peinado",
    date: "2025-10-08",
    time: "14:00",
    status: "confirmed",
    stylist: "Ana Martínez",
    salonId: "2",
  },
  {
    id: "4",
    clientName: "Pedro Rodríguez",
    service: "Barba",
    date: "2025-10-08",
    time: "15:00",
    status: "confirmed",
    stylist: "Roberto Silva",
    salonId: "2",
  },
  {
    id: "5",
    clientName: "Sofía López",
    service: "Mechas",
    date: "2025-10-08",
    time: "16:30",
    status: "pending",
    stylist: "María García",
    salonId: "1",
  },
  {
    id: "6",
    clientName: "Carlos Fernández",
    service: "Tratamiento",
    date: "2025-10-08",
    time: "17:00",
    status: "confirmed",
    stylist: "Ana Martínez",
    salonId: "3",
  },
  {
    id: "7",
    clientName: "Ana Torres",
    service: "Coloración",
    date: "2025-10-08",
    time: "18:30",
    status: "pending",
    stylist: "María García",
    salonId: "3",
  },
  {
    id: "8",
    clientName: "Roberto Díaz",
    service: "Corte",
    date: "2025-10-08",
    time: "13:00",
    status: "completed",
    stylist: "Carlos López",
    salonId: "4",
  },
  {
    id: "9",
    clientName: "Lucía Ramírez",
    service: "Brushing",
    date: "2025-10-08",
    time: "12:00",
    status: "completed",
    stylist: "María García",
    salonId: "1",
  },
  {
    id: "10",
    clientName: "Diego Sánchez",
    service: "Corte y Barba",
    date: "2025-10-08",
    time: "14:30",
    status: "confirmed",
    stylist: "Roberto Silva",
    salonId: "2",
  },
  // Mañana - 2025-10-09
  {
    id: "11",
    clientName: "Valentina Castro",
    service: "Corte",
    date: "2025-10-09",
    time: "09:00",
    status: "confirmed",
    stylist: "María García",
    salonId: "1",
  },
  {
    id: "12",
    clientName: "Mateo Flores",
    service: "Coloración",
    date: "2025-10-09",
    time: "10:30",
    status: "pending",
    stylist: "Ana Martínez",
    salonId: "1",
  },
  {
    id: "13",
    clientName: "Isabella Romero",
    service: "Tratamiento Capilar",
    date: "2025-10-09",
    time: "11:00",
    status: "confirmed",
    stylist: "María García",
    salonId: "2",
  },
  {
    id: "14",
    clientName: "Sebastián Vargas",
    service: "Corte",
    date: "2025-10-09",
    time: "13:30",
    status: "pending",
    stylist: "Carlos López",
    salonId: "3",
  },
  {
    id: "15",
    clientName: "Camila Herrera",
    service: "Mechas Balayage",
    date: "2025-10-09",
    time: "15:00",
    status: "confirmed",
    stylist: "Ana Martínez",
    salonId: "1",
  },
  {
    id: "16",
    clientName: "Nicolás Ruiz",
    service: "Barba",
    date: "2025-10-09",
    time: "16:00",
    status: "pending",
    stylist: "Roberto Silva",
    salonId: "2",
  },
  {
    id: "17",
    clientName: "Martina Campos",
    service: "Alisado",
    date: "2025-10-09",
    time: "17:00",
    status: "confirmed",
    stylist: "María García",
    salonId: "4",
  },
  {
    id: "18",
    clientName: "Lucas Moreno",
    service: "Corte",
    date: "2025-10-09",
    time: "18:00",
    status: "pending",
    stylist: "Carlos López",
    salonId: "3",
  },
  // Dentro de 2 días - 2025-10-10
  {
    id: "19",
    clientName: "Emma Ortiz",
    service: "Peinado de Novia",
    date: "2025-10-10",
    time: "09:00",
    status: "confirmed",
    stylist: "Ana Martínez",
    salonId: "1",
  },
  {
    id: "20",
    clientName: "Joaquín Medina",
    service: "Corte y Barba",
    date: "2025-10-10",
    time: "10:00",
    status: "pending",
    stylist: "Roberto Silva",
    salonId: "2",
  },
  {
    id: "21",
    clientName: "Mía Navarro",
    service: "Coloración Fantasía",
    date: "2025-10-10",
    time: "11:30",
    status: "confirmed",
    stylist: "María García",
    salonId: "1",
  },
  {
    id: "22",
    clientName: "Thiago Silva",
    service: "Corte",
    date: "2025-10-10",
    time: "14:00",
    status: "pending",
    stylist: "Carlos López",
    salonId: "3",
  },
  {
    id: "23",
    clientName: "Sofía Reyes",
    service: "Permanente",
    date: "2025-10-10",
    time: "15:30",
    status: "confirmed",
    stylist: "Ana Martínez",
    salonId: "2",
  },
  {
    id: "24",
    clientName: "Benjamín Acosta",
    service: "Tratamiento",
    date: "2025-10-10",
    time: "16:00",
    status: "pending",
    stylist: "María García",
    salonId: "4",
  },
  // Dentro de 3 días - 2025-10-11
  {
    id: "25",
    clientName: "Olivia Mendoza",
    service: "Corte Bob",
    date: "2025-10-11",
    time: "10:00",
    status: "confirmed",
    stylist: "María García",
    salonId: "1",
  },
  {
    id: "26",
    clientName: "Santiago Vega",
    service: "Fade",
    date: "2025-10-11",
    time: "11:00",
    status: "pending",
    stylist: "Roberto Silva",
    salonId: "2",
  },
  {
    id: "27",
    clientName: "Victoria Rojas",
    service: "Mechas Californianas",
    date: "2025-10-11",
    time: "13:00",
    status: "confirmed",
    stylist: "Ana Martínez",
    salonId: "1",
  },
  {
    id: "28",
    clientName: "Gabriel Paredes",
    service: "Corte",
    date: "2025-10-11",
    time: "15:00",
    status: "pending",
    stylist: "Carlos López",
    salonId: "3",
  },
  {
    id: "29",
    clientName: "Renata Cruz",
    service: "Brushing y Planchado",
    date: "2025-10-11",
    time: "16:30",
    status: "confirmed",
    stylist: "María García",
    salonId: "2",
  },
  {
    id: "30",
    clientName: "Maximiliano Ibarra",
    service: "Corte y Barba",
    date: "2025-10-11",
    time: "17:30",
    status: "cancelled",
    stylist: "Roberto Silva",
    salonId: "4",
  },
  // Dentro de 5 días - 2025-10-13
  {
    id: "31",
    clientName: "Catalina Bravo",
    service: "Keratina",
    date: "2025-10-13",
    time: "09:30",
    status: "confirmed",
    stylist: "Ana Martínez",
    salonId: "1",
  },
  {
    id: "32",
    clientName: "Felipe Guzmán",
    service: "Corte Clásico",
    date: "2025-10-13",
    time: "11:00",
    status: "pending",
    stylist: "Carlos López",
    salonId: "3",
  },
  {
    id: "33",
    clientName: "Amanda Ponce",
    service: "Tinte Completo",
    date: "2025-10-13",
    time: "14:00",
    status: "confirmed",
    stylist: "María García",
    salonId: "1",
  },
  {
    id: "34",
    clientName: "Emilio Cortés",
    service: "Barba y Cejas",
    date: "2025-10-13",
    time: "15:30",
    status: "pending",
    stylist: "Roberto Silva",
    salonId: "2",
  },
  {
    id: "35",
    clientName: "Julieta Núñez",
    service: "Peinado de Fiesta",
    date: "2025-10-13",
    time: "17:00",
    status: "confirmed",
    stylist: "Ana Martínez",
    salonId: "4",
  },
  // Semana siguiente - 2025-10-15
  {
    id: "36",
    clientName: "Dante Fuentes",
    service: "Corte Moderno",
    date: "2025-10-15",
    time: "10:00",
    status: "pending",
    stylist: "Carlos López",
    salonId: "3",
  },
  {
    id: "37",
    clientName: "Agustina Ríos",
    service: "Balayage",
    date: "2025-10-15",
    time: "11:30",
    status: "confirmed",
    stylist: "María García",
    salonId: "1",
  },
  {
    id: "38",
    clientName: "Lorenzo Paz",
    service: "Corte y Styling",
    date: "2025-10-15",
    time: "14:00",
    status: "pending",
    stylist: "Roberto Silva",
    salonId: "2",
  },
  {
    id: "39",
    clientName: "Francesca Lara",
    service: "Tratamiento Botox",
    date: "2025-10-15",
    time: "15:30",
    status: "confirmed",
    stylist: "Ana Martínez",
    salonId: "1",
  },
  {
    id: "40",
    clientName: "Manuel Cáceres",
    service: "Corte",
    date: "2025-10-15",
    time: "17:00",
    status: "cancelled",
    stylist: "Carlos López",
    salonId: "4",
  },
  // Más turnos - octubre 2025
  { id: "41", clientName: "Valentina Ortega", service: "Corte", date: "2025-10-08", time: "09:00", status: "completed", stylist: "Laura Fernández", salonId: "1" },
  { id: "42", clientName: "Santiago Ruiz", service: "Barba", date: "2025-10-08", time: "09:30", status: "completed", stylist: "Roberto Silva", salonId: "2" },
  { id: "43", clientName: "Camila Torres", service: "Coloración", date: "2025-10-08", time: "10:30", status: "completed", stylist: "Ana Martínez", salonId: "3" },
  { id: "44", clientName: "Mateo Sosa", service: "Fade", date: "2025-10-08", time: "11:00", status: "completed", stylist: "Diego Romero", salonId: "2" },
  { id: "45", clientName: "Isabella Morales", service: "Mechas", date: "2025-10-08", time: "12:30", status: "completed", stylist: "Laura Fernández", salonId: "1" },
  { id: "46", clientName: "Benjamín Castro", service: "Corte Clásico", date: "2025-10-08", time: "13:30", status: "completed", stylist: "Carlos López", salonId: "4" },
  { id: "47", clientName: "Sofía Vargas", service: "Brushing", date: "2025-10-08", time: "15:30", status: "completed", stylist: "Patricia Gómez", salonId: "3" },
  { id: "48", clientName: "Lucas Herrera", service: "Corte y Barba", date: "2025-10-08", time: "16:00", status: "completed", stylist: "Diego Romero", salonId: "2" },
  { id: "49", clientName: "Emma Jiménez", service: "Peinado", date: "2025-10-08", time: "17:30", status: "completed", stylist: "Ana Martínez", salonId: "1" },
  { id: "50", clientName: "Thiago Molina", service: "Corte Moderno", date: "2025-10-08", time: "18:00", status: "completed", stylist: "Laura Fernández", salonId: "4" },
  { id: "51", clientName: "Mía Delgado", service: "Keratina", date: "2025-10-09", time: "08:30", status: "confirmed", stylist: "Patricia Gómez", salonId: "3" },
  { id: "52", clientName: "Joaquín Blanco", service: "Barba y Cejas", date: "2025-10-09", time: "09:30", status: "confirmed", stylist: "Roberto Silva", salonId: "2" },
  { id: "53", clientName: "Olivia Ramos", service: "Balayage", date: "2025-10-09", time: "12:00", status: "confirmed", stylist: "María García", salonId: "1" },
  { id: "54", clientName: "Nicolás Vega", service: "Corte", date: "2025-10-09", time: "12:30", status: "pending", stylist: "Diego Romero", salonId: "2" },
  { id: "55", clientName: "Martina Acosta", service: "Tratamiento Capilar", date: "2025-10-09", time: "14:00", status: "confirmed", stylist: "Laura Fernández", salonId: "4" },
  { id: "56", clientName: "Dante Moreno", service: "Fade", date: "2025-10-09", time: "14:30", status: "pending", stylist: "Carlos López", salonId: "3" },
  { id: "57", clientName: "Agustina Suárez", service: "Coloración Fantasía", date: "2025-10-09", time: "16:30", status: "confirmed", stylist: "Ana Martínez", salonId: "1" },
  { id: "58", clientName: "Felipe Rojas", service: "Corte y Styling", date: "2025-10-09", time: "17:30", status: "pending", stylist: "Roberto Silva", salonId: "2" },
  { id: "59", clientName: "Catalina Méndez", service: "Mechas Californianas", date: "2025-10-09", time: "18:30", status: "confirmed", stylist: "Patricia Gómez", salonId: "3" },
  { id: "60", clientName: "Lorenzo Navarro", service: "Corte Clásico", date: "2025-10-09", time: "19:00", status: "pending", stylist: "Diego Romero", salonId: "4" },
  { id: "61", clientName: "Francesca Parra", service: "Peinado de Novia", date: "2025-10-10", time: "08:00", status: "confirmed", stylist: "María García", salonId: "1" },
  { id: "62", clientName: "Manuel Ríos", service: "Barba", date: "2025-10-10", time: "10:30", status: "pending", stylist: "Roberto Silva", salonId: "2" },
  { id: "63", clientName: "Amanda Fuentes", service: "Tinte Completo", date: "2025-10-10", time: "12:00", status: "confirmed", stylist: "Laura Fernández", salonId: "3" },
  { id: "64", clientName: "Emilio Cruz", service: "Corte", date: "2025-10-10", time: "13:00", status: "pending", stylist: "Carlos López", salonId: "4" },
  { id: "65", clientName: "Julieta Guerrero", service: "Brushing y Planchado", date: "2025-10-10", time: "16:00", status: "confirmed", stylist: "Ana Martínez", salonId: "1" },
  { id: "66", clientName: "Gabriel Peña", service: "Fade", date: "2025-10-10", time: "17:00", status: "confirmed", stylist: "Diego Romero", salonId: "2" },
  { id: "67", clientName: "Renata Cortés", service: "Permanente", date: "2025-10-10", time: "17:30", status: "pending", stylist: "Patricia Gómez", salonId: "3" },
  { id: "68", clientName: "Maximiliano Vera", service: "Corte y Barba", date: "2025-10-10", time: "18:30", status: "confirmed", stylist: "Roberto Silva", salonId: "4" },
  { id: "69", clientName: "Victoria Aguirre", service: "Mechas Balayage", date: "2025-10-11", time: "09:00", status: "confirmed", stylist: "María García", salonId: "1" },
  { id: "70", clientName: "Dante Sánchez", service: "Corte Moderno", date: "2025-10-11", time: "09:30", status: "pending", stylist: "Carlos López", salonId: "2" },
  { id: "71", clientName: "Emma Salazar", service: "Tratamiento Botox", date: "2025-10-11", time: "11:30", status: "confirmed", stylist: "Laura Fernández", salonId: "3" },
  { id: "72", clientName: "Sebastián Campos", service: "Barba y Cejas", date: "2025-10-11", time: "12:00", status: "pending", stylist: "Roberto Silva", salonId: "4" },
  { id: "73", clientName: "Olivia Benítez", service: "Coloración", date: "2025-10-11", time: "14:00", status: "confirmed", stylist: "Ana Martínez", salonId: "1" },
  { id: "74", clientName: "Mateo Figueroa", service: "Corte", date: "2025-10-11", time: "14:30", status: "confirmed", stylist: "Diego Romero", salonId: "2" },
  { id: "75", clientName: "Isabella Núñez", service: "Alisado", date: "2025-10-11", time: "18:00", status: "pending", stylist: "Patricia Gómez", salonId: "3" },
  { id: "76", clientName: "Joaquín Reyes", service: "Fade", date: "2025-10-11", time: "18:30", status: "confirmed", stylist: "Carlos López", salonId: "4" },
  { id: "77", clientName: "Mía Guzmán", service: "Peinado de Fiesta", date: "2025-10-12", time: "10:00", status: "confirmed", stylist: "María García", salonId: "1" },
  { id: "78", clientName: "Nicolás Molina", service: "Corte Clásico", date: "2025-10-12", time: "11:00", status: "pending", stylist: "Roberto Silva", salonId: "2" },
  { id: "79", clientName: "Martina Castillo", service: "Mechas", date: "2025-10-12", time: "13:00", status: "confirmed", stylist: "Laura Fernández", salonId: "3" },
  { id: "80", clientName: "Thiago Morales", service: "Corte y Styling", date: "2025-10-12", time: "14:00", status: "pending", stylist: "Diego Romero", salonId: "4" },
  { id: "81", clientName: "Sofía Chávez", service: "Keratina", date: "2025-10-12", time: "15:30", status: "confirmed", stylist: "Ana Martínez", salonId: "1" },
  { id: "82", clientName: "Lucas Ramírez", service: "Barba", date: "2025-10-12", time: "16:00", status: "confirmed", stylist: "Roberto Silva", salonId: "2" },
  { id: "83", clientName: "Camila Vargas", service: "Balayage", date: "2025-10-12", time: "17:00", status: "pending", stylist: "Patricia Gómez", salonId: "3" },
  { id: "84", clientName: "Benjamín Ortiz", service: "Corte", date: "2025-10-12", time: "17:30", status: "confirmed", stylist: "Carlos López", salonId: "4" },
  { id: "85", clientName: "Valentina Méndez", service: "Tinte Completo", date: "2025-10-13", time: "08:30", status: "confirmed", stylist: "María García", salonId: "1" },
  { id: "86", clientName: "Santiago Herrera", service: "Fade", date: "2025-10-13", time: "10:00", status: "pending", stylist: "Diego Romero", salonId: "2" },
  { id: "87", clientName: "Emma Rojas", service: "Brushing", date: "2025-10-13", time: "12:00", status: "confirmed", stylist: "Laura Fernández", salonId: "3" },
  { id: "88", clientName: "Mateo Navarro", service: "Corte y Barba", date: "2025-10-13", time: "13:00", status: "pending", stylist: "Roberto Silva", salonId: "4" },
  { id: "89", clientName: "Isabella Torres", service: "Permanente", date: "2025-10-13", time: "16:00", status: "confirmed", stylist: "Ana Martínez", salonId: "1" },
  { id: "90", clientName: "Joaquín Silva", service: "Corte Moderno", date: "2025-10-13", time: "16:30", status: "confirmed", stylist: "Carlos López", salonId: "2" },
  { id: "91", clientName: "Olivia Castro", service: "Coloración Fantasía", date: "2025-10-13", time: "18:00", status: "pending", stylist: "Patricia Gómez", salonId: "3" },
  { id: "92", clientName: "Nicolás Acosta", service: "Barba y Cejas", date: "2025-10-13", time: "18:30", status: "confirmed", stylist: "Diego Romero", salonId: "4" },
  { id: "93", clientName: "Martina Gómez", service: "Mechas Californianas", date: "2025-10-14", time: "09:00", status: "confirmed", stylist: "María García", salonId: "1" },
  { id: "94", clientName: "Dante Blanco", service: "Corte", date: "2025-10-14", time: "10:00", status: "pending", stylist: "Roberto Silva", salonId: "2" },
  { id: "95", clientName: "Agustina Vega", service: "Tratamiento Capilar", date: "2025-10-14", time: "11:30", status: "confirmed", stylist: "Laura Fernández", salonId: "3" },
  { id: "96", clientName: "Felipe Ramos", service: "Fade", date: "2025-10-14", time: "12:30", status: "pending", stylist: "Carlos López", salonId: "4" },
  { id: "97", clientName: "Catalina Suárez", service: "Alisado", date: "2025-10-14", time: "14:00", status: "confirmed", stylist: "Ana Martínez", salonId: "1" },
  { id: "98", clientName: "Lorenzo Fuentes", service: "Corte Clásico", date: "2025-10-14", time: "15:00", status: "confirmed", stylist: "Diego Romero", salonId: "2" },
  { id: "99", clientName: "Francesca Guerrero", service: "Peinado", date: "2025-10-14", time: "16:30", status: "pending", stylist: "Patricia Gómez", salonId: "3" },
  { id: "100", clientName: "Manuel Peña", service: "Corte y Barba", date: "2025-10-14", time: "17:00", status: "confirmed", stylist: "Roberto Silva", salonId: "4" },
  { id: "101", clientName: "Amanda Cortés", service: "Balayage", date: "2025-10-15", time: "08:30", status: "pending", stylist: "María García", salonId: "1" },
  { id: "102", clientName: "Emilio Vera", service: "Barba", date: "2025-10-15", time: "09:00", status: "confirmed", stylist: "Roberto Silva", salonId: "2" },
  { id: "103", clientName: "Julieta Aguirre", service: "Keratina", date: "2025-10-15", time: "11:00", status: "confirmed", stylist: "Laura Fernández", salonId: "3" },
  { id: "104", clientName: "Gabriel Sánchez", service: "Corte", date: "2025-10-15", time: "12:00", status: "pending", stylist: "Carlos López", salonId: "4" },
  { id: "105", clientName: "Renata Salazar", service: "Mechas Balayage", date: "2025-10-15", time: "13:30", status: "confirmed", stylist: "Ana Martínez", salonId: "1" },
  { id: "106", clientName: "Maximiliano Campos", service: "Fade", date: "2025-10-15", time: "16:00", status: "confirmed", stylist: "Diego Romero", salonId: "2" },
  { id: "107", clientName: "Victoria Benítez", service: "Coloración", date: "2025-10-15", time: "16:30", status: "pending", stylist: "Patricia Gómez", salonId: "3" },
  { id: "108", clientName: "Sebastián Figueroa", service: "Corte y Styling", date: "2025-10-15", time: "18:00", status: "confirmed", stylist: "Roberto Silva", salonId: "4" },
  // Octubre 16-20
  { id: "109", clientName: "Emma Núñez", service: "Peinado de Novia", date: "2025-10-16", time: "09:00", status: "confirmed", stylist: "María García", salonId: "1" },
  { id: "110", clientName: "Mateo Reyes", service: "Corte Clásico", date: "2025-10-16", time: "10:30", status: "pending", stylist: "Carlos López", salonId: "2" },
  { id: "111", clientName: "Isabella Guzmán", service: "Tratamiento Botox", date: "2025-10-16", time: "12:00", status: "confirmed", stylist: "Laura Fernández", salonId: "3" },
  { id: "112", clientName: "Joaquín Molina", service: "Barba y Cejas", date: "2025-10-16", time: "14:00", status: "pending", stylist: "Roberto Silva", salonId: "4" },
  { id: "113", clientName: "Mía Castillo", service: "Tinte Completo", date: "2025-10-16", time: "15:30", status: "confirmed", stylist: "Ana Martínez", salonId: "1" },
  { id: "114", clientName: "Nicolás Morales", service: "Fade", date: "2025-10-16", time: "16:00", status: "confirmed", stylist: "Diego Romero", salonId: "2" },
  { id: "115", clientName: "Martina Chávez", service: "Permanente", date: "2025-10-16", time: "17:00", status: "pending", stylist: "Patricia Gómez", salonId: "3" },
  { id: "116", clientName: "Thiago Ramírez", service: "Corte", date: "2025-10-16", time: "18:30", status: "confirmed", stylist: "Carlos López", salonId: "4" },
  { id: "117", clientName: "Sofía Vargas", service: "Mechas", date: "2025-10-17", time: "09:30", status: "confirmed", stylist: "María García", salonId: "1" },
  { id: "118", clientName: "Lucas Ortiz", service: "Corte y Barba", date: "2025-10-17", time: "11:00", status: "pending", stylist: "Roberto Silva", salonId: "2" },
  { id: "119", clientName: "Camila Méndez", service: "Balayage", date: "2025-10-17", time: "13:00", status: "confirmed", stylist: "Laura Fernández", salonId: "3" },
  { id: "120", clientName: "Benjamín Herrera", service: "Corte Moderno", date: "2025-10-17", time: "14:30", status: "pending", stylist: "Diego Romero", salonId: "4" },
  { id: "121", clientName: "Valentina Rojas", service: "Alisado", date: "2025-10-17", time: "16:00", status: "confirmed", stylist: "Ana Martínez", salonId: "1" },
  { id: "122", clientName: "Santiago Navarro", service: "Barba", date: "2025-10-17", time: "17:00", status: "confirmed", stylist: "Roberto Silva", salonId: "2" },
  { id: "123", clientName: "Emma Torres", service: "Brushing y Planchado", date: "2025-10-17", time: "17:30", status: "pending", stylist: "Patricia Gómez", salonId: "3" },
  { id: "124", clientName: "Mateo Silva", service: "Fade", date: "2025-10-17", time: "18:00", status: "confirmed", stylist: "Carlos López", salonId: "4" },
  { id: "125", clientName: "Isabella Castro", service: "Keratina", date: "2025-10-18", time: "08:30", status: "confirmed", stylist: "María García", salonId: "1" },
  { id: "126", clientName: "Joaquín Acosta", service: "Corte", date: "2025-10-18", time: "10:00", status: "pending", stylist: "Carlos López", salonId: "2" },
  { id: "127", clientName: "Olivia Gómez", service: "Coloración Fantasía", date: "2025-10-18", time: "12:30", status: "confirmed", stylist: "Laura Fernández", salonId: "3" },
  { id: "128", clientName: "Nicolás Blanco", service: "Corte y Styling", date: "2025-10-18", time: "14:00", status: "pending", stylist: "Diego Romero", salonId: "4" },
  { id: "129", clientName: "Martina Vega", service: "Mechas Californianas", date: "2025-10-18", time: "15:00", status: "confirmed", stylist: "Ana Martínez", salonId: "1" },
  { id: "130", clientName: "Dante Ramos", service: "Barba y Cejas", date: "2025-10-18", time: "16:30", status: "confirmed", stylist: "Roberto Silva", salonId: "2" },
];

export default function App() {
  const { user, session, signOut, signInAsDemo, currentRole, currentOrgId } = useAuth() as any;
  const isAuthenticated = !!user;
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Log inicial del componente
  console.log('🚀 APP: Componente App iniciado');
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedSalon, setSelectedSalon] = useState<string | null>(null);
  // Demo/local state
  const [salons, setSalons] = useState<Salon[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [demoName, setDemoName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem('demo:name'); } catch { return null; }
  });
  const [showDemoWelcome, setShowDemoWelcome] = useState(false);

  // Remote data via Supabase (only after login)
  const { appointments: remoteAppointments, createAppointment, updateAppointment, deleteAppointment } = useDbAppointments(
    selectedSalon ?? undefined,
    { enabled: !!session && !!selectedSalon }
  );
  const { salons: remoteSalons } = useDbSalons(currentOrgId ?? undefined, { enabled: !!session && !!currentOrgId });

  const isDemo = user?.email === 'demo@coreboard.local';
  
  // Debug logs detallados
  console.log('🎭 APP STATE:', {
    userEmail: user?.email,
    userId: user?.id,
    hasSession: !!session,
    sessionEmail: session?.user?.email,
    isDemo: isDemo,
    demoName: demoName,
    currentRole: currentRole,
    currentOrgId: currentOrgId,
    isNewUser: user?.isNewUser,
    membershipsCount: user?.memberships?.length || 0
  });
  
  // Log específico del tipo de usuario
  if (isDemo) {

    console.log('🎭 MODO DEMO ACTIVO - Usando datos mock');
  } else if (user?.email) {
    console.log('👤 USUARIO REAL ACTIVO - Usando datos de Supabase para:', user.email);
  } else {
    console.log('❓ ESTADO DESCONOCIDO - Sin usuario definido');
  }
  
  const effectiveAppointments: Appointment[] = isDemo ? appointments : (remoteAppointments as any);
  const effectiveSalons: Salon[] = isDemo ? salons : (remoteSalons as any);

  const selectedSalonName = useMemo(() => {
    if (!selectedSalon) return "Ninguna peluquería seleccionada";
    const found = effectiveSalons.find(s => s.id === selectedSalon);
    return found?.name || "";
  }, [selectedSalon, effectiveSalons]);
  const [services, setServices] = useState(() => {
    // ejemplo inicial
    return [
      { id: 's1', name: 'Corte', price: 1200, durationMinutes: 30 },
      { id: 's2', name: 'Coloración', price: 3000, durationMinutes: 90 },
    ];
  });
  const [calendarFocusDate, setCalendarFocusDate] = useState<string | null>(null);
  // Demo: ask for user name on first entry
  useEffect(() => {
    if (isDemo && !demoName) setShowDemoWelcome(true);
  }, [isDemo, demoName]);

  const handleSaveDemoName = useCallback((name: string) => {
    setDemoName(name);
    try { localStorage.setItem('demo:name', name); } catch {}
    setShowDemoWelcome(false);
    // In demo, kick off onboarding to crear la primera peluquería
    try {
      setShowOnboarding(true);
    } catch {}
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [stylistFilter, setStylistFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [activeNavItem, setActiveNavItem] = useState("home");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSelectAppointment = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowQuickActions(false); // Cerrar acciones rápidas al abrir action bar
  }, []);

  const handleSelectSalon = useCallback((salonId: string, salonName: string) => {
    // Si se hace click en el salon ya seleccionado, desseleccionar
    if (selectedSalon === salonId) {
      setSelectedSalon(null);
      toast.info("Selección removida");
    } else {
      setSelectedSalon(salonId);
      toast.success(`${salonName} seleccionado`);
    }
  }, [selectedSalon]);

  const getSelectedSalonName = () => {
    if (!selectedSalon) return "Ninguna peluquería seleccionada";
    return salons.find(s => s.id === selectedSalon)?.name || "";
  };

  // Keep local theme state in sync with document for Toaster display
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    sync();
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent<'light' | 'dark'>).detail;
        if (detail === 'light' || detail === 'dark') setTheme(detail);
        else sync();
      } catch {
        sync();
      }
    };
    window.addEventListener('theme:changed', handler as EventListener);
    return () => window.removeEventListener('theme:changed', handler as EventListener);
  }, []);

  // Reset selected appointment when changing sections
  useEffect(() => {
    setSelectedAppointment(null);
  }, [activeNavItem]);

  // Theme toggling is handled by the floating bubble

  const handleLogout = async () => {
    await signOut();
    setActiveNavItem("home");
    setSelectedSalon(null);
    setSelectedAppointment(null);
    setShowQuickActions(false);
    toast.info("Sesión cerrada correctamente");
  };

  const handleSaveAppointment = useCallback(async (appointmentData: Partial<Appointment>) => {
    try {
      if (isDemo) {
        if (editingAppointment) {
          setAppointments((prev) =>
            prev.map((apt) => (apt.id === editingAppointment.id ? { ...apt, ...appointmentData } : apt))
          );
          setEditingAppointment(null);
          toast.success("Turno actualizado correctamente");
        } else {
          const newAppointment: Appointment = {
            id: Date.now().toString(),
            clientName: appointmentData.clientName || "",
            service: appointmentData.service || "",
            date: appointmentData.date || "",
            time: appointmentData.time || "",
            status: "pending",
            stylist: appointmentData.stylist || "",
            salonId: appointmentData.salonId || selectedSalon || "1",
          };
          setAppointments((prev) => [newAppointment, ...prev]);
          toast.success("Turno creado correctamente");
        }
        return;
      }
      // Remote
      if (editingAppointment) {
        await (useDbAppointments as any); // no-op to avoid TS isolated error in patch
        await (updateAppointment as any)(editingAppointment.id, appointmentData);
        setEditingAppointment(null);
        toast.success("Turno actualizado correctamente");
      } else {
        await (createAppointment as any)({ ...appointmentData, salonId: appointmentData.salonId || selectedSalon || undefined });
        toast.success("Turno creado correctamente");
      }
    } catch (e) {
      toast.error('No se pudo guardar el turno');
    }
  }, [isDemo, editingAppointment, selectedSalon]);

  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setEditingAppointment(appointment);
    setDialogOpen(true);
  }, []);

  const handleCancelAppointment = useCallback(async (id: string) => {
    if (isDemo) {
      setAppointments((prev) => prev.map((apt) => (apt.id === id ? { ...apt, status: "cancelled" as const } : apt)));
    } else {
      try { await (updateAppointment as any)(id, { status: 'cancelled' as const }); } catch (e) { toast.error('No se pudo cancelar'); return; }
    }
    toast.success("Turno cancelado");
    setSelectedAppointment(null);
  }, [isDemo, updateAppointment]);

  const handleCompleteAppointment = useCallback((id: string) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === id ? { ...apt, status: "completed" as const } : apt
      )
    );
    toast.success("Turno completado");
    setSelectedAppointment(null);
  }, []);

  const handleDeleteAppointment = useCallback(() => {
    setAppointments((prev) => {
      const salonAppointments = !selectedSalon 
        ? prev 
        : prev.filter(apt => apt.salonId === selectedSalon);
      if (salonAppointments.length === 0) {
        toast.error("No hay turnos para eliminar");
        return prev;
      }
      const lastAppointment = salonAppointments[0];
      toast.success("Último turno eliminado");
      return prev.filter(apt => apt.id !== lastAppointment.id);
    });
    setShowQuickActions(false);
  }, [selectedSalon]);

  const handleDeleteSelectedAppointment = useCallback(() => {
    if (!selectedAppointment) return;
    setAppointments((prev) => prev.filter(apt => apt.id !== selectedAppointment.id));
    toast.success("Turno eliminado");
    setSelectedAppointment(null);
  }, [selectedAppointment]);

  const handleUpdateAppointment = useCallback(() => {
    const salonAppointments = !selectedSalon 
      ? effectiveAppointments 
      : effectiveAppointments.filter(apt => apt.salonId === selectedSalon);
    if (salonAppointments.length === 0) {
      toast.error("No hay turnos para actualizar");
      return;
    }
    const lastAppointment = salonAppointments[0];
    setEditingAppointment(lastAppointment);
    setDialogOpen(true);
    setShowQuickActions(false);
  }, [effectiveAppointments, selectedSalon]);

  const filteredAppointments = useMemo(() => {
    return effectiveAppointments.filter((apt) => {
      // Filter by salon
      if (selectedSalon && apt.salonId !== selectedSalon) return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          apt.clientName.toLowerCase().includes(query) ||
          apt.service.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Filter by status
      if (statusFilter !== "all" && apt.status !== statusFilter) return false;

      // Filter by stylist
      if (stylistFilter !== "all" && apt.stylist !== stylistFilter) return false;

      // Filter by date
      if (dateFilter !== "all") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);

        if (dateFilter === "today") {
          if (aptDate.getTime() !== today.getTime()) return false;
        } else if (dateFilter === "tomorrow") {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (aptDate.getTime() !== tomorrow.getTime()) return false;
        } else if (dateFilter === "week") {
          const weekFromNow = new Date(today);
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          if (aptDate < today || aptDate > weekFromNow) return false;
        } else if (dateFilter === "month") {
          const monthFromNow = new Date(today);
          monthFromNow.setMonth(monthFromNow.getMonth() + 1);
          if (aptDate < today || aptDate > monthFromNow) return false;
        }
      }

      return true;
    });
  }, [effectiveAppointments, selectedSalon, searchQuery, statusFilter, stylistFilter, dateFilter]);

  const handleAddSalon = useCallback((salonData: Omit<Salon, 'id'>) => {
    if (isDemo && salons.length >= 1) {
      toast.error('En modo demo solo se permite 1 peluquería');
      return;
    }
    const newSalon: Salon = {
      ...salonData,
      id: Date.now().toString(),
    };
    setSalons(prev => [...prev, newSalon]);
  }, [isDemo, salons.length]);

  const handleEditSalon = useCallback((id: string, salonData: Partial<Salon>) => {
    setSalons(prev => prev.map(salon => 
      salon.id === id ? { ...salon, ...salonData } : salon
    ));
  }, []);

  const handleDeleteSalon = useCallback((id: string) => {
    setSalons(prev => prev.filter(salon => salon.id !== id));
    if (selectedSalon === id) {
      setSelectedSalon(null);
    }
  }, [selectedSalon]);

  // useAuth consumed at function top; avoid redeclaration

  const allNavItems = [
    { id: "home", label: "Inicio", icon: Home, allowed: ['admin','owner','employee','demo'] },
    { id: "appointments", label: "Turnos", icon: Calendar, allowed: ['admin','owner','employee'] },
    { id: "finances", label: "Finanzas", icon: DollarSign, allowed: ['admin','owner'] },
    { id: "clients", label: "Clientes", icon: Users, allowed: ['admin','owner','employee'] },
    { id: "salons", label: "Peluquerías", icon: Building2, allowed: ['admin','owner'] },
    { id: "settings", label: "Configuración", icon: Settings, allowed: ['admin'] },
    
  ];

  const navItems = useMemo(() => {
    const role = isDemo ? 'demo' : (currentRole ?? 'viewer');
    if (role === 'demo') return allNavItems;
    return allNavItems.filter(item => !item.allowed || item.allowed.includes(role));
  }, [currentRole, isDemo]);

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    const name = email.split('@')[0];
    const parts = name.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(' ');
    const a = (parts[0] || '').charAt(0);
    const b = (parts[1] || '').charAt(0);
    return (a + (b || '')).toUpperCase();
  };
  const getInitialsFromName = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    const a = (parts[0] || '').charAt(0);
    const b = (parts[1] || '').charAt(0);
    return (a + (b || '')).toUpperCase();
  };

  const SidebarContent = () => (
    <div className="w-full bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-border">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {isDemo ? getInitialsFromName(demoName) : getInitials(user?.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Bienvenido</span>
          <span className="text-sidebar-foreground font-medium">{isDemo ? (demoName?.trim() || "Unnamed") : (user?.email?.split("@")[0] || "Unnamed")}</span>
        </div>
      </div>

      <nav className="flex-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveNavItem(item.id);
                if (isMobile) {
                  setMobileMenuOpen(false);
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full mb-1.5 transition-colors ${
                activeNavItem === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full mb-1.5 transition-colors text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar Sesión</span>
        </button>
      </nav>

      <div className="p-3">
        <Button
          onClick={() => {
            setShowQuickActions(!showQuickActions);
            if (isMobile) {
              setMobileMenuOpen(false);
            }
          }}
          className="w-full rounded-full h-9"
          variant={showQuickActions ? "secondary" : "default"}
        >
          <Zap className="h-4 w-4 mr-2" />
          Acciones Rápidas
        </Button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (activeNavItem === "home") {
      return (
        <Suspense fallback={<div className="p-6">Cargando vista...</div>}>
          <HomeView 
            appointments={effectiveAppointments} 
            selectedSalon={selectedSalon}
            salons={effectiveSalons}
            onSelectSalon={handleSelectSalon}
            onAppointmentClick={handleSelectAppointment}
            onAddAppointment={() => {
              setEditingAppointment(null);
              setDialogOpen(true);
            }}
            orgName={user?.memberships?.[0]?.org_id ? 'tu peluquería' : undefined}
            isNewUser={user?.isNewUser}
          />
        </Suspense>
      );
    }
    if (activeNavItem === "finances") {
      return (
        <Suspense fallback={<div className="p-6">Cargando vista...</div>}>
          <FinancesView appointments={effectiveAppointments} selectedSalon={selectedSalon} salonName={selectedSalonName} />
        </Suspense>
      );
    }
    if (activeNavItem === "clients") {
      return (
        <Suspense fallback={<div className="p-6">Cargando vista...</div>}>
          <ClientsView appointments={effectiveAppointments} selectedSalon={selectedSalon} />
        </Suspense>
      );
    }
    if (activeNavItem === "salons") {
      return (
        <Suspense fallback={<div className="p-6">Cargando vista...</div>}>
          <SalonsManagementView 
            salons={effectiveSalons}
            onAddSalon={handleAddSalon}
            onEditSalon={handleEditSalon}
            onDeleteSalon={handleDeleteSalon}
          />
        </Suspense>
      );
    }
    if (activeNavItem === "settings") {
      return (
        <Suspense fallback={<div className="p-6">Cargando vista...</div>}>
          <SettingsView />
        </Suspense>
      );
    }
    
    // appointments view
    return (
      <>
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          stylistFilter={stylistFilter}
          onStylistFilterChange={setStylistFilter}
        />

        <div className="bg-muted/20">
          <div className="p-4 md:p-6 pb-20">
            {!selectedSalon ? (
              <div className="text-center py-16 px-4">
                <div className="text-muted-foreground mb-2">
                  Por favor selecciona una peluquería para ver los turnos
                </div>
                <p className="text-sm text-muted-foreground">
                  Usa el carrusel superior para elegir una sucursal
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
                  <h2>Lista de Turnos</h2>
                  <Button 
                    onClick={() => {
                      setEditingAppointment(null);
                      setDialogOpen(true);
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Nuevo Turno
                  </Button>
                </div>
                <div className="space-y-3">
                {filteredAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron turnos
                  </div>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onClick={handleSelectAppointment}
                      isSelected={selectedAppointment?.id === appointment.id}
                    />
                  ))
                )}
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  };

  // Show onboarding modal for new users
  useEffect(() => {
    if (user?.isNewUser && !showOnboarding) {
      setShowOnboarding(true);
    }
  }, [user?.isNewUser, showOnboarding]);

  // Show login if not authenticated
  if (!isAuthenticated) {
    console.log('🔒 APP: Mostrando vista de LOGIN - usuario no autenticado');
    return (
      <>
        <Sonner theme={theme} position="top-right" />
        <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
          <LoginView onLogin={() => { 
            console.log('🎭 APP: 🖱️ BOTÓN "EXPLORAR DEMO" PRESIONADO desde LoginView');
            if (signInAsDemo) signInAsDemo(); 
            else toast.error('Demo no disponible'); 
          }} />
        </Suspense>
      </>
    );
  }
  
  console.log('🏠 APP: Mostrando vista PRINCIPAL - usuario autenticado');

  return (
    <>
      <Sonner theme={theme} position="top-right" />
      <div className={`flex h-screen bg-background overflow-hidden`}>
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64">
          <SidebarContent />
        </div>

        {/* Mobile Drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <SheetDescription className="sr-only">
              Navegue por las diferentes secciones de la aplicación
            </SheetDescription>
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Mobile Menu Button - Sticky Floating Bubble */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden fixed top-4 left-4 z-30 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-background"
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto h-screen">
          {/* Spacer for mobile menu button */}
          <div className="md:hidden h-20" />
          
          {/* Salon Carousel - Solo en vista Turnos y Finanzas */}
          {(activeNavItem === "appointments" || activeNavItem === "finances") && (
            <div className="p-4 md:p-6 pb-4 border-b border-border">
              <h2 className="mb-3">Seleccionar Peluquería</h2>
              <SalonCarousel 
                salons={effectiveSalons}
                selectedSalon={selectedSalon}
                onSelectSalon={handleSelectSalon}
              />
            </div>
          )}

          {/* Dynamic Content */}
          {renderContent()}
        </div>

      {/* Floating Quick Actions */}
      <FloatingQuickActions
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onAddAppointment={() => {
          setEditingAppointment(null);
          setDialogOpen(true);
        }}
        onDeleteAppointment={handleDeleteAppointment}
        onUpdateAppointment={handleUpdateAppointment}
      />

      {/* Floating Theme Bubble */}
      <ThemeBubble />
      {isDemo && (
        <DemoDataBubble
          onSeed={() => {
            if (salons.length !== 1) {
              toast.error('Crea una única peluquería para cargar datos demo');
              return;
            }
            const targetSalonId = salons[0].id;
            setAppointments(sampleAppointments.map((a) => ({ ...a, salonId: targetSalonId })));
            toast.success('Datos de ejemplo cargados en tu peluquería demo');
          }}
        />
      )}

      {/* Appointment Dialog */}
      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingAppointment(null);
        }}
        onSave={handleSaveAppointment}
        appointment={editingAppointment}
        salonId={selectedSalon}
        salons={effectiveSalons}
      />

      {/* Appointment Action Bar (only in appointments view) */}
      {activeNavItem === "appointments" && (
        <AppointmentActionBar
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onEdit={() => {
          if (selectedAppointment) {
            handleEditAppointment(selectedAppointment);
            setSelectedAppointment(null);
          }
        }}
        onComplete={() => {
          if (selectedAppointment) {
            handleCompleteAppointment(selectedAppointment.id);
          }
        }}
        onCancel={() => {
          if (selectedAppointment) {
            handleCancelAppointment(selectedAppointment.id);
          }
        }}
        onDelete={handleDeleteSelectedAppointment}
        onReschedule={({ date, time, openPicker }) => {
          if (!selectedAppointment) return;
          // Si se pidió abrir picker, reutilizamos AppointmentDialog
          if (openPicker) {
            setEditingAppointment({ ...selectedAppointment, date: date || selectedAppointment.date, time: time || selectedAppointment.time });
            setDialogOpen(true);
            return;
          }
          // Reprogramación simple por fecha/hora
          if (isDemo) {
            setAppointments(prev => prev.map(apt => apt.id === selectedAppointment.id ? { ...apt, date: date || apt.date, time: time || apt.time } : apt));
          } else {
            (async () => { try { await (updateAppointment as any)(selectedAppointment.id, { date, time }); } catch { toast.error('No se pudo reprogramar'); } })();
          }

          // Ajustar filtro de fecha para que el turno recién reprogramado sea visible
          if (date) {
            const todayStr = new Date().toISOString().slice(0,10);
            const t = new Date();
            t.setDate(t.getDate() + 1);
            const tomorrowStr = t.toISOString().slice(0,10);
            if (date === tomorrowStr) setDateFilter('tomorrow');
            else if (date === todayStr) setDateFilter('today');
            else setDateFilter('all');
            // también enfocamos el calendario en la fecha reprogramada
            setCalendarFocusDate(date);
          }

          toast.success('Turno reprogramado');
          setSelectedAppointment(null);
        }}
        onRestore={(id: string) => {
          if (isDemo) {
            setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, status: 'confirmed' as const } : apt));
            toast.success('Turno restaurado');
            setSelectedAppointment(null);
          } else {
            (async () => { try { await (updateAppointment as any)(id, { status: 'confirmed' as const }); toast.success('Turno restaurado'); } catch { toast.error('No se pudo restaurar'); } finally { setSelectedAppointment(null); } })();
          }
        }}
        onSetStatus={(status) => {
          if (!selectedAppointment) return;
          if (isDemo) {
            setAppointments(prev => prev.map(apt => apt.id === selectedAppointment.id ? { ...apt, status } : apt));
            toast.success('Estado actualizado');
            setSelectedAppointment(null);
          } else {
            (async () => { try { await (updateAppointment as any)(selectedAppointment.id, { status }); toast.success('Estado actualizado'); } catch { toast.error('No se pudo actualizar'); } finally { setSelectedAppointment(null); } })();
          }
        }}
      />
      )}

      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
      {isDemo && (
        <DemoWelcomeModal
          isOpen={showDemoWelcome}
          onSave={handleSaveDemoName}
          onClose={() => setShowDemoWelcome(false)}
        />
      )}
    </div>
    </>
  );
}




