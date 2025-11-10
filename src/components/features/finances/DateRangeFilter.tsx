"use client";

import React, { useEffect, useMemo, useState } from "react";
import { endOfMonth, endOfToday, startOfMonth, subDays, subMonths } from "date-fns";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { DateRange as DayPickerRange } from "react-day-picker";

import { Button } from "../../ui/button";
import { Calendar } from "../../ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
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

export function DateRangeFilter({ value, presets, onChange }: DateRangeFilterProps) {
  const [internalRange, setInternalRange] = useState<DayPickerRange | undefined>(toDateRange(value));
  const [activePreset, setActivePreset] = useState<string | null>(null);

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
  };

  return (
    <Card className="border border-border/50 bg-card/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <CardHeader className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Filtrar período</CardTitle>
          <CardDescription>Ajustá el rango temporal para todos los tableros de finanzas.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide">
            <CalendarIcon className="size-3.5 text-primary" />
            <span className="text-foreground/80">{summary}</span>
          </span>
          {value && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 rounded-full px-3 text-muted-foreground transition hover:text-foreground"
              onClick={() => {
                setActivePreset(null);
                setInternalRange(undefined);
                onChange(null);
              }}
            >
              <RefreshCw className="size-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] xl:gap-8">
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rangos sugeridos</span>
            <p className="text-sm text-muted-foreground">
              Elegí un preset para actualizar los tableros con un solo clic.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {presets.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={cn(
                    "group rounded-2xl border px-4 py-3 text-left transition-all",
                    "border-border/60 bg-background/60 hover:-translate-y-[1px] hover:border-border/40 hover:bg-background/80",
                    isActive
                      ? "border-primary/60 bg-primary/10 text-primary shadow-sm"
                      : "text-foreground/90",
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

        <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-background/60 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Selección personalizada
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {internalRange?.from && internalRange?.to
                ? `${internalRange.from.toLocaleDateString("es-AR")} – ${internalRange.to.toLocaleDateString("es-AR")}`
                : "Elegí fechas"}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/30 bg-card/80 p-2">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={internalRange}
              onSelect={(range) => {
                setActivePreset(null);
                setInternalRange(range);
                const normalized = toValue(range);
                if (normalized) {
                  onChange(normalized);
                }
              }}
              defaultMonth={internalRange?.from ?? new Date()}
              className="mx-auto mt-1"
              modifiersClassNames={{
                range_start: "bg-primary text-primary-foreground",
                range_end: "bg-primary text-primary-foreground",
                range_middle: "bg-primary/10 text-primary",
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

