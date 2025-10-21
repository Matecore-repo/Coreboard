import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Sparkles } from 'lucide-react';

interface DemoWelcomeModalProps {
  isOpen: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
}

export default function DemoWelcomeModal({ isOpen, onSave, onClose }: DemoWelcomeModalProps) {
  const [name, setName] = useState('');

  return (
    <Dialog open={isOpen} onOpenChange={() => { /* locked until save */ }}>
      <DialogContent className="locked-modal w-[92vw] sm:max-w-[520px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 sm:p-8 shadow-xl border-0">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          <div className="absolute -top-8 -right-10 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />

          <div className="p-7 sm:p-8 relative">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-7 w-7 text-primary" />
              <DialogHeader className="flex-1">
                <DialogTitle className="text-xl sm:text-2xl">Bienvenido al modo demo</DialogTitle>
                <DialogDescription className="text-sm sm:text-base">Personalizá la experiencia. Nada se guarda en el servidor.</DialogDescription>
              </DialogHeader>
            </div>

            <div className="h-px bg-border/70 my-5" />

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Tu nombre</label>
                <Input className="h-11 text-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Martina" />
                <p className="text-xs text-muted-foreground">Lo usamos para saludar y titular tu demo. Podés cambiarlo luego.</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 pt-6">
              <Button onClick={() => { if (name.trim()) onSave(name.trim()); }} className="shadow-sm" disabled={!name.trim()}>
                Empezar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

