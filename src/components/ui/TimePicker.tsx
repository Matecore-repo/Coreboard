"use client";

import React from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "./utils";

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
}

export function TimePicker({
  value,
  onChange,
  onBlur,
  placeholder = "HH:MM",
  disabled,
  className,
  id,
  "aria-invalid": ariaInvalid,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hours, setHours] = React.useState(value?.split(":")[0] || "00");
  const [minutes, setMinutes] = React.useState(value?.split(":")[1] || "00");

  // Redondear minutos al intervalo más cercano (0, 15, 30, 45)
  const roundToNearestInterval = (minute: string): string => {
    const min = parseInt(minute, 10);
    const intervals = [0, 15, 30, 45];
    const nearest = intervals.reduce((prev, curr) => 
      Math.abs(curr - min) < Math.abs(prev - min) ? curr : prev
    );
    return nearest.toString().padStart(2, "0");
  };

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      setHours(h || "00");
      const roundedMinutes = m ? roundToNearestInterval(m) : "00";
      setMinutes(roundedMinutes);
    } else {
      setHours("00");
      setMinutes("00");
    }
  }, [value]);

  const updateTime = (newHours: string, newMinutes: string) => {
    setHours(newHours);
    setMinutes(newMinutes);
    const formattedTime = `${newHours.padStart(2, "0")}:${newMinutes.padStart(2, "0")}`;
    onChange(formattedTime);
  };

  const formatDisplayTime = (h: string, m: string) => {
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  };

  const incrementHours = () => {
    const newHour = (parseInt(hours, 10) + 1) % 24;
    updateTime(newHour.toString().padStart(2, "0"), minutes);
  };

  const decrementHours = () => {
    const newHour = (parseInt(hours, 10) - 1 + 24) % 24;
    updateTime(newHour.toString().padStart(2, "0"), minutes);
  };

  const incrementMinutes = () => {
    const intervals = [0, 15, 30, 45];
    const currentMin = parseInt(minutes, 10);
    const currentIndex = intervals.indexOf(currentMin);
    const nextIndex = (currentIndex + 1) % intervals.length;
    updateTime(hours, intervals[nextIndex].toString().padStart(2, "0"));
  };

  const decrementMinutes = () => {
    const intervals = [0, 15, 30, 45];
    const currentMin = parseInt(minutes, 10);
    const currentIndex = intervals.indexOf(currentMin);
    const prevIndex = (currentIndex - 1 + intervals.length) % intervals.length;
    updateTime(hours, intervals[prevIndex].toString().padStart(2, "0"));
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <div className="relative">
        <Input
          type="text"
          value={value ? formatDisplayTime(hours, minutes) : ""}
          onChange={() => {}}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          readOnly
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            ariaInvalid && "border-destructive",
            className
          )}
          id={id}
          aria-invalid={ariaInvalid}
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
              disabled && "cursor-not-allowed opacity-50"
            )}
            disabled={disabled}
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Abrir selector de hora</span>
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-3" align="start" sideOffset={4}>
        <div className="flex items-center gap-4">
          {/* Selector de Hora */}
          <div className="flex flex-col items-center gap-1">
            <label className="text-xs font-medium text-muted-foreground">Hora</label>
            <div className="flex flex-col items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-8"
                onClick={incrementHours}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <div className="min-w-[3rem] text-center font-semibold text-lg py-1">
                {hours}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-8"
                onClick={decrementHours}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Separador */}
          <div className="text-xl font-semibold pt-6">:</div>

          {/* Selector de Minutos */}
          <div className="flex flex-col items-center gap-1">
            <label className="text-xs font-medium text-muted-foreground">Minutos</label>
            <div className="flex flex-col items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-8"
                onClick={incrementMinutes}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <div className="min-w-[3rem] text-center font-semibold text-lg py-1">
                {minutes}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-8"
                onClick={decrementMinutes}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

