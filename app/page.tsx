import { redirect } from "next/navigation";
import { Glasses } from "lucide-react";

export default function HomePage() {
  redirect("/dashboard");
  
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
