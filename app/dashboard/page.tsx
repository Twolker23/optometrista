import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Glasses } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userGroup = (session.user as any).userGroup;

  // Redirecionar para a página apropriada baseado no grupo
  switch (userGroup) {
    case "ADMIN":
      redirect("/dashboard/admin");
      break;
    case "LOJA":
      redirect("/dashboard/loja");
      break;
    case "SAC":
      redirect("/dashboard/sac");
      break;
    case "OPTO":
      redirect("/dashboard/opto");
      break;
    default:
      redirect("/login");
  }

  // Este código nunca será executado devido ao redirect acima
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Glasses className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}
