import React from 'react';
import { AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import type { FinancialAlert } from '../hooks/useFinancialAlerts';

interface FinancialAlertsPanelProps {
  alerts: FinancialAlert[];
  onDismiss?: (alertId: string) => void;
}

export function FinancialAlertsPanel({ alerts, onDismiss }: FinancialAlertsPanelProps) {
  if (alerts.length === 0) {
    return null;
  }

  const getSeverityIcon = (severity: FinancialAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getSeverityBadge = (severity: FinancialAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Crítica</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Advertencia</Badge>;
      case 'info':
        return <Badge variant="outline">Info</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Alertas Financieras
        </CardTitle>
        <CardDescription>
          {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} activa{alerts.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-3 border rounded-lg bg-muted/20"
            >
              <div className="mt-0.5">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{alert.title}</h4>
                  {getSeverityBadge(alert.severity)}
                </div>
                <p className="text-sm text-muted-foreground mb-1">{alert.message}</p>
                {alert.suggestedAction && (
                  <p className="text-xs text-muted-foreground italic">
                    💡 {alert.suggestedAction}
                  </p>
                )}
              </div>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(alert.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

