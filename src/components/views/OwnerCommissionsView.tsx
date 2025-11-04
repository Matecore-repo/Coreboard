import React, { useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCommissions } from '../../hooks/useCommissions';
import { useEmployees } from '../../hooks/useEmployees';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { DollarSign, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function OwnerCommissionsView() {
  const { currentOrgId } = useAuth();
  const { commissions, loading, fetchCommissions } = useCommissions({ enabled: true });
  const { employees } = useEmployees(currentOrgId ?? undefined, { enabled: true });
  
  // Refrescar comisiones cuando se monta la vista
  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  // Filtrar comisiones de hoy
  const todayCommissions = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    return commissions.filter(comm => {
      const commDate = new Date(comm.date);
      return commDate >= startOfDay && commDate <= endOfDay;
    });
  }, [commissions]);

  // Filtrar comisiones del mes actual
  const currentMonthCommissions = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    return commissions.filter(comm => {
      const commDate = new Date(comm.date);
      return commDate >= startOfMonth && commDate <= endOfMonth;
    });
  }, [commissions]);

  // Calcular total de hoy
  const totalToday = useMemo(() => {
    return todayCommissions.reduce((sum, comm) => sum + comm.amount, 0);
  }, [todayCommissions]);

  // Calcular total del mes
  const totalMonth = useMemo(() => {
    return currentMonthCommissions.reduce((sum, comm) => sum + comm.amount, 0);
  }, [currentMonthCommissions]);

  // Agrupar por empleado
  const commissionsByEmployee = useMemo(() => {
    const grouped: Record<string, {
      employee: typeof employees[0] | { id: string; full_name: string; email?: string };
      commissions: typeof currentMonthCommissions;
      total: number;
    }> = {};

    currentMonthCommissions.forEach(comm => {
      if (!grouped[comm.employee_id]) {
        const employee = employees.find(emp => emp.id === comm.employee_id);
        if (employee) {
          grouped[comm.employee_id] = {
            employee,
            commissions: [],
            total: 0,
          };
        } else {
          // Si no encontramos el empleado, crear un objeto temporal con el ID
          grouped[comm.employee_id] = {
            employee: {
              id: comm.employee_id,
              full_name: `Empleado ${comm.employee_id.substring(0, 8)}`,
              email: undefined,
            } as any,
            commissions: [],
            total: 0,
          };
        }
      }
      if (grouped[comm.employee_id]) {
        grouped[comm.employee_id].commissions.push(comm);
        grouped[comm.employee_id].total += comm.amount;
      }
    });

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [currentMonthCommissions, employees]);

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

  const currentMonthName = format(new Date(), 'MMMM yyyy', { locale: es });

  return (
    <div className="w-full min-h-screen bg-background animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Comisiones del Mes</h1>
          </div>
        </div>

        {/* Comisiones de Hoy */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Comisiones de Hoy</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Hoy</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalToday.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(), 'dd/MM/yyyy', { locale: es })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cantidad de Comisiones</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayCommissions.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Hoy</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comisiones del Mes */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Comisiones del Mes</h2>
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </div>

        {/* Comisiones por empleado */}
        {commissionsByEmployee.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No hay comisiones registradas para este mes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Comisiones por Empleado</h2>
              {commissionsByEmployee.map(({ employee, commissions: empCommissions, total }) => (
                <Card key={employee.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {employee.full_name || employee.email || `Empleado ${employee.id.substring(0, 8)}`}
                        </CardTitle>
                        <CardDescription>
                          {empCommissions.length} {empCommissions.length === 1 ? 'comisión' : 'comisiones'}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-lg">
                        ${total.toFixed(2)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {empCommissions.map(comm => (
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
                              {format(new Date(comm.date), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Comisiones por día */}
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
                          {dayCommissions.map(comm => {
                            const employee = employees.find(emp => emp.id === comm.employee_id);
                            return (
                              <div
                                key={comm.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex-1">
                                  <p className="font-medium">${comm.amount.toFixed(2)}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {employee?.full_name || employee?.email || `Empleado ${comm.employee_id.substring(0, 8)}`} - {comm.commission_rate}%
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(comm.date), 'HH:mm', { locale: es })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

