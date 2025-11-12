"use client";

import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { DateRange as DayPickerRange } from "react-day-picker";

import { Button } from "../../ui/button";
import { Calendar } from "../../ui/calendar";
import { Dialog, DialogContent, DialogTrigger } from "../../ui/dialog";

export type DateRangeValue = {
  startDate: string;
  endDate: string;
};

export interface DateRangeFilterProps {
  value: DateRangeValue | null;
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

export const DateRangeFilter = forwardRef<HTMLButtonElement, DateRangeFilterProps>(function DateRangeFilter(
  { value, onChange },
  ref,
) {
  const [internalRange, setInternalRange] = useState<DayPickerRange | undefined>(toDateRange(value));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    setInternalRange(toDateRange(value));
  }, [value]);

  const summary = useMemo(() => {
    if (!value) return "Seleccionar fechas";
    const start = new Date(`${value.startDate}T00:00:00`);
    const end = new Date(`${value.endDate}T00:00:00`);
    const rangeDays = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${start.toLocaleDateString("es-AR")} – ${end.toLocaleDateString("es-AR")} · ${rangeDays} día${rangeDays !== 1 ? "s" : ""}`;
  }, [value]);

  const handleClear = () => {
    setIsCalendarOpen(false);
    setInternalRange(undefined);
    onChange(null);
  };

  const handleConfirm = () => {
    const normalized = toValue(internalRange);
    if (!normalized) return;
    onChange(normalized);
    setIsCalendarOpen(false);
  };

  const handleCancel = () => {
    setInternalRange(toDateRange(value));
    setIsCalendarOpen(false);
  };

  return (
    <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
      <DialogTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          className="gap-2"
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="truncate text-sm font-medium">{summary}</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        showClose={false}
        className="w-auto max-w-max border-none bg-transparent p-0 shadow-none"
      >
        <div className="mx-auto w-fit max-w-[560px] rounded-2xl border border-border/40 bg-background p-4 shadow-xl">
          <div className="flex flex-col items-center justify-center">
            <Calendar
              mode="range"
              numberOfMonths={2}
              pagedNavigation
              selected={internalRange}
              defaultMonth={internalRange?.from ?? new Date()}
              onSelect={(range) => {
                setInternalRange(range);
              }}
              modifiersClassNames={{
                range_start: "bg-primary text-primary-foreground",
                range_end: "bg-primary text-primary-foreground",
                range_middle: "bg-primary/10 text-primary",
              }}
            />
          </div>
          <div className="mt-6 flex min-h-16 flex-col gap-4 rounded-xl bg-muted/15 p-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium text-foreground sm:text-sm">
              {internalRange?.from && internalRange?.to
                ? `${internalRange.from.toLocaleDateString("es-AR")} – ${internalRange.to.toLocaleDateString("es-AR")}`
                : "Seleccioná un rango de fechas"}
            </span>
            <div className="flex items-center sm:ml-auto sm:justify-end">
              <div className="flex items-center gap-3">
                {(internalRange?.from || value) && (
                  <Button
                    variant="ghost"
                    size="default"
                    className="h-10 px-4 text-sm text-blue-700 hover:bg-blue-100"
                    onClick={handleClear}
                  >
                    <RefreshCw className="size-4" />
                    Limpiar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="default"
                  className="h-10 px-4 text-sm text-red-700 hover:bg-red-100"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  className="h-10 px-4 text-sm text-black hover:bg-black/10 dark:text-white dark:hover:bg-white/10"
                  onClick={handleConfirm}
                  disabled={!internalRange?.from || !internalRange?.to}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

DateRangeFilter.displayName = "DateRangeFilter";
