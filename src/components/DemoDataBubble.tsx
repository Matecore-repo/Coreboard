import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

interface DemoDataBubbleProps {
  onSeed: () => void;
}

export default function DemoDataBubble({ onSeed }: DemoDataBubbleProps) {
  const [showDialog, setShowDialog] = useState(false);

  const handleSeed = () => {
    onSeed();
    setShowDialog(false);
  };

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        aria-label="Cargar datos de ejemplo"
        className="fixed z-40 h-12 w-12 rounded-full shadow-lg border bg-primary text-primary-foreground backdrop-blur supports-[backdrop-filter]:bg-primary/90 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        style={{ right: '1rem', bottom: '4.5rem' }}
        title={"Cargar datos mock (modo demo)"}
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargar Datos de Demostración</DialogTitle>
            <DialogDescription>
              Esta acción cargará datos de ejemplo para que puedas explorar todas las funcionalidades de la aplicación. 
              Los datos serán mockeados y no se guardarán en la base de datos real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">📋 Se cargarán:</p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>✓ 3 salones de ejemplo</li>
                <li>✓ 12 turnos para esta semana</li>
                <li>✓ 20 clientes de prueba</li>
                <li>✓ Estadísticas de comisiones</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSeed}>
              <Sparkles className="h-4 w-4 mr-2" />
              Cargar Datos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

