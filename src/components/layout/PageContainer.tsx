import * as React from "react";
import { cn } from "../ui/utils";

interface PageContainerProps extends React.ComponentProps<"div"> {
  children: React.ReactNode;
}

export function PageContainer({ className, children, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        "max-w-screen-2xl mx-auto px-[20px] pt-[20px] pb-[20px]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

