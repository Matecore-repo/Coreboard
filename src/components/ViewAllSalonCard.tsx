import React, { useEffect, useState } from "react";
import { Globe2, Layers, Map, Sparkles } from "lucide-react";
import NextImage from "next/image";
import { motion, AnimatePresence } from "motion/react";

interface ViewAllSalonCardProps {
  onClick: () => void;
  isSelected: boolean;
  isDimmed?: boolean;
}

export function ViewAllSalonCard({ onClick, isSelected, isDimmed = false }: ViewAllSalonCardProps) {
  const [isDark, setIsDark] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDES.length);
    }, 8000);

    return () => clearInterval(timer);
  }, []);

  const activeSlide = SLIDES[slideIndex];

  const bgColor = isDark ? 'bg-black/85' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-black';
  const iconColor = isDark ? 'text-white' : 'text-black';
  const borderColor = isSelected 
    ? (isDark ? 'ring-2 ring-white/70' : 'ring-2 ring-black')
    : (isDark ? 'border border-white/30' : 'border border-black/20');

  const overlayGradient = isDark
    ? "bg-gradient-to-b from-black/60 via-black/40 to-black/70"
    : "bg-gradient-to-b from-white/80 via-white/60 to-white/85";

  return (
    <div className="px-0.5 py-1 h-full lg:ml-3">
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
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.image}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <NextImage
              src={activeSlide.image}
              alt="Todos los locales"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 18vw, 60vw"
            />
          </motion.div>
        </AnimatePresence>
        <div className={`absolute inset-0 ${overlayGradient}`} />

        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-transform duration-300 ${
            isSelected ? "scale-110" : "group-hover:scale-110"
          } ${isDark ? 'bg-white/10 border border-white/30 backdrop-blur-sm' : 'bg-black/5 border border-black/20'}`}>
            {React.createElement(activeSlide.icon, { className: `w-8 h-8 ${iconColor} stroke-[2.5]`, 'aria-hidden': true })}
          </div>
          <span className={`text-sm font-medium ${textColor} transition-all duration-300 ${
            isSelected ? "text-base" : "text-sm group-hover:text-base"
          }`}>
            Ver todo
          </span>
        </div>
      </div>
    </div>
  );
}

const SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=70",
    icon: Globe2,
  },
  {
    image: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?auto=format&fit=crop&w=1200&q=70",
    icon: Map,
  },
  {
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70",
    icon: Layers,
  },
  {
    image: "https://images.unsplash.com/photo-1520880867055-1e30d1cb001c?auto=format&fit=crop&w=1200&q=70",
    icon: Sparkles,
  },
] as const;

