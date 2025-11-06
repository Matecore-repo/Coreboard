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
import { useState } from "react";
import { GoogleAccountSection } from "./GoogleAccountSection";

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

      <GoogleAccountSection />
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-md"
          role="dialog"
          aria-labelledby="profile-title-mobile"
          aria-describedby="profile-description-mobile"
          aria-modal="true"
          data-modal="profile"
        >
          <SheetHeader>
            <SheetTitle id="profile-title-mobile">Mi Perfil</SheetTitle>
            <SheetDescription id="profile-description-mobile">
              Tu información de cuenta y configuración
            </SheetDescription>
          </SheetHeader>
          <section className="mt-6" role="region" aria-label="Información del perfil">
            <Card role="region" aria-label="Información personal">
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  Tu información de cuenta y configuración
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4" role="group" aria-label="Datos del perfil">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground" htmlFor="profile-email-mobile">Email</label>
                    <p id="profile-email-mobile" className="text-lg" aria-label={`Email: ${user?.email || 'No disponible'}`}>
                      {user?.email || 'No disponible'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground" htmlFor="profile-role-mobile">Rol</label>
                    <p id="profile-role-mobile" className="text-lg capitalize" aria-label={`Rol: ${currentRole || 'Sin rol'}`}>
                      <Badge variant="secondary">{currentRole || 'Sin rol'}</Badge>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground" htmlFor="profile-org-mobile">Organización</label>
                    <p id="profile-org-mobile" className="text-lg" aria-label={`Organización: ${currentOrgId || 'No seleccionada'}`}>
                      {currentOrgId || 'No seleccionada'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <GoogleAccountSection />
          </section>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px]"
        role="dialog"
        aria-labelledby="profile-title"
        aria-describedby="profile-description"
        aria-modal="true"
        data-modal="profile"
      >
        <DialogHeader>
          <DialogTitle id="profile-title">Mi Perfil</DialogTitle>
          <DialogDescription id="profile-description">
            Tu información de cuenta y configuración
          </DialogDescription>
        </DialogHeader>
        <section className="mt-4" role="region" aria-label="Información del perfil">
          <Card role="region" aria-label="Información personal">
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Tu información de cuenta y configuración
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2" role="group" aria-label="Datos del perfil">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground" htmlFor="profile-email">Email</label>
                  <p id="profile-email" className="text-lg" aria-label={`Email: ${user?.email || 'No disponible'}`}>
                    {user?.email || 'No disponible'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground" htmlFor="profile-role">Rol</label>
                  <p id="profile-role" className="text-lg capitalize" aria-label={`Rol: ${currentRole || 'Sin rol'}`}>
                    <Badge variant="secondary">{currentRole || 'Sin rol'}</Badge>
                  </p>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-muted-foreground" htmlFor="profile-org">Organización</label>
                  <p id="profile-org" className="text-lg" aria-label={`Organización: ${currentOrgId || 'No seleccionada'}`}>
                    {currentOrgId || 'No seleccionada'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <GoogleAccountSection />
        </section>
      </DialogContent>
    </Dialog>
  );
}

