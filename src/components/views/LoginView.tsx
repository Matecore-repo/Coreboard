import React, { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { Button } from "../ui/button";
import LoginCTA from '../LoginCTA';
import { toast } from 'sonner';
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import NextImage from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import ThemeBubble from '../../components/ThemeBubble';

// Imagen representativa de peluquería: preferimos la imagen pública en `public/`.
// Usamos `imagenlogin.jpg` que ya existe en `public/` para evitar 404.
const salonImagePublic = "/imagenlogin.jpg";
const salonImageAsset = "/imagenlogin.jpg";

interface LoginViewProps {
  onLogin: () => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const { signInAsDemo } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Empezamos con la imagen embebida en `src/assets` (evita mostrar placeholder roto)
  const [currentImage, setCurrentImage] = useState<string>(salonImageAsset);

  // Intentamos cargar la versión pública en /login-fallback.jpg y solo si carga correctamente
  // sustituyimos; de lo contrario nos quedamos con la asset interna.
  React.useEffect(() => {
    let mounted = true;
    const img = new (globalThis as any).Image();
    img.src = salonImagePublic;
    img.onload = () => {
      if (mounted) setCurrentImage(salonImagePublic);
    };
    // en error no hacemos nada
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  const handleForceLogin = () => {
    if (typeof signInAsDemo === 'function') {
      signInAsDemo();
      return;
    }
    onLogin();
  };

  return (
    <div className="min-h-screen flex">
      {/* Floating theme bubble */}
      <ThemeBubble />
      {/* Left Side - Form (50% on desktop, full on mobile) */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Mobile Image Header */}
        <div className="lg:hidden w-full h-[45vh] relative overflow-hidden">
          <NextImage src={currentImage} alt="Hair Salon" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background" />
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 lg:px-12 py-8 lg:py-12 relative">
          <div className="w-full max-w-md space-y-6 relative pt-8">
            {/* Header: title */}
            <div className="flex items-center justify-between">
              <div className="space-y-2 text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl tracking-tight">Bienvenido de nuevo</h1>
                <p className="text-muted-foreground">Ingresa tus credenciales para acceder al sistema</p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11"
              >
                Iniciar Sesión
              </Button>

              {/* Demo CTA: moderno, pastel, respeta light/dark, con brillo sutil */}
              {/* Isolated CTA component */}
              <div className="group">
                <LoginCTA onClick={handleForceLogin}>Explorar la app</LoginCTA>
              </div>
            </form>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground pt-4">
              ¿No tienes cuenta?{" "}
              <button className="text-foreground hover:underline">
                Regístrate aquí
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image (50% on desktop, hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-muted min-h-[60vh] lg:h-screen">
        <NextImage src={currentImage} alt="Modern Hair Salon" fill className="object-cover" sizes="50vw" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-transparent" />
        
        {/* Overlay Text */}
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <h2 className="text-4xl mb-4">
            Gestiona tu peluquería
          </h2>
          <p className="text-lg text-white/90">
            Sistema completo de gestión de turnos, clientes y finanzas para profesionales del sector
          </p>
        </div>
      </div>
    </div>
  );
}
