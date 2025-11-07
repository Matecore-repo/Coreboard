import React from "react";
import { Button } from "./ui/button";
import { Command } from "lucide-react";
import { toastInfo } from "../lib/toast";
import { useCommandPalette } from "../contexts/CommandPaletteContext";

interface ShortcutBannerProps {
  icon?: React.ReactNode;
  message: React.ReactNode;
  className?: string;
  onShortcutClick?: () => void;
  buttonLabel?: string;
  buttonIcon?: React.ReactNode;
}

export function ShortcutBanner({
  icon,
  message,
  className,
  onShortcutClick,
  buttonLabel = "Atajos",
  buttonIcon,
}: ShortcutBannerProps) {
  const baseClass = "flex flex-wrap items-center justify-between gap-2 border border-border/50 bg-card/80 p-4 shadow-sm backdrop-blur";
  const mergedClassName = className ? `${baseClass} ${className}` : baseClass;
  const palette = useCommandPalette(true);

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

  return (
    <div className={mergedClassName}>
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-sm text-muted-foreground">{message}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleClick} className="gap-2">
          {buttonIcon ?? <Command className="size-4" aria-hidden="true" />}
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

