import * as React from "react";
import { cn } from "../ui/utils";

interface SectionProps extends React.ComponentProps<"div"> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function Section({
  title,
  description,
  action,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-6 md:gap-8 rounded-3xl bg-card/70 p-4 sm:p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60",
        className,
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center sm:gap-4">
          {title && (
            <div className="space-y-1 min-w-0 flex-1">
              <h2 className="text-lg font-semibold sm:text-xl md:text-2xl">{title}</h2>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          )}
          {action && (
            <div className="flex flex-none items-center justify-end gap-2 sm:ml-auto">
              {action}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col gap-6 md:gap-8">{children}</div>
    </section>
  );
}

