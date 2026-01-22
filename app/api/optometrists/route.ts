import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userGroup = (session.user as any).userGroup;
    const userUnidadeId = (session.user as any).unidadeId;
    const { searchParams } = new URL(request.url);
    const unidadeIdParam = searchParams.get("unidadeId");

    // Construir filtro
    const whereClause: any = {
      userGroup: "OPTO",
      isActive: true,
    };

    // === FILTRO POR UNIDADE ===
    // ADMIN e SAC podem ver todos ou filtrar por unidade
    // LOJA e OPTO só veem optometristas de sua unidade
    if (userGroup === "ADMIN" || userGroup === "SAC") {
      // Pode filtrar opcionalmente por unidade
      if (unidadeIdParam) {
        whereClause.unidadeId = unidadeIdParam;
      }
    } else {
      // LOJA e OPTO: só vêem optometristas de sua unidade
      if (userUnidadeId) {
        whereClause.unidadeId = userUnidadeId;
      }
    }

    // Buscar usuários do grupo OPTO que estão ativos
    const optometrists = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        unidadeId: true,
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(optometrists);
  } catch (error: any) {
    console.error("Erro ao buscar optometristas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar optometristas" },
      { status: 500 }
    );
  }
}
