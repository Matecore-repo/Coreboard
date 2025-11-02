import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useIsMobile } from "./ui/use-mobile";
import { Chrome, Link as LinkIcon, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user, currentRole, currentOrgId, session, linkGoogleAccount, unlinkGoogleAccount } = useAuth();
  const isMobile = useIsMobile();
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Verificar si tiene Google vinculado
  const hasGoogleLinked = session?.user?.app_metadata?.providers?.includes('google') || 
                          session?.user?.identities?.some((id: any) => id.provider === 'google');

  const handleLinkGoogle = async () => {
    try {
      setIsLinking(true);
      await linkGoogleAccount();
      // El OAuth flow redirige automáticamente
    } catch (error: any) {
      setIsLinking(false);
      toast.error(error.message || 'Error al vincular cuenta de Google');
    }
  };

  const handleUnlinkGoogle = async () => {
    try {
      setIsUnlinking(true);
      await unlinkGoogleAccount();
      toast.success('Cuenta de Google desvinculada correctamente');
      setIsUnlinking(false);
    } catch (error: any) {
      setIsUnlinking(false);
      toast.error(error.message || 'Error al desvincular cuenta de Google');
    }
  };

  const content = (
    <>
      <div className="mb-4">
        <h2 className="text-xl md:text-2xl font-semibold leading-none mb-1">
          Mi Perfil
        </h2>
        <p className="text-sm text-muted-foreground">
          Tu información de cuenta y configuración
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>
            Tu información de cuenta y configuración
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Email</label>
              <p className="text-lg">{user?.email || 'No disponible'}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Rol</label>
              <p className="text-lg capitalize">
                <Badge variant="secondary">{currentRole || 'Sin rol'}</Badge>
              </p>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-muted-foreground">Organización</label>
              <p className="text-lg">{currentOrgId || 'No seleccionada'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de cuenta de Google */}
      <Card>
        <CardHeader>
          <CardTitle>Cuenta de Google</CardTitle>
          <CardDescription>
            Conecta tu cuenta de Google para iniciar sesión más rápido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Chrome className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {hasGoogleLinked ? 'Conectado' : 'No conectado'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasGoogleLinked 
                    ? 'Puedes iniciar sesión con Google' 
                    : 'Conecta tu cuenta de Google para iniciar sesión más rápido'}
                </p>
              </div>
            </div>
            {hasGoogleLinked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlinkGoogle}
                disabled={isUnlinking}
              >
                {isUnlinking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Desvinculando...
                  </>
                ) : (
                  <>
                    <Unlink className="h-4 w-4 mr-2" />
                    Desconectar
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleLinkGoogle}
                disabled={isLinking}
              >
                {isLinking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Conectar Google
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Mi Perfil</SheetTitle>
            <SheetDescription>
              Tu información de cuenta y configuración
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  Tu información de cuenta y configuración
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="text-lg">{user?.email || 'No disponible'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Rol</label>
                    <p className="text-lg capitalize">
                      <Badge variant="secondary">{currentRole || 'Sin rol'}</Badge>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Organización</label>
                    <p className="text-lg">{currentOrgId || 'No seleccionada'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sección de cuenta de Google */}
            <Card>
              <CardHeader>
                <CardTitle>Cuenta de Google</CardTitle>
                <CardDescription>
                  Conecta tu cuenta de Google para iniciar sesión más rápido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Chrome className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {hasGoogleLinked ? 'Conectado' : 'No conectado'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hasGoogleLinked 
                          ? 'Puedes iniciar sesión con Google' 
                          : 'Conecta tu cuenta de Google para iniciar sesión más rápido'}
                      </p>
                    </div>
                  </div>
                  {hasGoogleLinked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUnlinkGoogle}
                      disabled={isUnlinking}
                    >
                      {isUnlinking ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          Desvinculando...
                        </>
                      ) : (
                        <>
                          <Unlink className="h-4 w-4 mr-2" />
                          Desconectar
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleLinkGoogle}
                      disabled={isLinking}
                    >
                      {isLinking ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Conectar Google
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
          <DialogDescription>
            Tu información de cuenta y configuración
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Tu información de cuenta y configuración
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="text-lg">{user?.email || 'No disponible'}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Rol</label>
                  <p className="text-lg capitalize">
                    <Badge variant="secondary">{currentRole || 'Sin rol'}</Badge>
                  </p>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-muted-foreground">Organización</label>
                  <p className="text-lg">{currentOrgId || 'No seleccionada'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sección de cuenta de Google */}
          <Card>
            <CardHeader>
              <CardTitle>Cuenta de Google</CardTitle>
              <CardDescription>
                Conecta tu cuenta de Google para iniciar sesión más rápido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Chrome className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {hasGoogleLinked ? 'Conectado' : 'No conectado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hasGoogleLinked 
                        ? 'Puedes iniciar sesión con Google' 
                        : 'Conecta tu cuenta de Google para iniciar sesión más rápido'}
                    </p>
                  </div>
                </div>
                {hasGoogleLinked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnlinkGoogle}
                    disabled={isUnlinking}
                  >
                    {isUnlinking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Desvinculando...
                      </>
                    ) : (
                      <>
                        <Unlink className="h-4 w-4 mr-2" />
                        Desconectar
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleLinkGoogle}
                    disabled={isLinking}
                  >
                    {isLinking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Conectar Google
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

