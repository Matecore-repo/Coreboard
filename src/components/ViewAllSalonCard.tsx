import React, { useEffect, useState } from "react";
import { Globe2, Layers, Map, Sparkles } from "lucide-react";
import NextImage from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";

interface ViewAllSalonCardProps {
  onClick: () => void;
  isSelected: boolean;
  isDimmed?: boolean;
}

export function ViewAllSalonCard({ onClick, isSelected, isDimmed = false }: ViewAllSalonCardProps) {
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDES.length);
    }, 8000);

    return () => clearInterval(timer);
  }, []);

  const activeSlide = SLIDES[slideIndex];

  const cardClasses = cn(
    "relative flex h-full w-full cursor-pointer min-h-[232px] flex-col overflow-hidden rounded-xl border bg-card/70 text-left shadow-sm transition-all duration-300 ease-out dark:bg-card/25",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
    {
      "border-primary/60 shadow-md shadow-primary/10 ring-1 ring-primary/30 dark:border-primary/40 dark:shadow-primary/20": isSelected,
      "opacity-65 saturate-[0.85]": isDimmed && !isSelected,
      "hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 dark:hover:border-primary/50": !isSelected && !isDimmed,
    },
  );

  return (
    <div className="px-0.5 py-1 h-full">
      <button
        type="button"
        onClick={onClick}
        className={cn("group", cardClasses)}
        aria-pressed={isSelected}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.image}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            aria-hidden
          >
            <NextImage
              src={activeSlide.image}
              alt=""
              fill
              className="object-cover opacity-60"
              sizes="(min-width: 1024px) 18vw, 60vw"
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-br from-background/10 via-background/65 to-background/20 dark:from-background/20 dark:via-background/80 dark:to-background/30" />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-6">
          <div className="flex flex-col gap-4">
            <span className="inline-flex size-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-sm backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
              {React.createElement(activeSlide.icon, {
                className: "size-7",
                "aria-hidden": true,
              })}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-foreground group-hover:text-primary">
                Ver todo
              </span>
              <span className="text-sm text-muted-foreground">
                Mostrar todas las sedes y recursos disponibles
              </span>
            </div>
          </div>

          <span className="mt-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-px w-10 bg-current/40" aria-hidden />
            Filtro global
          </span>
        </div>

        <span className="absolute inset-x-4 bottom-4 h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-primary/60" />
      </button>
    </div>
  );
}

const SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=70",
    icon: Globe2,
  },
  {
    image: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?auto=format&fit=crop&w=1200&q=70",
    icon: Map,
  },
  {
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70",
    icon: Layers,
  },
  {
    image: "https://images.unsplash.com/photo-1520880867055-1e30d1cb001c?auto=format&fit=crop&w=1200&q=70",
    icon: Sparkles,
  },
] as const;

