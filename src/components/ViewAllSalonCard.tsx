import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface ViewAllSalonCardProps {
  onClick: () => void;
  isSelected: boolean;
  isDimmed?: boolean;
}

export function ViewAllSalonCard({ onClick, isSelected, isDimmed = false }: ViewAllSalonCardProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkTheme();
    
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent<'light' | 'dark'>).detail;
        setIsDark(detail === 'dark');
      } catch {
        checkTheme();
      }
    };
    
    window.addEventListener('theme:changed', handler as EventListener);
    return () => window.removeEventListener('theme:changed', handler as EventListener);
  }, []);

  // Light mode: fondo negro, todo blanco
  // Dark mode: fondo blanco, todo negro
  const bgColor = isDark ? 'bg-white' : 'bg-black';
  const textColor = isDark ? 'text-black' : 'text-white';
  const iconColor = isDark ? 'text-black' : 'text-white';
  const borderColor = isSelected 
    ? (isDark ? 'ring-2 ring-black' : 'ring-2 ring-white')
    : (isDark ? 'border border-black/20' : 'border border-white/20');

  return (
    <div className="px-0.5 py-1 h-full">
      <div
        onClick={onClick}
        className={`group relative rounded-2xl overflow-hidden cursor-pointer h-44 flex flex-col items-center justify-center transition-all duration-300 ease-out ${bgColor} ${borderColor} ${
          isSelected 
            ? "shadow-xl scale-[1.02]" 
            : isDimmed 
            ? "opacity-50 scale-[0.98]" 
            : "hover:shadow-lg hover:scale-[1.01]"
        }`}
      >
        {/* Círculo con + */}
        <div className={`w-16 h-16 rounded-full border-2 ${isDark ? 'border-black' : 'border-white'} flex items-center justify-center mb-3 transition-transform duration-300 ${
          isSelected ? "scale-110" : "group-hover:scale-110"
        }`}>
          <Plus className={`w-8 h-8 ${iconColor} stroke-[2.5]`} />
        </div>
        
        {/* Texto "Ver todo" */}
        <span className={`text-sm font-medium ${textColor} transition-all duration-300 ${
          isSelected ? "text-base" : "text-sm group-hover:text-base"
        }`}>
          Ver todo
        </span>
      </div>
    </div>
  );
}

