import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// Dark carousel — UX Pro v8 (stable)
// • Fix syntax errors & fallback loop
// • Drag con inercia (mouse/touch), sin rueda
// • Snap al centro por offset + lock post‑click
// • Card "Ver todos" primera

const DEMO_SALONS = [
  { id: "ALL", name: "Ver todos los locales", barrio: "", image: "" },
  { id: "s1", name: "LÜX Hair Studio", barrio: "Palermo", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop" },
  { id: "s2", name: "Velvet & Co.", barrio: "Recoleta", image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1600&auto=format&fit=crop" },
  { id: "s3", name: "CUTLAB", barrio: "Belgrano", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1600&auto=format&fit=crop" },
  { id: "s4", name: "AURA Salón", barrio: "Caballito", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1600&auto=format&fit=crop" },
  { id: "s5", name: "NEON Barber", barrio: "Microcentro", image: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?q=80&w=1600&auto=format&fit=crop" },
];

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Placeholder local para evitar loops de red si una imagen falla
const FALLBACK_IMG = `data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='900'>\
  <defs>\
    <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>\
      <stop offset='0%' stop-color='%23262626'/>\
      <stop offset='100%' stop-color='%23141414'/>\
    </linearGradient>\
  </defs>\
  <rect width='100%' height='100%' fill='url(%23g)'/>\
  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff55'\
        font-family='system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif' font-size='42'>imagen no disponible</text>\
</svg>`;

export default function DarkCarouselPro({
  salons = DEMO_SALONS,
  onSelectSalon,
}: {
  salons?: typeof DEMO_SALONS;
  onSelectSalon?: (salon: any) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sidePad, setSidePad] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lockUntil = useRef<number>(0);
  const pos = useRef({ x: 0, scroll: 0, dragging: false });

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max));

  // Medir padding lateral para centrar extremos
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => {
      const firstCard = el.children[0] as HTMLElement | undefined;
      if (!firstCard) return;
      const cardWidth = firstCard.getBoundingClientRect().width;
      const pad = Math.max(0, (el.clientWidth - cardWidth) / 2);
      setSidePad(pad);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Centrar por offset (estable)
  const centerIndex = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[idx] as HTMLElement | undefined;
    if (!child) return;
    const target = child.offsetLeft - (el.clientWidth - child.clientWidth) / 2;
    el.scrollTo({ left: target, behavior: "smooth" });
  };

  const goTo = (idx: number, lockMs = 600) => {
    const last = salons.length - 1;
    const safeIndex = clamp(idx, 0, last);
    setActiveIndex(safeIndex);
    lockUntil.current = performance.now() + lockMs;
    centerIndex(safeIndex);
  };

  const scrollBy = (delta: number) => goTo(activeIndex + delta);

  // Drag manual (mouse/touch) con inercia suave — sin rueda
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let vel = 0, raf: number | null = null;

    const momentum = () => {
      el.scrollLeft += vel;
      vel *= 0.95;
      if (Math.abs(vel) > 0.5) raf = requestAnimationFrame(momentum);
    };

    const start = (x: number) => {
      pos.current = { x, scroll: el.scrollLeft, dragging: true };
      if (raf) cancelAnimationFrame(raf);
    };

    const move = (x: number) => {
      if (!pos.current.dragging) return;
      const dx = x - pos.current.x;
      el.scrollLeft = pos.current.scroll - dx;
      vel = -dx;
    };

    const end = () => {
      pos.current.dragging = false;
      if (Math.abs(vel) > 1) raf = requestAnimationFrame(momentum);
    };

    const onMouseDown = (e: MouseEvent) => start(e.pageX);
    const onMouseMove = (e: MouseEvent) => move(e.pageX);
    const onMouseUp = () => end();
    const onTouchStart = (e: TouchEvent) => start(e.touches[0].pageX);
    const onTouchMove = (e: TouchEvent) => move(e.touches[0].pageX);
    const onTouchEnd = () => end();

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Snap al centro (debounce)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let t: number;
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        if (performance.now() < lockUntil.current) return;
        const mid = el.scrollLeft + el.clientWidth / 2;
        let bestIdx = 0;
        let bestDist = Infinity;
        Array.from(el.children).forEach((c, i) => {
          const child = c as HTMLElement;
          const cx = child.offsetLeft + child.clientWidth / 2;
          const d = Math.abs(cx - mid);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        });
        bestIdx = clamp(bestIdx, 0, salons.length - 1);
        setActiveIndex(bestIdx);
        centerIndex(bestIdx);
      }, 160);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [salons.length]);

  const atStart = activeIndex === 0;
  const atEnd = activeIndex === salons.length - 1;

  useEffect(() => {
    // Ocultar scrollbar a nivel global y del contenedor
    const style = document.createElement("style");
    style.innerHTML = `html, body { overflow-x: hidden; } .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; } .hide-scrollbar::-webkit-scrollbar { display: none; }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white overflow-hidden select-none">
      <div className="relative w-full max-w-6xl overflow-hidden">
        <div
          ref={scrollerRef}
          className="hide-scrollbar flex gap-7 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth pt-16 pb-24 cursor-grab active:cursor-grabbing"
          style={{ paddingLeft: sidePad, paddingRight: sidePad }}
        >
          {salons.map((s, idx) => {
            const active = idx === activeIndex;
            const isAll = s.id === "ALL";
            const initial = isAll ? "∞" : s.name?.trim()?.[0]?.toUpperCase() || "?";
            return (
              <button
                key={s.id}
                onClick={() => {
                  goTo(idx);
                  if (isAll) onSelectSalon?.({ id: "ALL", all: true }); else onSelectSalon?.(s);
                }}
                type="button"
                className={`snap-center flex-none shrink-0 basis-[260px] sm:basis-[300px] md:basis-[340px] lg:basis-[360px] xl:basis-[380px] cursor-pointer rounded-3xl overflow-hidden shadow-2xl ring-1 transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                  active
                    ? "bg-neutral-900/95 ring-white/30 scale-[1.04] shadow-white/10"
                    : "bg-neutral-900/95 ring-white/5 hover:scale-[1.03]"
                }`}
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  {isAll ? (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.12),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,.08),transparent_40%)]" />
                  ) : (
                    <img
                      src={s.image || FALLBACK_IMG}
                      alt={s.name}
                      loading="lazy"
                      className="object-cover w-full h-full opacity-85 transition-opacity duration-300 hover:opacity-100"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (img.src !== FALLBACK_IMG) {
                          img.onerror = null; // evita loops
                          img.src = FALLBACK_IMG;
                        }
                      }}
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950/40 via-transparent to-transparent" />
                  <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 grid place-items-center bg-white text-black shadow-md ring-1 ring-black/10 ${isAll ? "size-9" : "size-8"} rounded-full text-[10px] font-semibold`}>
                    {initial}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                  <h3 className="text-sm sm:text-base font-medium text-white truncate max-w-[90%]">
                    {isAll ? "Ver todos los locales" : s.name}
                  </h3>
                  <p className="text-xs text-neutral-400">{isAll ? "Mostrar todo" : s.barrio}</p>
                  <span className={`mt-2 h-px w-8 rounded bg-white/15 ${active ? "w-10 bg-white/40" : ""}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Barra navegación */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full bg-white/5 backdrop-blur-md px-3 py-1 ring-1 ring-white/10 shadow-lg">
            <button
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              className={`size-7 grid place-items-center rounded-full border transition ${
                atStart ? "bg-white/8 border-white/10 opacity-40" : "bg-white/10 hover:bg-white/20 border-white/15"
              }`}
            >
              <IconChevronLeft />
            </button>
            <div className="flex items-center gap-1 px-0.5">
              {salons.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-1 w-1 rounded-full transition ${i === activeIndex ? "bg-white" : "bg-white/30 hover:bg-white/60"}`}
                />
              ))}
            </div>
            <button
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              className={`size-7 grid place-items-center rounded-full border transition ${
                atEnd ? "bg-white/8 border-white/10 opacity-40" : "bg-white/10 hover:bg-white/20 border-white/15"
              }`}
            >
              <IconChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
