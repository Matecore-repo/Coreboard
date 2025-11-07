import { Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ViewAllSalonCardProps {
  onClick: () => void;
  isSelected: boolean;
  isDimmed?: boolean;
}

export function ViewAllSalonCard({ onClick, isSelected, isDimmed = false }: ViewAllSalonCardProps) {
  const [isDark, setIsDark] = useState(false);
  const [hasVideo, setHasVideo] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  const bgColor = isDark ? 'bg-black/85' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-black';
  const iconColor = isDark ? 'text-white' : 'text-black';
  const borderColor = isSelected 
    ? (isDark ? 'ring-2 ring-white/70' : 'ring-2 ring-black')
    : (isDark ? 'border border-white/30' : 'border border-black/20');

  const overlayGradient = isDark
    ? "bg-gradient-to-b from-black/60 via-black/40 to-black/65"
    : "bg-gradient-to-b from-white/65 via-white/45 to-white/70";

  useEffect(() => {
    if (!hasVideo) return;
    const node = videoRef.current;
    if (!node) return;

    const attemptPlay = async () => {
      try {
        if (node.paused) {
          await node.play();
        }
      } catch {
        setHasVideo(false);
      }
    };

    attemptPlay();
  }, [hasVideo, isVideoReady]);

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
        {hasVideo && (
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              isVideoReady ? "opacity-90" : "opacity-55"
            }`}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=960&q=60"
            onLoadedData={() => setIsVideoReady(true)}
            onError={() => setHasVideo(false)}
          >
            <source src="https://cdn.coverr.co/videos/coverr-stylist-at-work-1744/1080p.mp4" type="video/mp4" />
          </video>
        )}
        <div className={`absolute inset-0 ${overlayGradient}`} />

        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-transform duration-300 ${
            isSelected ? "scale-110" : "group-hover:scale-110"
          } ${isDark ? 'bg-white/10 border border-white/30 backdrop-blur-sm' : 'bg-black/5 border border-black/20'}`}>
            <Globe2 className={`w-8 h-8 ${iconColor} stroke-[2.5]`} />
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

