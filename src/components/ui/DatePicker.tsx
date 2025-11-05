"use client";

import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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
  const selectedDate = value ? new Date(value) : null;

  const handleDateChange = (date: Date | null) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange("");
    }
  };

  return (
    <div className="relative">
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        onBlur={onBlur}
        minDate={minDate}
        disabled={disabled}
        dateFormat="yyyy-MM-dd"
        placeholderText={placeholder}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          ariaInvalid && "border-destructive",
          className
        )}
        wrapperClassName="w-full"
        id={id}
        aria-invalid={ariaInvalid}
      />
    </div>
  );
}

