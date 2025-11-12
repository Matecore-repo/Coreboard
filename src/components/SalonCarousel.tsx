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

          const cardClasses = [
            "relative h-full transition-all duration-200 hover:border-primary hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            isSelected ? "border-primary shadow-lg" : "",
            isAllOption ? "bg-black text-white dark:bg-white dark:text-black" : "",
          ]
            .filter(Boolean)
            .join(" ");

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
                  className={`flex aspect-square flex-col items-center justify-center gap-2 text-center ${
                    isAllOption
                      ? "relative overflow-hidden p-0 px-0 py-0 [&:last-child]:pb-0"
                      : "p-6"
                  }`}
                >
                  {isAllOption ? (
                    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[22px] bg-transparent text-current shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] dark:shadow-[inset_0_1px_0_rgba(15,23,42,0.12)]">
                      <div className="pointer-events-none absolute inset-0 opacity-90">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.12),_transparent_60%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(255,255,255,0.16)_0%,_transparent_50%,_rgba(255,255,255,0.16)_100%)] dark:bg-[linear-gradient(120deg,_rgba(15,23,42,0.1)_0%,_transparent_50%,_rgba(15,23,42,0.1)_100%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(0deg,_transparent_0%,_rgba(255,255,255,0.12)_50%,_transparent_100%)] dark:bg-[linear-gradient(0deg,_transparent_0%,_rgba(15,23,42,0.1)_50%,_transparent_100%)] mix-blend-soft-light" />
                      </div>
                      <span className="relative z-10 text-sm font-semibold uppercase tracking-[0.3em]">
                        Ver todos los locales
                      </span>
                    </div>
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
