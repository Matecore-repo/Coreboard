import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

    const handleEmblaReInit = () => {
      const targetIndex = findIndexById(selectedSalonRef.current);
      ignoreNextSelectRef.current = true;
      carouselApi.scrollTo(targetIndex, true);
    };

    carouselApi.on("reInit", handleEmblaReInit);

    handleEmblaReInit();

    return () => {
      carouselApi.off("reInit", handleEmblaReInit);
    };
  }, [carouselApi, findIndexById]);

  return (
    <Carousel
      className="w-full max-w-4xl mx-auto"
      opts={{ align: "start", loop: true }}
      setApi={setCarouselApi}
    >
      <CarouselContent className="-ml-2 md:-ml-4">
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
              className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 min-w-0"
            >
              <div className="p-1 h-full">
                <div className="w-full aspect-square flex">
                  {isAllOption ? (
                    <ViewAllSalonCard
                      onClick={handleSelect}
                      isSelected={isSelected}
                    />
                  ) : (
                    <div
                      className={cn(
                        "relative flex-1 select-none cursor-pointer rounded-[1.8rem] border border-border/60 dark:border-border/40 bg-card text-card-foreground overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] dark:shadow-none transition-all duration-500 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg h-56 md:h-64",
                        isSelected && "border-primary shadow-lg scale-[1.02]"
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
                      {/* Background image + gradient overlays (diseño original) */}
                      <div className="absolute inset-0 z-0">
                        <ImageWithFallback
                          src={item.image || ""}
                          alt={item.name}
                          className="w-full h-full"
                          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                        />
                      </div>
                      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-black/60 to-black/95" />
                      <div className="absolute inset-x-0 bottom-0 h-2/3 z-[2] bg-gradient-to-t from-black/95 via-black/80 to-black/40 backdrop-blur-[2px]" />

                      {/* Contenido minimalista: número de orden + nombre */}
                      <div className="absolute inset-0 z-[3] flex flex-col items-center justify-end pb-6 px-4 text-center">
                        <span className="text-3xl font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                          {"order" in item ? item.order : index + 1}
                        </span>
                        <span className="mt-2 text-sm font-medium text-neutral-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] line-clamp-2">
                          {item.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
