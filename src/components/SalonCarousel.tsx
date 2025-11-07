import React from "react";
import { Card, CardContent } from "./ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";

interface Salon {
  id: string;
  name: string;
  address?: string;
}

interface SalonCarouselProps {
  salons?: Salon[];
}

const FALLBACK_ITEMS: Salon[] = Array.from({ length: 5 }).map((_, index) => ({
  id: `placeholder-${index}`,
  name: `Local ${index + 1}`,
  address: "Dirección pendiente",
}));

export function SalonCarousel({ salons }: SalonCarouselProps) {
  const items = salons?.length ? salons.slice(0, 5) : FALLBACK_ITEMS;

  return (
    <Carousel className="w-full max-w-xs">
      <CarouselContent>
        {items.map((item, index) => (
          <CarouselItem key={item.id}>
            <div className="p-1">
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-3xl font-semibold">
                    {item.name || `Local ${index + 1}`}
                  </span>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
