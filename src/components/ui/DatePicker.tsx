"use client";

import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "./utils";

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minDate?: Date;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
}

const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function CustomDatePicker({
  value,
  onChange,
  onBlur,
  placeholder = "Selecciona una fecha",
  minDate,
  disabled,
  className,
  id,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  const date = value ? new Date(value + "T00:00:00") : undefined;

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const formattedDate = formatDateForInput(selectedDate);
      onChange(formattedDate);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <div className="relative">
        <Input
          type="text"
          value={date ? formatDate(date) : ""}
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
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Abrir calendario</span>
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent 
        className="w-auto p-0" 
        align="start" 
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={(date) => {
            if (minDate) {
              const minDateStart = new Date(minDate);
              minDateStart.setHours(0, 0, 0, 0);
              const dateToCheck = new Date(date);
              dateToCheck.setHours(0, 0, 0, 0);
              return dateToCheck < minDateStart;
            }
            return false;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

