import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

// GET - Listar unidades
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const unidades = await prisma.unidade.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(unidades);
  } catch (error: any) {
    console.error("Erro ao buscar unidades:", error);
    return NextResponse.json({ error: "Erro ao buscar unidades" }, { status: 500 });
  }
}
