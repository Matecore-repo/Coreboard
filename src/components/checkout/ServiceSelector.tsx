import { motion } from 'motion/react';
import { Card, CardContent } from '../ui/card';
import { Clock, DollarSign } from 'lucide-react';
import { cn } from '../ui/utils';

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface ServiceSelectorProps {
  services: Service[];
  selectedServiceId: string | null;
  onSelect: (serviceId: string) => void;
  loading?: boolean;
}

export function ServiceSelector({ services, selectedServiceId, onSelect, loading }: ServiceSelectorProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded mb-4"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay servicios disponibles</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {services.map((service) => (
        <motion.div
          key={service.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card
            className={cn(
              'cursor-pointer transition-all',
              selectedServiceId === service.id
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            )}
            onClick={() => onSelect(service.id)}
          >
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-3">{service.name}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{service.duration_minutes} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium text-foreground">
                    ${service.price.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

