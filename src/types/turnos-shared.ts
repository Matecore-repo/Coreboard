import type { Appointment } from "../components/features/appointments/AppointmentCard";

export type TurnosSharedProps = {
  appointments: Appointment[];
  salonAppointments: Appointment[];
  isLoading: boolean;
  error?: string;
};


