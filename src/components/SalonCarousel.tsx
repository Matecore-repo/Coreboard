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
    <div className="relative px-4">
      <Carousel className="w-full" opts={{ align: 'start', containScroll: 'trimSnaps', loop: false }}>
        <CarouselContent className="-ml-3">
          {salons.map((salon) => (
            <CarouselItem key={salon.id} className="pl-3 md:basis-1/2 lg:basis-1/3">
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
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    </div>
  );
}
