import React from "react";
import { Card, CardContent } from "./ui/card";
import { cn } from "./ui/utils";

interface ViewAllSalonCardProps {
  onClick: () => void;
  isSelected: boolean;
  isDimmed?: boolean;
}

export function ViewAllSalonCard({ onClick, isSelected, isDimmed = false }: ViewAllSalonCardProps) {
  const cardClasses = cn(
    "group relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
    isSelected && "border-primary shadow-md"
  );

  return (
    <Card
      className={cardClasses}
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
      <CardContent className="flex aspect-square flex-col items-center justify-center gap-2 text-center p-6">
        <span className="text-2xl font-semibold text-foreground">
          ∞
        </span>
        <span className="text-sm text-muted-foreground">
          Ver todos los locales
        </span>
      </CardContent>
    </Card>
  );
}

