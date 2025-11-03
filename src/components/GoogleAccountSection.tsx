import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Chrome, Link as LinkIcon, Unlink } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

type GoogleAccountSectionProps = {
  className?: string;
};

export function GoogleAccountSection({ className }: GoogleAccountSectionProps) {
  const { session, linkGoogleAccount, unlinkGoogleAccount } = useAuth();
  const [isLinking, setIsLinking] = React.useState(false);
  const [isUnlinking, setIsUnlinking] = React.useState(false);

  const hasGoogleLinked =
    session?.user?.app_metadata?.providers?.includes("google") ||
    (session?.user as any)?.identities?.some((id: any) => id.provider === "google");

  const handleLink = async () => {
    try {
      setIsLinking(true);
      await linkGoogleAccount();
    } catch (e: any) {
      setIsLinking(false);
      toast.error(e?.message || "Error al vincular cuenta de Google");
    }
  };

  const handleUnlink = async () => {
    try {
      setIsUnlinking(true);
      await unlinkGoogleAccount();
      toast.success("Cuenta de Google desvinculada correctamente");
      setIsUnlinking(false);
    } catch (e: any) {
      setIsUnlinking(false);
      toast.error(e?.message || "Error al desvincular cuenta de Google");
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Cuenta de Google</CardTitle>
        <CardDescription>Conecta tu cuenta de Google para iniciar sesión más rápido</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Chrome className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{hasGoogleLinked ? "Conectado" : "No conectado"}</p>
              <p className="text-xs text-muted-foreground">
                {hasGoogleLinked ? "Puedes iniciar sesión con Google" : "Conecta tu cuenta de Google para iniciar sesión más rápido"}
              </p>
            </div>
          </div>

          {hasGoogleLinked ? (
            <Button variant="outline" size="sm" onClick={handleUnlink} disabled={isUnlinking}>
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
            <Button variant="default" size="sm" onClick={handleLink} disabled={isLinking}>
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
  );
}


