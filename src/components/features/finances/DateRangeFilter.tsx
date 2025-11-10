"use client";

import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { endOfMonth, endOfToday, startOfMonth, subDays, subMonths } from "date-fns";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { DateRange as DayPickerRange } from "react-day-picker";

import { Button } from "../../ui/button";
import { Calendar } from "../../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { cn } from "../../ui/utils";

export type DateRangeValue = {
  startDate: string;
  endDate: string;
};

export interface DatePreset {
  id: string;
  label: string;
  description?: string;
  calculate: () => DateRangeValue;
}

export interface DateRangeFilterProps {
  value: DateRangeValue | null;
  presets: DatePreset[];
  onChange: (next: DateRangeValue | null, meta?: { presetId?: string | null }) => void;
}

const toDateRange = (value: DateRangeValue | null): DayPickerRange | undefined => {
  if (!value) return undefined;
  const start = new Date(`${value.startDate}T00:00:00`);
  const end = new Date(`${value.endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
  return { from: start, to: end };
};

const toValue = (range: DayPickerRange | undefined): DateRangeValue | null => {
  if (!range?.from || !range?.to) return null;
  return {
    startDate: range.from.toISOString().split("T")[0],
    endDate: range.to.toISOString().split("T")[0],
  };
};

export function buildDefaultPresets(): DatePreset[] {
  return [
    {
      id: "today",
      label: "Hoy",
      description: "Movimientos del día",
      calculate: () => {
        const today = endOfToday();
        return {
          startDate: today.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        };
      },
    },
    {
      id: "last-7",
      label: "Últimos 7 días",
      description: "Tendencia semanal",
      calculate: () => {
        const end = endOfToday();
        const start = subDays(end, 6);
        return {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        };
      },
    },
    {
      id: "last-30",
      label: "Últimos 30 días",
      description: "Performance mensual",
      calculate: () => {
        const end = endOfToday();
        const start = subDays(end, 29);
        return {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        };
      },
    },
    {
      id: "this-month",
      label: "Mes en curso",
      description: "Detalle del mes actual",
      calculate: () => {
        const now = new Date();
        return {
          startDate: startOfMonth(now).toISOString().split("T")[0],
          endDate: endOfMonth(now).toISOString().split("T")[0],
        };
      },
    },
    {
      id: "previous-month",
      label: "Mes anterior",
      description: "Comparativo inmediato",
      calculate: () => {
        const now = new Date();
        const previous = subMonths(now, 1);
        return {
          startDate: startOfMonth(previous).toISOString().split("T")[0],
          endDate: endOfMonth(previous).toISOString().split("T")[0],
        };
      },
    },
  ];
}

export const DateRangeFilter = forwardRef<HTMLButtonElement, DateRangeFilterProps>(function DateRangeFilter(
  { value, presets, onChange },
  ref,
) {
  const [internalRange, setInternalRange] = useState<DayPickerRange | undefined>(toDateRange(value));
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    setInternalRange(toDateRange(value));
  }, [value]);

  useEffect(() => {
    if (!value) {
      setActivePreset(null);
      return;
    }
    const matchingPreset = presets.find((preset) => {
      const candidate = preset.calculate();
      return candidate.startDate === value.startDate && candidate.endDate === value.endDate;
    });
    setActivePreset(matchingPreset?.id ?? null);
  }, [value, presets]);

  const summary = useMemo(() => {
    if (!value) return "Sin filtro aplicado";
    const start = new Date(`${value.startDate}T00:00:00`);
    const end = new Date(`${value.endDate}T00:00:00`);
    const rangeDays = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${start.toLocaleDateString("es-AR")} – ${end.toLocaleDateString("es-AR")} · ${rangeDays} día${rangeDays !== 1 ? "s" : ""}`;
  }, [value]);

  const handlePreset = (preset: DatePreset) => {
    const next = preset.calculate();
    setInternalRange(toDateRange(next));
    setActivePreset(preset.id);
    onChange(next, { presetId: preset.id });
    setIsCalendarOpen(false);
  };

  const handleClear = () => {
    setIsCalendarOpen(false);
    setActivePreset(null);
    setInternalRange(undefined);
    onChange(null);
  };

  return (
    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          className="gap-2"
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="truncate text-sm font-medium">{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] sm:w-[420px] border-border/40 p-0" align="end">
        <div className="flex flex-col gap-4 p-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rangos sugeridos
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              {presets.map((preset) => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors",
                      "border-border/50 bg-background/60 hover:border-border/30 hover:bg-background/80",
                      isActive && "border-primary/50 bg-primary/10 text-primary shadow-sm",
                    )}
                  >
                    <span className="block text-sm font-semibold">{preset.label}</span>
                    {preset.description && (
                      <span className="mt-1 block text-xs text-muted-foreground">{preset.description}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/80 p-2 shadow-sm">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={internalRange}
              defaultMonth={internalRange?.from ?? new Date()}
              onSelect={(range) => {
                setActivePreset(null);
                setInternalRange(range);
                const normalized = toValue(range);
                if (normalized) {
                  onChange(normalized);
                  setIsCalendarOpen(false);
                }
              }}
              modifiersClassNames={{
                range_start: "bg-primary text-primary-foreground",
                range_end: "bg-primary text-primary-foreground",
                range_middle: "bg-primary/10 text-primary",
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">
              {internalRange?.from && internalRange?.to
                ? `${internalRange.from.toLocaleDateString("es-AR")} – ${internalRange.to.toLocaleDateString("es-AR")}`
                : "Seleccioná un rango de fechas"}
            </span>
            {(internalRange?.from || value) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleClear}
              >
                <RefreshCw className="size-3.5" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

DateRangeFilter.displayName = "DateRangeFilter";

