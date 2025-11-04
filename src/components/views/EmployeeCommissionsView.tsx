import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCommissions } from '../../hooks/useCommissions';
import { useEmployees } from '../../hooks/useEmployees';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EmployeeCommissionsView() {
  const { user, currentOrgId } = useAuth();
  const { commissions, loading } = useCommissions({ enabled: true });
  const { employees } = useEmployees(currentOrgId ?? undefined, { enabled: true });

  // Encontrar el empleado actual por user_id
  const currentEmployee = useMemo(() => {
    if (!user?.id) return null;
    return employees.find(emp => emp.user_id === user.id);
  }, [employees, user?.id]);

  // Filtrar comisiones del empleado actual y del mes actual
  const currentMonthCommissions = useMemo(() => {
    if (!currentEmployee) return [];
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    return commissions.filter(comm => {
      if (comm.employee_id !== currentEmployee.id) return false;
      const commDate = new Date(comm.date);
      return commDate >= startOfMonth && commDate <= endOfMonth;
    });
  }, [commissions, currentEmployee]);

  // Calcular total del mes
  const totalMonth = useMemo(() => {
    return currentMonthCommissions.reduce((sum, comm) => sum + comm.amount, 0);
  }, [currentMonthCommissions]);

  // Agrupar por día
  const commissionsByDay = useMemo(() => {
    const grouped: Record<string, typeof currentMonthCommissions> = {};
    currentMonthCommissions.forEach(comm => {
      const dateKey = format(new Date(comm.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(comm);
    });
    return grouped;
  }, [currentMonthCommissions]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentEmployee) {
    return (
      <div className="w-full min-h-screen bg-background animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No se encontró tu perfil de empleado. Contacta al administrador.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentMonthName = format(new Date(), 'MMMM yyyy', { locale: es });

  return (
    <div className="w-full min-h-screen bg-background animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Mis Comisiones</h1>
          </div>
        </div>

        {/* Resumen del mes */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total del Mes</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMonth.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{currentMonthName}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cantidad de Comisiones</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonthCommissions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Comisión</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${currentMonthCommissions.length > 0 
                  ? (totalMonth / currentMonthCommissions.length).toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Promedio</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de comisiones por día */}
        {currentMonthCommissions.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No hay comisiones registradas para este mes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Comisiones por Día</h2>
            {Object.entries(commissionsByDay)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([dateKey, dayCommissions]) => {
                const dayTotal = dayCommissions.reduce((sum, comm) => sum + comm.amount, 0);
                const date = new Date(dateKey);
                const dayName = format(date, 'EEEE', { locale: es });
                const dayNumber = format(date, 'd');
                const monthName = format(date, 'MMMM', { locale: es });

                return (
                  <Card key={dateKey}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {dayName.charAt(0).toUpperCase() + dayName.slice(1)} {dayNumber} de {monthName}
                          </CardTitle>
                          <CardDescription>
                            {dayCommissions.length} {dayCommissions.length === 1 ? 'comisión' : 'comisiones'}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-lg">
                          ${dayTotal.toFixed(2)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dayCommissions.map(comm => (
                          <div
                            key={comm.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium">${comm.amount.toFixed(2)}</p>
                              <p className="text-sm text-muted-foreground">
                                {comm.commission_rate}% de comisión
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(comm.date), 'HH:mm', { locale: es })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

