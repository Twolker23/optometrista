import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QueueStatus } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const statusRaw = body.status;

    if (!statusRaw) {
      return NextResponse.json({ error: "status é obrigatório" }, { status: 400 });
    }

    const allowed = Object.values(QueueStatus);

    // normaliza input (ex: "vendas", "VENDAS", "Vendas")
    const statusNormalized = String(statusRaw).trim().toUpperCase();

    // tenta achar um valor do enum que bata (case-insensitive)
    const matched =
      allowed.find((s) => String(s).toUpperCase() === statusNormalized) ?? null;

    if (!matched) {
      return NextResponse.json(
        {
          error: `Status inválido: "${statusRaw}".`,
          allowed, // <-- aqui você vai ver os valores reais do seu enum
        },
        { status: 400 }
      );
    }

    const updated = await prisma.client.update({
      where: { id: params.id },
      data: {
        currentStatus: matched,
        renegotiationReason: body.renegotiationReason ?? undefined,
        recovered: body.recovered ?? undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Erro ao atualizar status:", error);
    return NextResponse.json(
      { error: error?.message ?? "Erro ao atualizar status" },
      { status: 500 }
    );
  }
}
