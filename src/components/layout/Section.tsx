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
    <section className={cn("space-y-4 md:space-y-5 p-4 md:p-6", className)} {...props}>
      {(title || action) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          {title && (
            <div>
              <h2 className="text-xl md:text-2xl font-semibold leading-none">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
          )}
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

