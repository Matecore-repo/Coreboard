import * as React from "react";
import { cn } from "../ui/utils";

interface PageContainerProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
}

export function PageContainer({ className, children, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        "pb-20 max-w-screen-2xl mx-auto px-4 md:px-6 py-6 md:py-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

