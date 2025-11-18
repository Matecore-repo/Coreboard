import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Compass } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./ui/carousel";
import { ViewAllSalonCard } from "./ViewAllSalonCard";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Skeleton } from "./ui/skeleton";
import { cn } from "./ui/utils";

interface Salon {
  id: string;
  name: string;
  address?: string;
  image?: string;
}

type CarouselEntry =
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

const MAX_VISIBLE_ITEMS = 6;
export function SalonCarousel({ salons, selectedSalon, onSelectSalon }: SalonCarouselProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>(undefined);
  const ignoreNextSelectRef = useRef(false);

  const trimmedSalons = useMemo(
    () => (salons ?? []).slice(0, MAX_VISIBLE_ITEMS - 1),
    [salons],
  );

  const carouselItems: CarouselEntry[] = useMemo(
    () => [
      {
        id: "all",
        name: "Seleccionar todos los locales",
        isAllOption: true as const,
      },
      ...trimmedSalons.map((item, index) => ({
        ...item,
        order: index + 1,
      })),
    ],
    [trimmedSalons],
  );

  const selectedSalonRef = useRef<string | null | undefined>(selectedSalon);
  useEffect(() => {
    selectedSalonRef.current = selectedSalon;
  }, [selectedSalon]);

  const findIndexById = useCallback(
    (id?: string | null) => {
      if (!id || id === "all") {
        return 0;
      }

      const matchIndex = carouselItems.findIndex(
        (item): item is Salon & { order: number } =>
          !("isAllOption" in item) && item.id === id,
      );

      return matchIndex === -1 ? 0 : matchIndex;
    },
    [carouselItems],
  );

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const targetIndex = findIndexById(selectedSalonRef.current);
    if (carouselApi.selectedScrollSnap() !== targetIndex) {
      ignoreNextSelectRef.current = true;
      carouselApi.scrollTo(targetIndex, true);
    }
  }, [carouselApi, findIndexById, selectedSalon]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const handleEmblaSelect = () => {
      const activeIndex = carouselApi.selectedScrollSnap();

      if (ignoreNextSelectRef.current) {
        ignoreNextSelectRef.current = false;
        return;
      }

      const activeItem = carouselItems[activeIndex];
      if (!activeItem) {
        return;
      }

      const isAllOption = "isAllOption" in activeItem;
      const targetId = isAllOption ? "all" : activeItem.id;
      const targetName = isAllOption ? "Todos los locales" : activeItem.name;

      if (targetId !== selectedSalonRef.current) {
        onSelectSalon?.(targetId, targetName);
      }
    };

    const handleEmblaReInit = () => {
      const targetIndex = findIndexById(selectedSalonRef.current);
      ignoreNextSelectRef.current = true;
      carouselApi.scrollTo(targetIndex, true);
    };

    carouselApi.on("select", handleEmblaSelect);
    carouselApi.on("reInit", handleEmblaReInit);

    handleEmblaReInit();

    return () => {
      carouselApi.off("select", handleEmblaSelect);
      carouselApi.off("reInit", handleEmblaReInit);
    };
  }, [carouselApi, carouselItems, onSelectSalon, findIndexById]);

  return (
    <Carousel
      className="w-full max-w-4xl mx-auto"
      opts={{ align: "start", loop: true }}
      setApi={setCarouselApi}
    >
      <CarouselContent className="-ml-2 sm:-ml-4">
        {carouselItems.map((item, index) => {
          const isAllOption = "isAllOption" in item;
          const isSelected = isAllOption
            ? selectedSalon === "all"
            : selectedSalon === item.id;

          const handleSelect = () => {
            const targetId = isAllOption ? "all" : item.id;
            const targetName = isAllOption ? "Todos los locales" : item.name;
            if (targetId === selectedSalonRef.current) {
              if (carouselApi) {
                ignoreNextSelectRef.current = true;
                carouselApi.scrollTo(index, true);
              }
              return;
            }

            if (carouselApi) {
              ignoreNextSelectRef.current = true;
              carouselApi.scrollTo(index);
            }

            onSelectSalon?.(targetId, targetName);
          };

          return (
            <CarouselItem
              key={`${item.id}-${index}`}
              className="basis-full sm:basis-1/2 lg:basis-1/3 pl-2 sm:pl-4"
            >
              {isAllOption ? (
                <ViewAllSalonCard
                  onClick={handleSelect}
                  isSelected={isSelected}
                />
              ) : (
                <Card
                  className={cn(
                    "group relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    isSelected && "border-primary shadow-md"
                  )}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Seleccionar ${item.name}`}
                  onClick={handleSelect}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelect();
                    }
                  }}
                >
                  {/* Imagen de fondo o skeleton */}
                  <div className="absolute inset-0">
                    {item.image && item.image.trim() ? (
                      <ImageWithFallback
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full"
                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                      />
                    ) : (
                      <Skeleton className="w-full h-full absolute inset-0" />
                    )}
                  </div>

                  {/* Overlay sutil */}
                  <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/10 to-background/60 dark:from-background/0 dark:via-background/20 dark:to-background/70" />

                  {/* Contenido centrado */}
                  <CardContent className="relative z-10 flex aspect-square flex-col items-center justify-center gap-2 text-center p-6">
                    <span className="text-2xl font-semibold text-foreground">
                      {"order" in item ? item.order : index + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.name}
                    </span>
                  </CardContent>
                </Card>
              )}
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
