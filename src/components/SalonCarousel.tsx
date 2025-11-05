import { GenericCarousel } from "./GenericCarousel";
import { SalonCard } from "./SalonCard";
import { ViewAllSalonCard } from "./ViewAllSalonCard";

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
  return (
    <GenericCarousel
      items={salons}
      selectedItem={selectedSalon}
      onSelectItem={onSelectSalon}
      getItemId={(salon) => salon.id}
      getItemName={(salon) => salon.name}
      renderItem={(salon, isSelected, isDimmed) => (
        <SalonCard
          name={salon.name}
          address={salon.address}
          image={salon.image}
          onClick={() => onSelectSalon(salon.id, salon.name)}
          isSelected={isSelected}
          isDimmed={isDimmed}
        />
      )}
      specialItem={{
        id: 'all',
        name: 'Todas',
        render: (isSelected, isDimmed) => (
          <ViewAllSalonCard
            onClick={() => onSelectSalon('all', 'Todas')}
            isSelected={isSelected}
            isDimmed={isDimmed}
          />
        ),
      }}
    />
  );
}
