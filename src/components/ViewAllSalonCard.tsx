import React from "react";
import { cn } from "./ui/utils";

interface ViewAllSalonCardProps {
  onClick: () => void;
  isSelected: boolean;
  isDimmed?: boolean;
}

export function ViewAllSalonCard({
  onClick,
  isSelected,
  isDimmed = false,
}: ViewAllSalonCardProps) {
  return (
    <div
      className={cn(
        "relative flex-1 flex items-center justify-center select-none cursor-pointer rounded-[1.8rem] border border-border/60 dark:border-border/40 bg-card text-card-foreground overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] dark:shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
        isSelected && "shadow-[inset_0_0_0_0.2rem_hsl(var(--primary))]"
      )}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label="Seleccionar todos los locales"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/40 dark:from-white/5 dark:via-transparent dark:to-black/80 pointer-events-none" />
      <span className="relative z-[1] text-4xl font-semibold">
        ∞
      </span>
    </div>
  );
}

