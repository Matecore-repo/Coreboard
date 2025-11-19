import React from "react";
import { Button } from "./ui/button";
import { Command } from "lucide-react";
import { toastInfo } from "../lib/toast";
import { useCommandPalette } from "../contexts/CommandPaletteContext";
import { useIsMobile } from "./ui/use-mobile";

interface ShortcutBannerProps {
  icon?: React.ReactNode;
  message: React.ReactNode;
  className?: string;
  onShortcutClick?: () => void;
  buttonLabel?: string;
  buttonIcon?: React.ReactNode;
  mobileMessage?: React.ReactNode;
}

export function ShortcutBanner({
  icon,
  message,
  className,
  onShortcutClick,
  buttonLabel = "Atajos",
  buttonIcon,
  mobileMessage,
}: ShortcutBannerProps) {
  const baseClass = "flex flex-wrap items-center justify-between gap-2 border border-border/50 bg-card/80 p-4 shadow-sm backdrop-blur";
  const mergedClassName = className ? `${baseClass} ${className}` : baseClass;
  const palette = useCommandPalette(true);
  const isMobile = useIsMobile();

  const handleClick = React.useCallback(() => {
    if (onShortcutClick) {
      onShortcutClick();
      return;
    }
    if (palette) {
      palette.openPalette();
      return;
    }
    toastInfo("Atajos disponibles próximamente");
  }, [onShortcutClick, palette]);

  // Mensaje corto para móvil/tablet
  const defaultMobileMessage = (
    <>
      Toca <span className="font-semibold">Atajos</span> para acceder rápidamente.
    </>
  );

  const displayMessage = isMobile ? (mobileMessage ?? defaultMobileMessage) : message;

  return (
    <div className={mergedClassName}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {icon}
        <div className="text-sm text-muted-foreground truncate">{displayMessage}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={handleClick} className="gap-2">
          {buttonIcon ?? <Command className="size-4" aria-hidden="true" />}
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

