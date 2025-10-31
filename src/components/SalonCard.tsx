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
    <div className="px-0.5 py-1 h-full">
      <div
        onClick={onClick}
        className={`group relative rounded-2xl overflow-hidden cursor-pointer h-44 will-change-transform transform-gpu transition-all duration-300 ease-out ${
          isSelected 
            ? "ring-2 ring-primary shadow-xl dark:shadow-xl/50 scale-[1.02]" 
            : isDimmed 
            ? "opacity-50 grayscale-[0.3] brightness-75 scale-[0.98]" 
            : "hover:ring-2 hover:ring-primary/50 hover:shadow-lg dark:hover:shadow-lg/50 hover:scale-[1.01]"
        }`}
      >
      <ImageWithFallback
        src={image}
        alt={name}
        className={`w-full h-full object-cover transition-transform duration-300 ease-out will-change-transform transform-gpu ${
          isSelected ? "scale-105" : "group-hover:scale-105"
        }`}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      
      {/* Overlay uniforme con transición suave */}
      <div className={`absolute inset-0 transition-all duration-300 ease-out pointer-events-none ${
        isSelected 
          ? "bg-gradient-to-t from-black/95 via-black/75 to-black/45" 
          : isDimmed
          ? "bg-gradient-to-t from-black/95 via-black/75 to-black/50"
          : "bg-gradient-to-t from-black/90 via-black/60 to-black/35 group-hover:from-black/95 group-hover:via-black/70"
      }`} />
      
      {/* Efecto de brillo sutil en selección */}
      {isSelected && (
        <div 
          className="absolute inset-0 pointer-events-none animate-shimmer" 
          style={{ 
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
            width: '40%',
            height: '100%',
          }} 
        />
      )}
      
      {/* Backdrop blur para mejor legibilidad */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 backdrop-blur-sm bg-black/20 dark:bg-black/40 transition-transform duration-300 ease-out ${
        isSelected ? "translate-y-0" : "group-hover:translate-y-0"
      }`}>
        <h3 className={`mb-1 truncate font-medium transition-all duration-300 ${
          isSelected ? "text-base" : "text-sm group-hover:text-base"
        } text-white dark:text-white`}>{name}</h3>
        <div className="flex items-center gap-1.5 text-white dark:text-white/90">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate text-xs">{address}</span>
        </div>
      </div>
      </div>
    </div>
  );
});
