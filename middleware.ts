import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Função para verificar se é sábado e dentro do horário permitido (08:00-18:30) em São Paulo
function isOptoAccessAllowed(): boolean {
  const now = new Date();
  // Converter para horário de São Paulo
  const spTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const dayOfWeek = spTime.getDay(); // 0 = domingo, 6 = sábado
  const hours = spTime.getHours();
  const minutes = spTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  // Sábado = 6, horário 08:00 (480 min) até 18:30 (1110 min)
  const isSaturday = dayOfWeek === 6;
  const isWithinTime = totalMinutes >= 480 && totalMinutes <= 1110;
  
  return isSaturday && isWithinTime;
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  const { pathname } = request.nextUrl;

  // Permitir acesso às rotas públicas
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/og-image")
  ) {
    return NextResponse.next();
  }

  // Redirecionar para login se não autenticado
  if (!token) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  // Verificar restrição de horário para OPTO (sessão ativa)
  if (token.userGroup === "OPTO" && !isOptoAccessAllowed()) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "opto_restricted");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
