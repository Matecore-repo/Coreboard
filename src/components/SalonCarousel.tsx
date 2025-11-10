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

type CarouselItem =
  | (Salon & { order: number })
  | {
      id: "all";
      name: string;
      isAllOption: true;
    };

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
  const MAX_VISIBLE_ITEMS = 6;

  const baseItems = salons?.length
    ? salons.slice(0, MAX_VISIBLE_ITEMS - 1)
    : FALLBACK_ITEMS.slice(0, MAX_VISIBLE_ITEMS - 1);

  const filledItems =
    baseItems.length >= MAX_VISIBLE_ITEMS - 1
      ? baseItems
      : [...baseItems, ...FALLBACK_ITEMS].slice(0, MAX_VISIBLE_ITEMS - 1);

  const carouselItems: CarouselItem[] = [
    {
      id: "all",
      name: "Seleccionar todos los locales",
      isAllOption: true as const,
    },
    ...filledItems.map((item, index) => ({
      ...item,
      order: index + 1,
    })),
  ];

  return (
    <Carousel
      className="w-full max-w-4xl mx-auto"
      opts={{ align: "start", loop: true }}
    >
      <CarouselContent className="-ml-2 sm:-ml-4">
        {carouselItems.map((item, index) => {
          const isAllOption = "isAllOption" in item;
          const isSelected = isAllOption
            ? selectedSalon === "all"
            : selectedSalon === item.id;

          const cardClasses = [
            "h-full transition-all duration-200 hover:border-primary hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            isSelected ? "border-primary shadow-lg" : "",
            isAllOption
              ? "bg-black text-white hover:bg-black/90 hover:text-white dark:bg-zinc-900 dark:text-zinc-50"
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          const handleSelect = () => {
            const targetId = isAllOption ? "all" : item.id;
            const targetName = isAllOption ? "Todos los locales" : item.name;
            onSelectSalon?.(targetId, targetName);
          };

          return (
            <CarouselItem
              key={`${item.id}-${index}`}
              className="basis-full sm:basis-1/2 lg:basis-1/3 pl-2 sm:pl-4"
            >
              <Card
                className={cardClasses}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={isAllOption ? "Seleccionar todos los locales" : `Seleccionar ${item.name}`}
                onClick={handleSelect}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelect();
                  }
                }}
              >
                <CardContent
                  className={`flex aspect-square flex-col items-center justify-center gap-2 p-6 text-center ${
                    isAllOption ? "text-white" : ""
                  }`}
                >
                  {isAllOption ? (
                    <>
                      <span className="text-sm uppercase tracking-wide opacity-80">
                        Vista consolidada
                      </span>
                      <span className="text-lg font-semibold">
                        Seleccionar todos los locales
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-semibold text-foreground">
                        {"order" in item ? item.order : index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.name}
                      </span>
                    </>
                  )}
                </CardContent>
              </Card>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
