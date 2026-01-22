"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Glasses } from "lucide-react";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Glasses className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-[#B11226] text-white sticky top-0 z-50 shadow-sm">
        {/* Mantém exatamente o alinhamento do print 1 */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              {/* Ícone/Logo com contraste */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Glasses className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>

              {/* Textos */}
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-bold text-white truncate">
                  Sistema Opto
                </h1>
                <p className="text-xs sm:text-sm text-white/80 truncate">
                  {session?.user?.name} - {(session.user as any)?.userGroup}
                </p>
              </div>
            </div>

            {/* Botão Sair legível no vermelho */}
            <Button
  variant="outline"
  onClick={handleLogout}
  size="sm"
  className="flex-shrink-0 bg-white text-black border border-white hover:bg-gray-100 transition"
>
  <LogOut className="w-4 h-4 sm:mr-2" />
  <span className="hidden sm:inline">Sair</span>
</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
}
