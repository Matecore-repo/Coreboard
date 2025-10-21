import React from 'react';
import { Sparkles } from 'lucide-react';

interface DemoDataBubbleProps {
  onSeed: () => void;
}

export default function DemoDataBubble({ onSeed }: DemoDataBubbleProps) {
  return (
    <button
      onClick={onSeed}
      aria-label="Cargar datos de ejemplo"
      className="fixed z-40 h-12 w-12 rounded-full shadow-lg border bg-primary text-primary-foreground backdrop-blur supports-[backdrop-filter]:bg-primary/90 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      style={{ right: '1rem', bottom: '4.5rem' }}
      title={"Cargar datos mock (modo demo)"}
    >
      <Sparkles className="h-5 w-5" />
    </button>
  );
}

