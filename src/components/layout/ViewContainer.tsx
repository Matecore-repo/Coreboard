import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "../ui/utils";

interface ViewContainerProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode;
}

export function ViewContainer({ className, children, ...props }: ViewContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("w-full", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

