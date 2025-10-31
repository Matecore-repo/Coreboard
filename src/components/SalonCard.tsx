import { memo } from "react";
import { MapPin } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface SalonCardProps {
  name: string;
  address: string;
  image: string;
  onClick: () => void;
  isSelected: boolean;
  isDimmed?: boolean;
}

export const SalonCard = memo(function SalonCard({ name, address, image, onClick, isSelected, isDimmed = false }: SalonCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ease-out h-44 will-change-transform transform-gpu ${
        isSelected 
          ? "ring-2 ring-primary shadow-lg dark:shadow-lg/50" 
          : isDimmed 
          ? "opacity-60" 
          : "hover:ring-2 hover:ring-primary/50 hover:shadow-md dark:hover:shadow-md/50"
      }`}
    >
      <ImageWithFallback
        src={image}
        alt={name}
        className="w-full h-full object-cover transition-transform duration-250 ease-out will-change-transform transform-gpu"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      
      {/* Overlay uniforme */}
      <div className={`absolute inset-0 transition-opacity duration-200 ease-out pointer-events-none ${
        isSelected 
          ? "bg-gradient-to-t from-black/95 via-black/70 to-black/40" 
          : isDimmed
          ? "bg-gradient-to-t from-black/90 via-black/60 to-black/35"
          : "bg-gradient-to-t from-black/90 via-black/60 to-black/35 group-hover:from-black/95 group-hover:via-black/70"
      }`} />
      
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h3 className="mb-1 truncate font-medium">{name}</h3>
        <div className="flex items-center gap-1.5 text-white/90">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate text-xs">{address}</span>
        </div>
      </div>
    </div>
  );
});
