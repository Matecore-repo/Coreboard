import { memo } from "react";
import { MapPin } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { cn } from "./ui/utils";

interface SalonCardProps {
  name: string;
  address: string;
  image: string;
  onClick: () => void;
  isSelected: boolean;
  isDimmed?: boolean;
}

export const SalonCard = memo(function SalonCard({
  name,
  address,
  image,
  onClick,
  isSelected,
  isDimmed = false,
}: SalonCardProps) {
  const stateClasses = cn(
    "group relative flex h-full w-full cursor-pointer min-h-[232px] flex-col overflow-hidden rounded-xl border bg-card/70 text-left shadow-sm transition-all duration-300 ease-out dark:bg-card/20",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
    {
      "border-primary/60 shadow-md shadow-primary/10 ring-1 ring-primary/30 dark:border-primary/40 dark:shadow-primary/20": isSelected,
      "opacity-65 grayscale-[0.15] saturate-[0.8]": isDimmed && !isSelected,
      "hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 dark:hover:border-primary/50": !isSelected && !isDimmed,
    },
  );

  return (
    <div className="px-0.5 py-1 h-full">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        className={stateClasses}
      >
        <div className="relative w-full overflow-hidden">
          <ImageWithFallback
            src={image}
            alt={name}
            className="w-full aspect-[4/3]"
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/10 to-background/40 transition-opacity duration-300 group-hover:opacity-90 dark:from-background/10 dark:via-background/30 dark:to-background/60" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="max-w-[70%] truncate text-base font-semibold text-foreground group-hover:text-primary">
              {name}
            </h3>
            {isSelected && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Activo
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
            <span className="truncate">{address}</span>
          </p>
        </div>

        <span className="absolute inset-x-4 bottom-4 h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-primary/60" />
      </button>
    </div>
  );
});
