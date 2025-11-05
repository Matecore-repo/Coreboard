"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CustomDatePicker } from "../../ui/DatePicker";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Calendar, X } from "lucide-react";
import { Card, CardContent } from "../../ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";

export interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangeFilterProps {
  value?: DateRange;
  onChange: (range: DateRange | null) => void;
  className?: string;
}

const PRESET_RANGES = [
  { label: "Hoy", days: 0 },
  { label: "Últimos 7 días", days: 7 },
  { label: "Últimos 30 días", days: 30 },
  { label: "Últimos 90 días", days: 90 },
  { label: "Este mes", days: -1 }, // -1 indica mes actual
  { label: "Mes pasado", days: -2 }, // -2 indica mes pasado
];

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState(value?.startDate || "");
  const [endDate, setEndDate] = useState(value?.endDate || "");

  // Sincronizar estado interno cuando cambia el prop value
  useEffect(() => {
    if (value) {
      setStartDate(value.startDate);
      setEndDate(value.endDate);
    } else {
      setStartDate("");
      setEndDate("");
    }
  }, [value]);

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (date && endDate && date <= endDate) {
      onChange({ startDate: date, endDate });
    } else if (date && !endDate) {
      onChange({ startDate: date, endDate: date });
      setEndDate(date);
    }
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    if (startDate && date && startDate <= date) {
      onChange({ startDate, endDate: date });
    } else if (!startDate && date) {
      onChange({ startDate: date, endDate: date });
      setStartDate(date);
    }
  };

  const handlePreset = (days: number) => {
    const today = new Date();
    let start: Date;
    let end: Date = new Date(today);

    if (days === -1) {
      // Este mes
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (days === -2) {
      // Mes pasado
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else {
      // Días específicos
      start = new Date(today);
      start.setDate(today.getDate() - days);
    }

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    setStartDate(startStr);
    setEndDate(endStr);
    onChange({ startDate: startStr, endDate: endStr });
  };

  const handleClear = () => {
    setStartDate("");
    setEndDate("");
    onChange(null);
  };

  const hasValue = value && value.startDate && value.endDate;

  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Fecha Inicio</Label>
              <CustomDatePicker
                id="start-date"
                value={startDate}
                onChange={handleStartDateChange}
                placeholder="Fecha inicio"
                minDate={undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Fecha Fin</Label>
              <CustomDatePicker
                id="end-date"
                value={endDate}
                onChange={handleEndDateChange}
                placeholder="Fecha fin"
                minDate={startDate ? new Date(startDate) : undefined}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Rápidos
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                <div className="space-y-1">
                  {PRESET_RANGES.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handlePreset(preset.days)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {hasValue && (
              <Button variant="outline" size="sm" onClick={handleClear} className="gap-2">
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

