import { Search } from "lucide-react";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  stylistFilter: string;
  onStylistFilterChange: (value: string) => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
  stylistFilter,
  onStylistFilterChange,
}: FilterBarProps) {
  return (
    <div className="pb-4 border-b border-border" role="search" aria-label="Filtros de búsqueda de turnos">
      <div className="flex gap-2 md:gap-3 flex-wrap" role="group" aria-label="Controles de filtrado">
        <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Buscar turnos..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9 rounded-full"
            aria-label="Buscar turnos"
            data-field="search"
          />
        </div>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger 
            className="w-full sm:w-[140px] md:w-[160px] h-9 rounded-full"
            aria-label="Filtrar por estado"
            data-field="status-filter"
          >
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" aria-label="Estado: Todos">Todos los estados</SelectItem>
            <SelectItem value="pending" aria-label="Estado: Pendiente">Pendiente</SelectItem>
            <SelectItem value="confirmed" aria-label="Estado: Confirmado">Confirmado</SelectItem>
            <SelectItem value="completed" aria-label="Estado: Completado">Completado</SelectItem>
            <SelectItem value="cancelled" aria-label="Estado: Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={onDateFilterChange}>
          <SelectTrigger 
            className="w-full sm:w-[140px] md:w-[160px] h-9 rounded-full"
            aria-label="Filtrar por fecha"
            data-field="date-filter"
          >
            <SelectValue placeholder="Fecha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" aria-label="Fecha: Todas">Todas las fechas</SelectItem>
            <SelectItem value="today" aria-label="Fecha: Hoy">Hoy</SelectItem>
            <SelectItem value="tomorrow" aria-label="Fecha: Mañana">Mañana</SelectItem>
            <SelectItem value="week" aria-label="Fecha: Esta semana">Esta semana</SelectItem>
            <SelectItem value="month" aria-label="Fecha: Este mes">Este mes</SelectItem>
          </SelectContent>
        </Select>

        <Select value={stylistFilter} onValueChange={onStylistFilterChange}>
          <SelectTrigger 
            className="w-full sm:w-[140px] md:w-[160px] h-9 rounded-full"
            aria-label="Filtrar por estilista"
            data-field="stylist-filter"
          >
            <SelectValue placeholder="Estilista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" aria-label="Estilista: Todos">Todos los estilistas</SelectItem>
            <SelectItem value="María García" aria-label="Estilista: María García">María García</SelectItem>
            <SelectItem value="Carlos López" aria-label="Estilista: Carlos López">Carlos López</SelectItem>
            <SelectItem value="Ana Martínez" aria-label="Estilista: Ana Martínez">Ana Martínez</SelectItem>
            <SelectItem value="Roberto Silva" aria-label="Estilista: Roberto Silva">Roberto Silva</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
