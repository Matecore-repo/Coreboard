import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useCashRegisters } from '../hooks/useCashRegisters';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface DailyCashRegisterModalProps {
  date: string;
  salonId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DailyCashRegisterModal({ date, salonId, isOpen, onClose }: DailyCashRegisterModalProps) {
  const { user, currentOrgId } = useAuth();
  const { openCashRegister, closeCashRegister, getCashRegisterByDate } = useCashRegisters({ enabled: true });
  const [openingAmount, setOpeningAmount] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpening, setIsOpening] = useState(true);

  const handleOpen = async () => {
    if (!openingAmount || parseFloat(openingAmount) < 0) {
      toast.error('Monto de apertura inválido');
      return;
    }

    setLoading(true);
    try {
      await openCashRegister({
        org_id: currentOrgId || '',
        salon_id: salonId,
        date,
        opening_amount: parseFloat(openingAmount),
      });
      toast.success('Caja abierta exitosamente');
      onClose();
    } catch (error) {
      console.error('Error abriendo caja:', error);
      toast.error('Error al abrir la caja');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!actualAmount || parseFloat(actualAmount) < 0) {
      toast.error('Monto real contado inválido');
      return;
    }

    setLoading(true);
    try {
      const register = await getCashRegisterByDate(date, salonId);
      if (!register) {
        toast.error('No hay caja abierta para esta fecha');
        return;
      }

      const closingAmount = register.closing_amount || 0;
      const actual = parseFloat(actualAmount);
      const difference = actual - closingAmount;

      await closeCashRegister(register.id, {
        actual_amount: actual,
        difference,
        notes,
      });
      toast.success('Caja cerrada exitosamente');
      onClose();
    } catch (error) {
      console.error('Error cerrando caja:', error);
      toast.error('Error al cerrar la caja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isOpening ? 'Abrir Caja' : 'Cerrar Caja'}</DialogTitle>
          <DialogDescription>
            {date}
          </DialogDescription>
        </DialogHeader>
        
        {isOpening ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="opening-amount">Monto de Apertura</Label>
              <Input
                id="opening-amount"
                type="number"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button onClick={handleOpen} disabled={loading} className="w-full">
              {loading ? 'Abriendo...' : 'Abrir Caja'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="actual-amount">Monto Real Contado</Label>
              <Input
                id="actual-amount"
                type="number"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones sobre el cierre de caja..."
              />
            </div>
            <Button onClick={handleClose} disabled={loading} className="w-full">
              {loading ? 'Cerrando...' : 'Cerrar Caja'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

