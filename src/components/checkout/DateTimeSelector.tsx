import { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar } from '../ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Clock } from 'lucide-react';
import { cn } from '../ui/utils';

export interface TimeSlot {
  time: string;
  available: boolean;
}

interface DateTimeSelectorProps {
  selectedDate: Date | null;
  selectedTime: string | null;
  timeSlots: TimeSlot[];
  onDateSelect: (date: Date | null) => void;
  onTimeSelect: (time: string | null) => void;
  loading?: boolean;
}

export function DateTimeSelector({
  selectedDate,
  selectedTime,
  timeSlots,
  onDateSelect,
  onTimeSelect,
  loading,
}: DateTimeSelectorProps) {
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const disabledDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const availableSlots = timeSlots.filter(slot => slot.available);
  const unavailableSlots = timeSlots.filter(slot => !slot.available);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Selecciona una fecha</h3>
        <Card>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={(date) => onDateSelect(date || null)}
              disabled={disabledDates}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
            />
          </CardContent>
        </Card>
      </div>

      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Selecciona un horario
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </h3>
            
            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Button key={i} variant="outline" disabled className="animate-pulse">
                    <div className="h-8 w-16 bg-muted"></div>
                  </Button>
                ))}
              </div>
            ) : availableSlots.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No hay horarios disponibles para esta fecha
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Por favor selecciona otra fecha
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? 'default' : 'outline'}
                      disabled={!slot.available}
                      onClick={() => slot.available && onTimeSelect(slot.time)}
                      className={cn(
                        'h-10',
                        !slot.available && 'opacity-50 cursor-not-allowed',
                        selectedTime === slot.time && 'ring-2 ring-primary'
                      )}
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
                
                {unavailableSlots.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Los horarios marcados están ocupados
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

