import * as React from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import useEmblaCarousel from "embla-carousel-react";

interface GenericCarouselProps<T> {
  items: T[];
  selectedItem: string | null;
  onSelectItem: (id: string, name: string) => void;
  renderItem: (item: T, isSelected: boolean, isDimmed: boolean) => React.ReactNode;
  getItemId: (item: T) => string;
  getItemName: (item: T) => string;
  specialItem?: {
    id: string;
    name: string;
    render: (isSelected: boolean, isDimmed: boolean) => React.ReactNode;
  };
  carouselOpts?: Parameters<typeof useEmblaCarousel>[0];
  emptyState?: React.ReactNode;
  loading?: boolean;
  className?: string;
  itemClassName?: string;
  specialItemClassName?: string;
  showNavigation?: boolean;
}

export function GenericCarousel<T>({
  items,
  selectedItem,
  onSelectItem,
  renderItem,
  getItemId,
  getItemName,
  specialItem,
  carouselOpts = {
    align: 'start',
    containScroll: 'keepSnaps',
    loop: false,
    duration: 20,
  },
  emptyState,
  loading = false,
  className,
  itemClassName = "pl-4 last:pr-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4 min-w-0",
  specialItemClassName = "pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4 min-w-0",
  showNavigation = true,
}: GenericCarouselProps<T>) {
  const hasSelection = selectedItem !== null && selectedItem !== undefined;

  if (loading) {
    return (
      <div className={className || "relative py-4"}>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground text-sm">Cargando...</div>
        </div>
      </div>
    );
  }

  const hasItems = items.length > 0 || specialItem !== undefined;

  if (!hasItems && emptyState) {
    return (
      <div className={className || "relative py-4"}>
        {emptyState}
      </div>
    );
  }

  if (!hasItems) {
    return null;
  }

  return (
    <div className={className || "relative py-4 px-2 sm:px-4"}>
      <Carousel 
        className="w-full" 
        opts={carouselOpts}
      >
        <CarouselContent className="-ml-4 py-2 sm:py-3">
          {specialItem && (
            <CarouselItem 
              key={specialItem.id} 
              className={specialItemClassName}
            >
              {specialItem.render(
                selectedItem === specialItem.id || selectedItem === null,
                hasSelection && selectedItem !== specialItem.id
              )}
            </CarouselItem>
          )}
          {items.map((item) => {
            const itemId = getItemId(item);
            const itemName = getItemName(item);
            return (
              <CarouselItem 
                key={itemId} 
                className={itemClassName}
              >
                {renderItem(
                  item,
                  selectedItem === itemId,
                  hasSelection && selectedItem !== itemId
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {showNavigation && (
          <>
            <CarouselPrevious className="left-2 md:left-4" />
            <CarouselNext className="right-2 md:right-4" />
          </>
        )}
      </Carousel>
    </div>
  );
}

