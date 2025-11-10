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
        "flex flex-col gap-6 md:gap-8 rounded-3xl border border-border/50 bg-card/70 p-4 sm:p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60",
        className,
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title && (
            <div className="space-y-1">
              <h2 className="text-lg font-semibold sm:text-xl md:text-2xl">{title}</h2>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          )}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="flex flex-col gap-6 md:gap-8">{children}</div>
    </section>
  );
}

