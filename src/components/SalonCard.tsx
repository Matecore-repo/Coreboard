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
      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 h-44 will-change-transform transform-gpu ${
        isSelected 
          ? "shadow-[0_0_0_2px_#030213,0_0_20px_rgba(3,2,19,0.3)] dark:shadow-[0_0_0_2px_#fff,0_0_30px_rgba(255,255,255,0.2)]" 
          : isDimmed 
          ? "opacity-50" 
          : "hover:shadow-[0_0_0_2px_#030213,0_0_15px_rgba(3,2,19,0.2)] dark:hover:shadow-[0_0_0_2px_#fff,0_0_20px_rgba(255,255,255,0.15)] hover:scale-[1.01]"
      }`}
    >
      <ImageWithFallback
        src={image}
        alt={name}
        className="w-full h-full object-cover transition-transform duration-200 ease-out will-change-transform transform-gpu"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      
      {/* Overlay con efecto de iluminaci├│n suave en hover */}
      <div className={`absolute inset-0 transition-opacity duration-200 pointer-events-none ${
        isSelected 
          ? "bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-100" 
          : isDimmed
          ? "bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-90"
          : "bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-90 group-hover:opacity-80"
      }`} />
      
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <h3 className="mb-0.5 truncate">{name}</h3>
        <div className="flex items-center gap-1.5 text-white/80">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate text-xs">{address}</span>
        </div>
      </div>
    </div>
  );
});
