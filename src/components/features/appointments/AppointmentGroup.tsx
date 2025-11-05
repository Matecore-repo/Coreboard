"use client";

import { memo } from "react";
import { AppointmentCard, Appointment } from "./AppointmentCard";

interface AppointmentGroupProps {
  title: string;
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  selectedAppointmentId?: string | null;
}

export const AppointmentGroup = memo(function AppointmentGroup({
  title,
  appointments,
  onAppointmentClick,
  selectedAppointmentId,
}: AppointmentGroupProps) {
  if (appointments.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {appointments.length}
        </span>
      </div>
      <div className="space-y-2">
        {appointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            onClick={onAppointmentClick}
            isSelected={selectedAppointmentId === appointment.id}
          />
        ))}
      </div>
    </div>
  );
});

