import React, { useState, useEffect } from "react";
import { Lock, Mail, CalendarCheck, BellRing, BarChart3 } from "lucide-react";
import { Button } from "../ui/button";
import { toastSuccess, toastError } from "../../lib/toast";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import NextImage from "next/image";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/router";
import { getStoredTheme } from "../../lib/theme";

const heroSlides = [
  {
    id: "overview",
    headline: "Organizá todos tus turnos en minutos",
    body: "Unificá agendas de múltiples sedes, asigná recursos y mantené la disponibilidad sincronizada en tiempo real.",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=70",
    icon: <CalendarCheck className="h-6 w-6" aria-hidden="true" />,
  },
  {
    id: "automation",
    headline: "Automatizá recordatorios efectivos",
    body: "Disminuí ausencias con mensajes inteligentes y recordatorios personalizados para cada cliente.",
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=70",
    icon: <BellRing className="h-6 w-6" aria-hidden="true" />,
  },
  {
    id: "metrics",
    headline: "Mirá indicadores accionables",
    body: "Seguimiento diario de ocupación, ingresos y eficiencia para decidir con datos, sin adivinar.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=70",
    icon: <BarChart3 className="h-6 w-6" aria-hidden="true" />,
  },
] as const;

function LoginView() {
  const { signIn, signUp, resetPassword, signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    const stored = getStoredTheme();
    return stored ?? "light";
  });
 
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateFromDocument = () => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    };

    updateFromDocument();

    const handleThemeEvent = (event: Event) => {
      try {
        const detail = (event as CustomEvent<"light" | "dark">).detail;
        if (detail === "light" || detail === "dark") {
          setTheme(detail);
          return;
        }
      } catch {}
      updateFromDocument();
    };

    window.addEventListener("theme:changed", handleThemeEvent as EventListener);
    window.addEventListener("storage", updateFromDocument);

    return () => {
      window.removeEventListener("theme:changed", handleThemeEvent as EventListener);
      window.removeEventListener("storage", updateFromDocument);
    };
  }, []);

  const isDarkTheme = theme === "dark";
  const gradientOverlayClass = isDarkTheme
    ? "bg-gradient-to-t from-black/90 via-black/65 to-transparent lg:bg-gradient-to-br lg:from-black/70 lg:via-black/45 lg:to-transparent"
    : "bg-gradient-to-t from-white/90 via-white/65 to-transparent lg:bg-gradient-to-br lg:from-white/70 lg:via-white/45 lg:to-transparent";


  // Si el usuario ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (user && !isLoggingIn) {
      setIsLoggingIn(false);
      router.push('/dashboard');
    }
  }, [user, router, isLoggingIn]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 9000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      if (!email || !password) {
        toastError("Ingresa email y contraseña");
        return;
      }
      try {
        setIsLoggingIn(true);
        await signIn(email, password);
        // No redirigir aquí porque handleSignedIn en AuthContext ya lo hace
        setIsLoggingIn(false);
      } catch (error: any) {
        setIsLoggingIn(false);
        toastError(error.message || "Error al iniciar sesión");
      }
      return;
    }

    if (mode === "register") {
      if (!email || !password || !confirmPassword) {
        toastError("Completa todos los campos");
        return;
      }
      if (password !== confirmPassword) {
        toastError("Las contraseñas no coinciden");
        return;
      }
      if (password.length < 6) {
        toastError("La contraseña debe tener al menos 6 caracteres");
        return;
      }
      try {
        setIsLoggingIn(true);
        await signUp(email, password);
        toastSuccess("¡Cuenta creada! Revisa tu email para verificar tu cuenta.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setIsLoggingIn(false);
      } catch (error: any) {
        setIsLoggingIn(false);
        toastError(error.message || "Error al registrarse");
      }
      return;
    }

    if (!email) {
      toastError("Ingresa tu email");
      return;
    }
    try {
      await resetPassword(email);
      toastSuccess("Te enviamos un email para recuperar tu contraseña");
      setMode("login");
    } catch (error: any) {
      toastError(error.message || "Error enviando recuperación");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await signInWithGoogle();
      // No redirigir aquí porque el OAuth redirige automáticamente a Google y luego al callback
    } catch (error: any) {
      setIsLoggingIn(false);
      toastError(error.message || "Error al iniciar sesión con Google");
    }
  };

  const actionButtonClass = (forMode: "login" | "register" | "reset") =>
    `hover:underline transition-colors ${mode === forMode ? "text-foreground font-medium" : "text-muted-foreground"}`;

  const currentSlide = heroSlides[activeSlide];

  const renderMedia = (isDesktop: boolean) => {
    const baseClass = "relative overflow-hidden bg-muted";
    const desktopClass = "hidden lg:block lg:w-1/2 min-h-[60vh] lg:h-screen";
    const mobileClass = "lg:hidden w-full h-[45vh] sm:h-[50vh]";
    const overlayPadding = isDesktop ? "p-12 lg:p-16 xl:p-20" : "p-6";

    return (
      <div className={`${baseClass} ${isDesktop ? desktopClass : mobileClass}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            className="absolute inset-0"
            initial={{ opacity: 0.2 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <NextImage
              src={currentSlide.image}
              alt="Vista CRM"
              fill
              className="object-cover"
              sizes={isDesktop ? "50vw" : "100vw"}
              priority={isDesktop}
            />
          </motion.div>
        </AnimatePresence>
        <div className={`pointer-events-none absolute inset-0 ${gradientOverlayClass}`} />

        {isDesktop && (
          <div className={`absolute inset-0 flex flex-col justify-end ${overlayPadding}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`copy-${currentSlide.id}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="relative z-10 max-w-2xl"
              >
                <div className="mt-auto rounded-3xl bg-black/70 px-10 py-9 sm:px-11 sm:py-10 shadow-[0_18px_55px_rgba(0,0,0,0.55)] text-white space-y-4">
                  <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight text-white">
                    {currentSlide.headline}
                  </h2>
                  <p className="text-base sm:text-lg leading-relaxed text-white/85">
                    {currentSlide.body}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex flex-col">
        {renderMedia(false)}

        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 lg:px-14 py-8 lg:py-14 relative">
          <div className="w-full max-w-md space-y-6 relative pt-8">
            <div className="space-y-2 text-center sm:text-left">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <h1 className="text-4xl sm:text-5xl tracking-tight">
                    {mode === "login"
                      ? "Bienvenido de nuevo"
                      : mode === "register"
                      ? "Únete al gestor de turnos"
                      : "Ops, perdiste tu contraseña"}
                  </h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="text-base sm:text-lg text-muted-foreground mt-2"
                  >
                    {mode === "login"
                      ? "Ingresa tus credenciales para acceder al sistema"
                      : mode === "register"
                      ? "Crea tu cuenta y comienza a gestionar tus turnos"
                      : "No te preocupes, te ayudamos a recuperarla"}
                  </motion.p>
                </motion.div>
              </AnimatePresence>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 text-base md:text-base"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {mode !== "reset" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-base">
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-12 text-base md:text-base"
                        autoComplete={mode === "register" ? "new-password" : "current-password"}
                        required
                      />
                    </div>
                  </div>

                  {mode === "register" && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-base">
                        Confirmar Contraseña
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 h-12 text-base md:text-base"
                          autoComplete="new-password"
                          required
                        />
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-sm text-destructive">Las contraseñas no coinciden</p>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                <button 
                  type="button" 
                  className={actionButtonClass("login")} 
                  onClick={() => {
                    setMode("login");
                    setConfirmPassword("");
                  }}
                >
                  Iniciar sesión
                </button>
                <button 
                  type="button" 
                  className={actionButtonClass("register")} 
                  onClick={() => setMode("register")}
                >
                  Crear cuenta
                </button>
                <button 
                  type="button" 
                  className={actionButtonClass("reset")} 
                  onClick={() => {
                    setMode("reset");
                    setConfirmPassword("");
                  }}
                >
                  Recuperar contraseña
                </button>
              </div>

              <Button type="submit" className="w-full h-12 text-base" disabled={isLoggingIn}>
                {isLoggingIn ? "Iniciando sesión..." : mode === "login"
                  ? "Iniciar sesión"
                  : mode === "register"
                  ? "Crear cuenta"
                  : "Enviar recuperación"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">O</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full h-12 text-base"
                variant="outline"
                disabled={isLoggingIn}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continuar con Google
              </Button>

              <Button
                type="button"
                onClick={() => window.open('https://www.matecore.com.ar/', '_blank', 'noopener,noreferrer')}
                className="w-full h-12 text-base"
                variant="secondary"
              >
                Conocé Matecore
              </Button>
            </form>

            <div className="text-center text-base text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <button className="text-foreground hover:underline" onClick={() => setMode("register")}>Regístrate aquí</button>
            </div>
          </div>
        </div>
      </div>

      {renderMedia(true)}
    </div>
  );
}

export default LoginView;
