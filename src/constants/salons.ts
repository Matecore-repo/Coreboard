// ============================================================================
// CONSTANTES - DATOS DE SALONES DE EJEMPLO
// ============================================================================
// Salones ficticios para modo demo y fallback

import type { Salon } from '../types/salon';

/**
 * Array de salones de ejemplo
 * Utilizados en modo demo y como fallback
 */
export const sampleSalons: Salon[] = [
  {
    id: "1",
    name: "Studio Elegance",
    address: "Av. Corrientes 1234, CABA",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBoYWlyJTIwc2Fsb24lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NTk5MzAyMjJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
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
