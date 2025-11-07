"use client"

import type * as React from "react"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel"

interface GenericCarouselProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  slidesToShow?: {
    default?: number
    640?: number
    768?: number
    1024?: number
    1280?: number
  }
  gap?: number
  className?: string
  onSelectionChange?: (item: T) => void
}

export function GenericCarousel<T>({
  items,
  renderItem,
  slidesToShow = { default: 1, 640: 2, 1024: 3 },
  gap = 16,
  className = "",
  onSelectionChange,
}: GenericCarouselProps<T>) {
  const basisClasses = []

  if (slidesToShow.default) basisClasses.push(`basis-full`)
  if (slidesToShow[640]) basisClasses.push(`sm:basis-1/${slidesToShow[640]}`)
  if (slidesToShow[768]) basisClasses.push(`md:basis-1/${slidesToShow[768]}`)
  if (slidesToShow[1024]) basisClasses.push(`lg:basis-1/${slidesToShow[1024]}`)
  if (slidesToShow[1280]) basisClasses.push(`xl:basis-1/${slidesToShow[1280]}`)

  return (
    <div className={className}>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
      >
        <CarouselContent className={`-ml-${gap / 4}`}>
          {items.map((item, index) => (
            <CarouselItem
              key={index}
              className={`pl-${gap / 4} basis-full sm:basis-1/2 lg:basis-1/3`}
              onClick={() => onSelectionChange?.(item)}
            >
              {renderItem(item)}
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-0 -translate-x-12" />
        <CarouselNext className="right-0 translate-x-12" />
      </Carousel>
    </div>
  )
}
