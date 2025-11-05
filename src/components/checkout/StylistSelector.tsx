import { motion } from 'motion/react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { User } from 'lucide-react';
import { cn } from '../ui/utils';

export interface Stylist {
  id: string;
  full_name: string;
  email: string;
}

interface StylistSelectorProps {
  stylists: Stylist[];
  selectedStylistId: string | null;
  onSelect: (stylistId: string | null) => void;
  loading?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function StylistSelector({ stylists, selectedStylistId, onSelect, loading }: StylistSelectorProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Opción "Cualquiera" */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card
            className={cn(
              'cursor-pointer transition-all',
              selectedStylistId === null
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            )}
            onClick={() => onSelect(null)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-muted">
                    <User className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">Cualquiera</h3>
                  <p className="text-sm text-muted-foreground">Se asignará automáticamente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Estilistas */}
        {stylists.map((stylist) => (
          <motion.div
            key={stylist.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={cn(
                'cursor-pointer transition-all',
                selectedStylistId === stylist.id
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:border-primary/50'
              )}
              onClick={() => onSelect(stylist.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(stylist.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{stylist.full_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{stylist.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

