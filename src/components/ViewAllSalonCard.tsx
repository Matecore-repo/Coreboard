import React from "react";
import { cn } from "./ui/utils";

interface ViewAllSalonCardProps {
  onClick: () => void;
  isSelected: boolean;
  isDimmed?: boolean;
}

export function ViewAllSalonCard({ onClick, isSelected, isDimmed = false }: ViewAllSalonCardProps) {
  return (
    <div
      className={cn(
        "shadow-[inset_0_0_0_0.2rem_hsl(var(--border))] rounded-[1.8rem] text-4xl font-semibold flex-1 flex items-center justify-center select-none cursor-pointer transition-all duration-300 hover:shadow-[inset_0_0_0_0.2rem_hsl(var(--primary))]",
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
      ∞
    </div>
  );
}
