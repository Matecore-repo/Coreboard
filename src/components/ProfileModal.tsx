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
import { useAuth } from "../contexts/AuthContext";
import { useIsMobile } from "./ui/use-mobile";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user, currentRole, currentOrgId } = useAuth();
  const isMobile = useIsMobile();

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
        </div>
      </DialogContent>
    </Dialog>
  );
}

