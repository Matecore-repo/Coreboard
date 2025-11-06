"use client";

import React from "react";
import { Input } from "./input";
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
  const minDateValue = minDate
    ? `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, "0")}-${String(minDate.getDate()).padStart(2, "0")}`
    : undefined;

  return (
    <Input
      type="date"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      min={minDateValue}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        ariaInvalid && "border-destructive",
        className
      )}
      id={id}
      aria-invalid={ariaInvalid}
    />
  );
}

