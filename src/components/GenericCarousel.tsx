import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "./ui/utils";

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
  gap?: number;
  slidesToShow?: {
    default?: number;
    640?: number;
    768?: number;
    1024?: number;
    1280?: number;
  };
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
  gap = 16,
  slidesToShow = { default: 1, 640: 2, 1024: 3 },
  itemClassName,
  specialItemClassName,
  showNavigation = true,
}: GenericCarouselProps<T>) {
  const hasSelection = selectedItem !== null && selectedItem !== undefined;

  const getBasisClass = (count?: number) => {
    switch (count) {
      case 1:
      case undefined:
        return "basis-full";
      case 2:
        return "basis-1/2";
      case 3:
        return "basis-1/3";
      case 4:
        return "basis-1/4";
      default:
        return "basis-full";
    }
  };

  const responsiveClasses = React.useMemo(() => {
    const classes = [
      slidesToShow?.default ? getBasisClass(slidesToShow.default) : null,
      slidesToShow?.[640] ? `sm:${getBasisClass(slidesToShow[640])}` : null,
      slidesToShow?.[768] ? `md:${getBasisClass(slidesToShow[768])}` : null,
      slidesToShow?.[1024] ? `lg:${getBasisClass(slidesToShow[1024])}` : null,
      slidesToShow?.[1280] ? `xl:${getBasisClass(slidesToShow[1280])}` : null,
    ].filter(Boolean) as string[];

    if (!classes.length) {
      return ["sm:basis-1/2", "lg:basis-1/3"];
    }

    return classes;
  }, [slidesToShow]);

  const defaultItemClasses = React.useMemo(
    () => cn(responsiveClasses.join(" "), "min-w-0 flex items-stretch"),
    [responsiveClasses],
  );

  const spacingClasses = React.useMemo(() => {
    const spacingMap: Record<number, { content: string; item: string }> = {
      8: { content: "-ml-2", item: "pl-2" },
      12: { content: "-ml-3", item: "pl-3" },
      16: { content: "-ml-4", item: "pl-4" },
      20: { content: "-ml-5", item: "pl-5" },
      24: { content: "-ml-6", item: "pl-6" },
    };

    const fallback = spacingMap[16];
    const selected = spacingMap[gap];

    return selected ?? fallback;
  }, [gap]);

  if (loading) {
    return (
      <div className={className || "relative py-6"}>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground text-sm">Cargando...</div>
        </div>
      </div>
    );
  }

  const hasItems = items.length > 0 || specialItem !== undefined;

  if (!hasItems && emptyState) {
    return (
      <div className={className || "relative py-6"}>
        {emptyState}
      </div>
    );
  }

  if (!hasItems) {
    return null;
  }

  return (
    <div
      className={
        className ||
        "relative w-full rounded-2xl border border-border/40 bg-muted/30 px-4 py-5 shadow-sm dark:bg-muted/10"
      }
    >
      <Carousel className="w-full" opts={carouselOpts}>
        <CarouselContent
          className={cn("py-1 sm:py-2", spacingClasses.content)}
        >
          {specialItem && (
            <CarouselItem
              key={specialItem.id}
              className={cn(defaultItemClasses, spacingClasses.item, specialItemClassName)}
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
                className={cn(defaultItemClasses, spacingClasses.item, itemClassName)}
                aria-label={itemName}
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
            <CarouselPrevious />
            <CarouselNext />
          </>
        )}
      </Carousel>
    </div>
  );
}

