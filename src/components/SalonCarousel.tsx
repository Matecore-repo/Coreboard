import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "./ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./ui/carousel";

interface Salon {
  id: string;
  name: string;
  address?: string;
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
  const programmaticScrollRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const hasSyncedInitialSelectionRef = useRef(false);

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

    const targetIndex = findIndexById(selectedSalon);
    if (carouselApi.selectedScrollSnap() !== targetIndex) {
      programmaticScrollRef.current = true;
      const shouldJump = !hasSyncedInitialSelectionRef.current;
      carouselApi.scrollTo(targetIndex, shouldJump);
    }
    if (!hasSyncedInitialSelectionRef.current) {
      hasSyncedInitialSelectionRef.current = true;
    }
  }, [carouselApi, findIndexById, selectedSalon]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const handleEmblaSelect = () => {
      const activeIndex = carouselApi.selectedScrollSnap();

      if (programmaticScrollRef.current) {
        programmaticScrollRef.current = false;
        return;
      }

      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
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

    carouselApi.on("select", handleEmblaSelect);
    carouselApi.on("reInit", handleEmblaSelect);

    // No disparar selección en el montaje inicial
    handleEmblaSelect();

    return () => {
      carouselApi.off("select", handleEmblaSelect);
      carouselApi.off("reInit", handleEmblaSelect);
    };
  }, [carouselApi, carouselItems, onSelectSalon]);

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
            if (targetId === selectedSalonRef.current) {
              if (carouselApi) {
                carouselApi.scrollTo(index);
              }
              return;
            }

            if (carouselApi) {
              programmaticScrollRef.current = true;
              carouselApi.scrollTo(index);
            }

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
