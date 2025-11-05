"use client";

import { cn } from "./utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: "default" | "card" | "text" | "circular";
  width?: string;
  height?: string;
}

export function SkeletonLoader({
  className,
  variant = "default",
  width,
  height,
}: SkeletonLoaderProps) {
  const baseClasses = "animate-pulse bg-muted rounded";
  
  const variantClasses = {
    default: "h-4 w-full",
    card: "h-32 w-full",
    text: "h-4 w-full",
    circular: "h-12 w-12 rounded-full",
  };

  const style = {
    ...(width && { width }),
    ...(height && { height }),
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonLoader variant="circular" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" width="60%" />
          <SkeletonLoader variant="text" width="40%" />
        </div>
      </div>
      <div className="flex gap-4">
        <SkeletonLoader variant="text" width="30%" />
        <SkeletonLoader variant="text" width="30%" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

