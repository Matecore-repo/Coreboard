"use client"

import { useState } from "react"
import { GenericCarousel } from "@/components/generic-carousel"
import { Button } from "@/components/ui/button"
import { Edit, Calendar, Settings, BarChart3, MapPin, Star, Clock } from "lucide-react"

interface SalonData {
  id: string
  name: string
  address: string
  rating: number
  nextAvailable: string
  image: string
  specialties: string[]
}

export default function Home() {
  const [selectedSalon, setSelectedSalon] = useState<SalonData | null>(null)

  const salons: SalonData[] = [
    {
      id: "1",
      name: "Studio Urban",
      address: "Av. Corrientes 1234, CABA",
      rating: 4.8,
      nextAvailable: "Hoy 14:30",
      image: "/modern-luxury-barbershop-interior-dark-moody.jpg",
      specialties: ["Corte clásico", "Barba", "Tinte"],
    },
    {
      id: "2",
      name: "Elegance Hair",
      address: "Calle Libertad 5678, Palermo",
      rating: 4.9,
      nextAvailable: "Mañana 10:00",
      image: "/elegant-hair-salon-dark-modern.jpg",
      specialties: ["Color", "Tratamientos", "Peinados"],
    },
    {
      id: "3",
      name: "The Barber Co.",
      address: "Av. Santa Fe 9012, Recoleta",
      rating: 4.7,
      nextAvailable: "Hoy 16:00",
      image: "/vintage-barbershop-dark-ambient.jpg",
      specialties: ["Afeitado", "Corte masculino", "Arreglo barba"],
    },
    {
      id: "4",
      name: "Belleza Total",
      address: "Calle Thames 3456, Villa Crespo",
      rating: 4.6,
      nextAvailable: "Hoy 18:30",
      image: "/beauty-salon-dark-elegant.jpg",
      specialties: ["Mechas", "Alisado", "Nutrición"],
    },
    {
      id: "5",
      name: "Estilo Premium",
      address: "Av. Cabildo 7890, Belgrano",
      rating: 5.0,
      nextAvailable: "Pasado 11:00",
      image: "/premium-hair-studio-dark-sophisticated.jpg",
      specialties: ["Keratina", "Balayage", "Corte premium"],
    },
  ]

  const handleAction = (action: string, salon: SalonData) => {
    console.log(`[v0] Action: ${action} on salon: ${salon.name}`)
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Gestión de Peluquerías
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-base text-zinc-400">
            Administra y accede rápidamente a tus salones de belleza
          </p>
        </div>

        {/* Carousel */}
        <div className="relative">
          <GenericCarousel
            items={salons}
            onSelectionChange={(salon) => setSelectedSalon(salon)}
            renderItem={(salon) => (
              <div className="group relative h-[320px] overflow-hidden rounded-2xl bg-zinc-900 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/5">
                {/* Image - smaller height for landscape format */}
                <div className="relative h-40 w-full overflow-hidden">
                  <img
                    src={salon.image || "/placeholder.svg"}
                    alt={salon.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-zinc-900" />

                  {/* Floating rating badge with glassmorphism effect */}
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-md">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold text-white">{salon.rating}</span>
                  </div>
                </div>

                {/* Content - more space for landscape format */}
                <div className="relative space-y-3 p-5">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-white">{salon.name}</h3>
                    <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{salon.address}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-sm text-emerald-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-medium">{salon.nextAvailable}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      onClick={() => handleAction("edit", salon)}
                      size="sm"
                      className="flex-1 gap-2 rounded-xl bg-white font-medium text-black transition-all hover:bg-white/90 hover:shadow-lg hover:shadow-white/20"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleAction("appointments", salon)}
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2 rounded-xl border-zinc-700 bg-zinc-800/80 font-medium text-white backdrop-blur-sm transition-all hover:border-zinc-600 hover:bg-zinc-700"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Turnos
                    </Button>
                    <Button
                      onClick={() => handleAction("config", salon)}
                      size="sm"
                      variant="outline"
                      className="gap-2 rounded-xl border-zinc-700 bg-zinc-800/80 px-3 text-white backdrop-blur-sm transition-all hover:border-zinc-600 hover:bg-zinc-700"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      onClick={() => handleAction("stats", salon)}
                      size="sm"
                      variant="outline"
                      className="gap-2 rounded-xl border-zinc-700 bg-zinc-800/80 px-3 text-white backdrop-blur-sm transition-all hover:border-zinc-600 hover:bg-zinc-700"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Hover glow effect */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ boxShadow: "inset 0 0 20px rgba(255,255,255,0.05)" }}
                />
              </div>
            )}
            slidesToShow={{
              default: 1,
              640: 2,
              1024: 3,
            }}
            gap={20}
            className="px-4"
          />
        </div>

        {/* Selected salon info with enhanced styling */}
        {selectedSalon && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-6 backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Seleccionado</p>
                <p className="mt-1 text-2xl font-semibold text-white">{selectedSalon.name}</p>
                <p className="mt-1 text-sm text-zinc-400">{selectedSalon.address}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSalon.specialties.map((specialty, idx) => (
                    <span key={idx} className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-white">{selectedSalon.rating}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
