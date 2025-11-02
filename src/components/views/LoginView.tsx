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
  const { signInAsDemo, signIn, signUp, resetPassword, signInWithGoogle, user, loading } = useAuth();
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
      setIsLoggingIn(false);
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
        // No redirigir aquí porque handleSignedIn en AuthContext ya lo hace
        setIsLoggingIn(false);
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
      // No redirigir aquí porque signInAsDemo en AuthContext ya lo hace
      setIsLoggingIn(false);
    } else {
      toast.error("Demo no disponible en este entorno");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await signInWithGoogle();
      // No redirigir aquí porque el OAuth redirige automáticamente a Google y luego al callback
    } catch (error: any) {
      setIsLoggingIn(false);
      toast.error(error.message || "Error al iniciar sesión con Google");
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
