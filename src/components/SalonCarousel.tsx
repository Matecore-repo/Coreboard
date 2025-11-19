import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { turnosStore } from "../stores/turnosStore";

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

export function SalonCarousel({
  salons,
  selectedSalon,
  onSelectSalon,
}: SalonCarouselProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>(
    undefined,
  );
  const ignoreNextSelectRef = useRef(false);

  const todayStr = useMemo(
    () => new Date().toISOString().split("T")[0],
    [],
  );

  const todayAppointmentsBySalon = useMemo(() => {
    const todayTurnos = turnosStore.getByDate(todayStr);
    const map = new Map<string, number>();

    for (const turno of todayTurnos) {
      if (!turno.salonId) continue;
      map.set(turno.salonId, (map.get(turno.salonId) ?? 0) + 1);
    }

    return map;
  }, [todayStr]);

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
          const todayCount = !isAllOption
            ? todayAppointmentsBySalon.get(item.id) ?? 0
            : 0;

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
                        "relative flex-1 select-none cursor-pointer rounded-[1.8rem] border border-border/60 dark:border-border/40 bg-card text-card-foreground overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] dark:shadow-none transition-all duration-500 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
                        isSelected && "border-primary shadow-lg scale-[1.02]",
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
                      <div className="absolute inset-0">
                        {item.image ? (
                          <ImageWithFallback
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted" />
                        )}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black/85 via-black/40 to-transparent dark:from-neutral-950/90 dark:via-neutral-950/50 dark:to-transparent" />

                      <div className="absolute inset-0 flex flex-col justify-end px-5 pb-6 pt-8">
                        <div className="w-full rounded-2xl bg-white/95 dark:bg-neutral-950/95 px-4 py-3 backdrop-blur-sm shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                          <div className="flex flex-col gap-2">
                            <div>
                              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                                {item.name}
                              </h3>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-300">
                                  Turnos de hoy
                                </span>
                                <span className="text-base font-semibold text-neutral-900 dark:text-white">
                                  {todayCount}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="px-4 py-2 rounded-full bg-neutral-900 text-white text-[11px] font-medium whitespace-nowrap shadow-sm dark:bg-white dark:text-neutral-950"
                              >
                                Nuevo turno
                              </button>
                            </div>
                          </div>
                        </div>
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
