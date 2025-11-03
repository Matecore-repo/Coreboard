import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { SalonCard } from "./SalonCard";

interface Salon {
  id: string;
  name: string;
  address: string;
  image: string;
  staff?: string[];
}

interface SalonCarouselProps {
  salons: Salon[];
  selectedSalon: string | null;
  onSelectSalon: (id: string, name: string) => void;
}

export function SalonCarousel({ 
  salons, 
  selectedSalon, 
  onSelectSalon,
}: SalonCarouselProps) {
  const hasSelection = selectedSalon !== null && selectedSalon !== undefined;
  
  return (
    <div className="relative -mx-[20px] px-[8px] sm:px-2 md:px-4 py-4">
      <Carousel 
        className="w-full" 
        opts={{ 
          align: 'start', 
          containScroll: 'trimSnaps', 
          loop: false,
          duration: 20,
        }}
      >
        <CarouselContent className="-ml-4 py-2">
          {/* Virtual card for All salons */}
          <CarouselItem key="all" className="pl-4 pr-2 md:pr-4 md:basis-1/2 lg:basis-1/3">
            <SalonCard
              name="Todas"
              address="Todas las peluquerías"
              image="/imagenlogin.jpg"
              onClick={() => onSelectSalon('all', 'Todas')}
              isSelected={selectedSalon === 'all' || selectedSalon === null}
              isDimmed={hasSelection && selectedSalon !== 'all'}
            />
          </CarouselItem>
          {salons.map((salon, index) => (
            <CarouselItem 
              key={salon.id} 
              className={`pl-2 md:pl-4 ${index === salons.length - 1 ? 'pr-4' : 'pr-2 md:pr-4'} md:basis-1/2 lg:basis-1/3`}
            >
              <SalonCard
                name={salon.name}
                address={salon.address}
                image={salon.image}
                onClick={() => onSelectSalon(salon.id, salon.name)}
                isSelected={selectedSalon === salon.id}
                isDimmed={hasSelection && selectedSalon !== salon.id}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 md:left-4 h-8 w-8" />
        <CarouselNext className="right-2 md:right-4 h-8 w-8" />
      </Carousel>
    </div>
  );
}
