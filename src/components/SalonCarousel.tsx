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
  selectedSalon?: string | null;
  onSelectSalon?: (salonId: string, salonName: string) => void;
}

const FALLBACK_ITEMS: Salon[] = Array.from({ length: 6 }).map((_, index) => ({
  id: `placeholder-${index}`,
  name: `Local ${index + 1}`,
  address: "Dirección pendiente",
}));

export function SalonCarousel({ salons, selectedSalon, onSelectSalon }: SalonCarouselProps) {
  const baseItems = salons?.length ? salons.slice(0, 6) : FALLBACK_ITEMS;
  const filledItems =
    baseItems.length >= 6
      ? baseItems
      : [...baseItems, ...FALLBACK_ITEMS].slice(0, 6);

  return (
    <Carousel
      className="w-full max-w-4xl mx-auto"
      opts={{ align: "start", loop: true }}
    >
      <CarouselContent className="-ml-2 sm:-ml-4">
        {filledItems.map((item, index) => (
          <CarouselItem
            key={`${item.id}-${index}`}
            className="basis-full sm:basis-1/2 lg:basis-1/3 pl-2 sm:pl-4"
          >
            <Card
              className={`h-full transition-all duration-200 hover:border-primary hover:shadow-lg ${selectedSalon === item.id ? "border-primary shadow-lg" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSalon?.(item.id, item.name)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectSalon?.(item.id, item.name);
                }
              }}
            >
              <CardContent className="flex aspect-square flex-col items-center justify-center gap-2 p-6 text-center">
                <span className="text-2xl font-semibold text-foreground">
                  {index + 1}
                </span>
                <span className="text-sm text-muted-foreground">
                  {item.name}
                </span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
