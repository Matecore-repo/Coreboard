import React, { useState, useEffect } from "react";
import { Lock, Mail } from "lucide-react";
import { Button } from "../ui/button";
import LoginCTA from "../LoginCTA";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import NextImage from "next/image";
import { useAuth } from "../../contexts/AuthContext";
import ThemeBubble from "../../components/ThemeBubble";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/router";

const salonImagePublic = "/imagenlogin.jpg";
const salonImageAsset = "/imagenlogin.jpg";

function LoginView() {
  const { signInAsDemo, signIn, signUp, resetPassword, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretToken, setSecretToken] = useState("");
  const [currentImage, setCurrentImage] = useState<string>(salonImageAsset);
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Si el usuario ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (user && !isLoggingIn) {
      router.push('/dashboard');
    }
  }, [user, router, isLoggingIn]);

  React.useEffect(() => {
    let mounted = true;
    const img = new (globalThis as any).Image();
    img.src = salonImagePublic;
    img.onload = () => {
      if (mounted) setCurrentImage(salonImagePublic);
    };
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      if (!email || !password) {
        toast.error("Ingresa email y contraseña");
        return;
      }
      try {
        setIsLoggingIn(true);
        await signIn(email, password);
        // Redirigir al dashboard - el toast de bienvenida se mostrará en App.tsx
        setTimeout(() => {
          router.push('/dashboard');
        }, 300);
      } catch (error: any) {
        setIsLoggingIn(false);
        toast.error(error.message || "Error al iniciar sesión");
      }
      return;
    }

    if (mode === "register") {
      if (!email || !password || !secretToken) {
        toast.error("Ingresa email, contraseña y token secreto");
        return;
      }
      try {
        await signUp(email, password, secretToken);
        toast.success("Registro enviado. Revisa tu email.");
        setMode("login");
      } catch (error: any) {
        toast.error(error.message || "Error al registrarse");
      }
      return;
    }

    if (!email) {
      toast.error("Ingresa tu email");
      return;
    }
    try {
      await resetPassword(email);
      toast.success("Te enviamos un email para recuperar tu contraseña");
      setMode("login");
    } catch (error: any) {
      toast.error(error.message || "Error enviando recuperación");
    }
  };

  const handleForceLogin = () => {
    if (typeof signInAsDemo === "function") {
      setIsLoggingIn(true);
      signInAsDemo();
      // Redirigir al dashboard - el toast de bienvenida se mostrará en App.tsx
      setTimeout(() => {
        router.push('/dashboard');
      }, 300);
    } else {
      toast.error("Demo no disponible en este entorno");
    }
  };

  const actionButtonClass = (forMode: "login" | "register" | "reset") =>
    `hover:underline transition-colors ${mode === forMode ? "text-foreground font-medium" : "text-muted-foreground"}`;

  return (
    <div className="min-h-screen flex">
      <ThemeBubble />
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="lg:hidden w-full h-[45vh] relative overflow-hidden">
          <NextImage src={currentImage} alt="Hair Salon" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background" />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 lg:px-12 py-8 lg:py-12 relative">
          <div className="w-full max-w-md space-y-6 relative pt-8">
            <div className="space-y-2 text-center sm:text-left">
              <h1 className="text-4xl sm:text-5xl tracking-tight">Bienvenido de nuevo</h1>
              <p className="text-base sm:text-lg text-muted-foreground">
                Ingresa tus credenciales para acceder al sistema
              </p>
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
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>
              )}

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="signup_token" className="text-base">
                    Token secreto
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup_token"
                      type="text"
                      placeholder="Ingresa tu token de registro"
                      value={secretToken}
                      onChange={(e) => setSecretToken(e.target.value)}
                      className="h-12 text-base md:text-base"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                <button type="button" className={actionButtonClass("login")} onClick={() => setMode("login")}>
                  Iniciar sesión
                </button>
                <button type="button" className={actionButtonClass("register")} onClick={() => setMode("register")}>
                  Crear cuenta
                </button>
                <button type="button" className={actionButtonClass("reset")} onClick={() => setMode("reset")}>
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

              <div className="group">
                <LoginCTA onClick={handleForceLogin}>Explorar la app</LoginCTA>
              </div>
            </form>

            <div className="text-center text-base text-muted-foreground pt-4">
              ¿No tienes cuenta?{" "}
              <button className="text-foreground hover:underline" onClick={() => setMode("register")}>Regístrate aquí</button>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-muted min-h-[60vh] lg:h-screen">
        <NextImage src={currentImage} alt="Modern Hair Salon" fill className="object-cover" sizes="50vw" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <h2 className="text-4xl mb-4">Gestiona tu peluquería</h2>
          <p className="text-lg text-white/90">
            Sistema completo de gestión de turnos, clientes y finanzas para profesionales del sector
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginView;
