import * as React from "react";
import { cn } from "../ui/utils";

interface PageContainerProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
}

export function PageContainer({ className, children, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        "max-w-screen-2xl mx-auto px-4 md:px-6 pt-5 md:pt-6 pb-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

