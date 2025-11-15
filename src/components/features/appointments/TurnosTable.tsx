"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Badge, badgeVariants } from "../../ui/badge";
import { ScrollArea } from "../../ui/scroll-area";
import { cn } from "../../ui/utils";
import type { Appointment } from "./AppointmentCard";
import { useEmployees } from "../../../hooks/useEmployees";
import { useAuth } from "../../../contexts/AuthContext";
import { isValidUUID } from "../../../lib/uuid";

export type TurnosTableProps = {
  appointments: Appointment[];
  isLoading?: boolean;
  error?: string;
  onRowClick?: (appointment: Appointment) => void;
  selectedAppointmentId?: string | null;
  emptyLabel?: string;
};

const statusLabelMap: Record<Appointment["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

const statusVariantMap: Record<
  Appointment["status"],
  NonNullable<Parameters<typeof badgeVariants>[0]>["variant"]
> = {
  pending: "outline",
  confirmed: "secondary",
  completed: "default",
  cancelled: "destructive",
};

export function TurnosTable({
  appointments,
  isLoading = false,
  error,
  onRowClick,
  selectedAppointmentId,
  emptyLabel = "No hay turnos disponibles",
}: TurnosTableProps) {
  const { currentOrgId } = useAuth();
  const { employees } = useEmployees(currentOrgId ?? undefined, { enabled: !!currentOrgId });

  const rows = useMemo(() => {
    return appointments.map((appointment) => {
      // Resolver nombre del estilista si es un UUID
      let stylistLabel = appointment.stylist || "Sin asignar";
      if (stylistLabel && stylistLabel !== "Sin asignar" && isValidUUID(stylistLabel)) {
        const employee = employees.find((e) => e.id === stylistLabel);
        stylistLabel = employee?.full_name || stylistLabel;
      }

      return {
        ...appointment,
        serviceLabel: appointment.serviceName || appointment.service || "—",
        stylistLabel,
        statusLabel: statusLabelMap[appointment.status] ?? appointment.status,
        statusVariant: statusVariantMap[appointment.status] ?? "outline",
      };
    });
  }, [appointments, employees]);

  const bodyContent = (() => {
    if (isLoading) {
      return Array.from({ length: 6 }).map((_, index) => (
        <TableRow
          key={`loading-${index}`}
          className="border-b border-border/60 last:border-b-0 transition-none hover:bg-transparent"
        >
          <TableCell colSpan={6}>
            <div className="h-9 w-full animate-pulse rounded-xl bg-gradient-to-r from-muted/10 via-muted/30 to-muted/10 dark:from-muted/20 dark:via-muted/40 dark:to-muted/20" />
          </TableCell>
        </TableRow>
      ));
    }

    if (error) {
      return (
        <TableRow className="border-b border-border/60 last:border-b-0 hover:bg-transparent">
          <TableCell colSpan={6}>
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (rows.length === 0) {
      return (
        <TableRow className="border-b border-border/60 last:border-b-0 hover:bg-transparent">
          <TableCell colSpan={6}>
            <div className="flex min-h-[320px] items-center justify-center rounded-xl bg-card/20 px-6 py-12 text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((row) => {
      const isSelected = selectedAppointmentId === row.id;
      return (
        <TableRow
          key={row.id}
          data-state={isSelected ? "selected" : undefined}
          className={cn(
            "cursor-pointer border-b border-border/60 last:border-b-0 transition-colors",
            isSelected
              ? "bg-primary/5"
              : "hover:bg-muted/50 dark:hover:bg-muted/25",
          )}
          onClick={() => {
            if (
              !row?.id ||
              !row?.clientName?.trim() ||
              !row?.salonId ||
              !row?.date ||
              !row?.time
            ) {
              return;
            }
            onRowClick?.(row);
          }}
        >
          <TableCell className="font-medium">{row.clientName}</TableCell>
          <TableCell>{row.serviceLabel}</TableCell>
          <TableCell>{row.date}</TableCell>
          <TableCell>{row.time}</TableCell>
          <TableCell>{row.stylistLabel || "Sin asignar"}</TableCell>
          <TableCell className="text-right">
            <Badge variant={row.statusVariant}>{row.statusLabel}</Badge>
          </TableCell>
        </TableRow>
      );
    });
  })();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card/40 shadow-sm">
      <ScrollArea
        type="always"
        className="max-h-[420px] min-h-[320px] rounded-2xl"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/60 hover:bg-transparent">
              <TableHead className="font-semibold">Cliente</TableHead>
              <TableHead className="font-semibold">Servicio</TableHead>
              <TableHead className="font-semibold">Fecha</TableHead>
              <TableHead className="font-semibold">Hora</TableHead>
              <TableHead className="font-semibold">Estilista</TableHead>
              <TableHead className="text-right font-semibold">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{bodyContent}</TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}


