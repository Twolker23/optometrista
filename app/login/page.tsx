"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Glasses, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showOptoError, setShowOptoError] = useState(false);
  const error = searchParams?.get?.("error");

  useEffect(() => {
    // Se redirecionado por restrição de horário OPTO, fazer logout e mostrar mensagem
    if (error === "opto_restricted") {
      setShowOptoError(true);
      signOut({ redirect: false });
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowOptoError(false);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Verificar se é erro de restrição de horário OPTO
        if (result.error.includes("sábados")) {
          setShowOptoError(true);
        } else {
          toast.error(result.error);
        }
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error: any) {
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#B11226] p-3 sm:p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 sm:space-y-4 text-center px-4 sm:px-6">
          <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Glasses className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Sistema Opto</CardTitle>
            <CardDescription className="text-sm">Faça login para acessar o sistema</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {showOptoError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Acesso do Optometrista permitido apenas aos sábados, das 08:00 às 18:30.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="login-email-field">Email</Label>
              <Input
                id="login-email-field"
                name="login-email-field"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password-field">Senha</Label>
              <Input
                id="login-password-field"
                name="login-password-field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
