import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import { AnimatePresence, motion } from "motion/react";
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
const ALL_OPTION_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1600&q=75",
  },
  {
    image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1600&q=75",
  },
  {
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=75",
  },
  {
    image: "https://images.unsplash.com/photo-1520880867055-1e30d1cb001c?auto=format&fit=crop&w=1600&q=75",
  },
  {
    image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=75",
  },
  {
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=75",
  },
  {
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=75",
  },
] as const;

export function SalonCarousel({ salons, selectedSalon, onSelectSalon }: SalonCarouselProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>(undefined);
  const ignoreNextSelectRef = useRef(false);
  const [allSlidesIndex, setAllSlidesIndex] = useState(0);

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

  useEffect(() => {
    if (ALL_OPTION_SLIDES.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setAllSlidesIndex((prev) => (prev + 1) % ALL_OPTION_SLIDES.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

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
            "group relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            isSelected ? "border-primary shadow-md" : "",
            isAllOption
              ? "!border-none !bg-transparent !shadow-none !gap-0"
              : "",
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
                    <div className="relative flex h-full w-full items-center justify-center">
                      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-neutral-950 text-white shadow-[0_18px_42px_-24px_rgba(15,23,42,0.75)] transition-colors duration-300 dark:border-slate-200/40 dark:bg-white dark:text-slate-900 dark:shadow-[0_18px_36px_-24px_rgba(15,23,42,0.18)]">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={ALL_OPTION_SLIDES[allSlidesIndex]?.image ?? "fallback"}
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            aria-hidden
                          >
                            {ALL_OPTION_SLIDES[allSlidesIndex] ? (
                              <NextImage
                                src={ALL_OPTION_SLIDES[allSlidesIndex].image}
                                alt=""
                                fill
                                className="scale-110 object-cover opacity-90 blur-[36px] md:blur-[48px]"
                                sizes="(min-width: 1024px) 20vw, 60vw"
                                priority
                              />
                            ) : null}
                          </motion.div>
                        </AnimatePresence>

                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.88)_0%,_rgba(15,23,42,0.75)_45%,_rgba(15,23,42,0.6)_100%)] transition-colors duration-300 dark:bg-[radial-gradient(circle_at_center,_rgba(226,232,240,0.92)_0%,_rgba(241,245,249,0.82)_45%,_rgba(248,250,252,0.7)_100%)]" />
                        <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/65 to-black/55 transition-colors duration-300 dark:from-white/90 dark:via-white/82 dark:to-white/65" />

                        <div className="pointer-events-none absolute inset-0">
                          <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.6)_0%,_transparent_60%)] blur-[120px]" />
                          <div className="absolute inset-y-10 left-[18%] right-[18%] rounded-full border border-white/10 dark:border-slate-300/30" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center justify-center gap-3 text-center">
                          <span className="inline-flex size-14 items-center justify-center rounded-full bg-white/20 text-white transition-transform duration-300 group-hover:scale-[1.04] dark:bg-slate-950/10 dark:text-slate-900">
                            <Compass className="h-6 w-6" aria-hidden />
                          </span>
                          <span className="text-sm font-semibold uppercase tracking-[0.32em] text-white dark:text-slate-900">
                            Ver todos los locales
                          </span>
                        </div>
                      </div>
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
