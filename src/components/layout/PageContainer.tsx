import * as React from "react";
import { cn } from "../ui/utils";
import { Breadcrumbs } from "../ui/Breadcrumbs";

interface PageContainerProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function PageContainer({ className, children, title, breadcrumbs, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        "max-w-screen-2xl mx-auto px-[20px] pt-[20px] pb-[20px]",
        className
      )}
      {...props}
    >
      {(title || breadcrumbs) && (
        <div className="mb-6 space-y-2">
          {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
          {title && (
            <h1 className="text-2xl md:text-3xl font-semibold">{title}</h1>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

