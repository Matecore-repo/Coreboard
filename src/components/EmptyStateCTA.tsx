import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Plus, Users, Calendar, DollarSign, Building2, Sparkles } from 'lucide-react';

interface EmptyStateCTAProps {
  type: 'appointments' | 'clients' | 'salons' | 'services' | 'employees';
  onAction: () => void;
  orgName?: string;
}

export const EmptyStateCTA: React.FC<EmptyStateCTAProps> = ({ type, onAction, orgName }) => {
  const configs = {
    appointments: {
      icon: Calendar,
      title: '¡Agregá tu primer turno!',
      description: `Empezá a gestionar los turnos de ${orgName || 'tu peluquería'}. Podés crear turnos, asignar estilistas y hacer seguimiento de cada cita.`,
      buttonText: 'Crear primer turno',
      buttonIcon: Plus,
    },
    clients: {
      icon: Users,
      title: '¡Construí tu base de clientes!',
      description: `Registrá a tus clientes para hacer un seguimiento personalizado y mantener un historial completo de servicios.`,
      buttonText: 'Agregar cliente',
      buttonIcon: Plus,
    },
    salons: {
      icon: Building2,
      title: '¡Expandí tu negocio!',
      description: `Agregá más sucursales para crecer tu red de peluquerías y gestionar múltiples ubicaciones desde un solo lugar.`,
      buttonText: 'Agregar sucursal',
      buttonIcon: Plus,
    },
    services: {
      icon: Sparkles,
      title: '¡Configurá tus servicios!',
      description: `Definí los servicios que ofrecés, sus precios y duración para optimizar la gestión de turnos.`,
      buttonText: 'Crear servicio',
      buttonIcon: Plus,
    },
    employees: {
      icon: Users,
      title: '¡Armá tu equipo!',
      description: `Invita a tus empleados para que puedan gestionar sus propios turnos y comisiones.`,
      buttonText: 'Invitar empleado',
      buttonIcon: Plus,
    },
  };

  const config = configs[type];
  const Icon = config.icon;
  const ButtonIcon = config.buttonIcon;

  return (
    <Card className="border-dashed border-2 border-muted-foreground/25">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle className="text-xl">{config.title}</CardTitle>
        <CardDescription className="text-base max-w-md mx-auto">
          {config.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={onAction} className="w-full sm:w-auto">
          <ButtonIcon className="h-4 w-4 mr-2" />
          {config.buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};
