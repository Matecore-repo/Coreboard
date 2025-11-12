"use client";
import { useEffect } from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  Toaster as Sonner,
  toast,
  type ToastT,
  type ToasterProps,
} from "sonner";

const Toaster = ({
  position = "top-center",
  toastOptions,
  className,
  id,
  ...props
}: ToasterProps) => {
  const { theme = "system" } = useTheme();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) return;

      const toastElement = event.target.closest<HTMLElement>("[data-sonner-toast]");
      if (!toastElement) return;

      const toasterElement = toastElement.closest<HTMLElement>("[data-sonner-toaster]");
      if (!toasterElement || !toasterElement.classList.contains("toaster")) return;

      const indexAttr = toastElement.dataset.index;
      if (indexAttr === undefined) return;

      const index = Number(indexAttr);
      if (Number.isNaN(index)) return;

      const y = toastElement.getAttribute("data-y-position");
      const x = toastElement.getAttribute("data-x-position");
      if (!y || !x) return;

      const toastPosition = `${y}-${x}`;

      const activeToasts = toast
        .getToasts()
        .filter((item): item is ToastT => !("dismiss" in item && item.dismiss));

      const relevantToasts = activeToasts
        .filter((item) => {
          const matchesToaster = id ? item.toasterId === id : !item.toasterId;
          if (!matchesToaster) return false;

          const itemPosition = item.position ?? position;
          return itemPosition === toastPosition;
        })
        .reverse();

      const targetToast = relevantToasts[index];
      if (!targetToast) return;

      toast.dismiss(targetToast.id);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [id, position]);

  const mergedToastOptions: ToasterProps["toastOptions"] = {
    ...toastOptions,
    className: ["toast cursor-pointer", toastOptions?.className]
      .filter(Boolean)
      .join(" "),
  };

  const mergedClassName = ["toaster", "group", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Sonner
      id={id}
      theme={theme as ToasterProps["theme"]}
      position={position}
      className={mergedClassName}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={mergedToastOptions}
      {...props}
    />
  );
};

export { Toaster };

