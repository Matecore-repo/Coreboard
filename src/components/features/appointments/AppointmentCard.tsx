import { memo } from "react";
import { Calendar, Clock, User, Scissors } from "lucide-react";
import { Badge } from "../../ui/badge";

export interface Appointment {
  id: string;
  clientName: string;
  service: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  stylist: string;
  salonId: string;
}

interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: (appointment: Appointment) => void;
  isSelected?: boolean;
}

export const AppointmentCard = memo(function AppointmentCard({ appointment, onClick, isSelected }: AppointmentCardProps) {
  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    completed: "bg-green-500/10 text-green-700 dark:text-green-400",
    cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <div 
      onClick={() => onClick?.(appointment)}
      className={`bg-card border rounded-2xl p-3 hover:shadow-md transition-all cursor-pointer ${
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{appointment.clientName}</p>
            <p className="text-muted-foreground truncate">{appointment.service}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground truncate">{appointment.stylist}</span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span>{appointment.date}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span>{appointment.time}</span>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={statusColors[appointment.status]}>
            {appointment.status}
          </Badge>
        </div>
      </div>
    </div>
  );
});