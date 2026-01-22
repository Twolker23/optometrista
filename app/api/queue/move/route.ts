import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { QueueStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, toStatus, action, justification } = body;

    if (!clientId || !toStatus || !action) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes" },
        { status: 400 }
      );
    }

    // Buscar cliente atual
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    // Atualizar cliente e criar histórico
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        currentStatus: toStatus as QueueStatus,
        queueHistories: {
          create: {
            fromStatus: client.currentStatus,
            toStatus: toStatus as QueueStatus,
            userId: (session.user as any).id,
            action,
            justification,
          },
        },
      },
      include: {
        appointments: {
          include: {
            optometrist: true,
            photo: true,
            sale: true,
          },
        },
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error("Erro ao mover cliente:", error);
    return NextResponse.json(
      { error: "Erro ao mover cliente" },
      { status: 500 }
    );
  }
}
