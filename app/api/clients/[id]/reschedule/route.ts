import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { parseLocalDate, isSaturdayDate } from "@/lib/date-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userGroup = (session.user as any).userGroup;
    const isAdmin = userGroup === "ADMIN";
    const body = await request.json();
    const { scheduledDate, scheduledTime, optometristId } = body;

    if (!scheduledDate || !scheduledTime || !optometristId) {
      return NextResponse.json(
        { error: "Data, hora e optometrista são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar que a data do agendamento é um sábado
    if (!isSaturdayDate(scheduledDate)) {
      return NextResponse.json(
        { error: "Agendamentos só podem ser feitos aos sábados" },
        { status: 400 }
      );
    }

    // Buscar cliente
    const client = await prisma.client.findUnique({
      where: { id: params.id },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    // Verificar permissão: Loja pode reagendar clientes da Loja, SAC pode reagendar clientes do SAC (ADMIN bypass)
    if (!isAdmin && userGroup === "SAC" && client.createdByGroup !== "SAC") {
      return NextResponse.json(
        { error: "Não autorizado a reagendar este cliente" },
        { status: 403 }
      );
    }

    if (!isAdmin && userGroup === "LOJA" && client.createdByGroup !== "LOJA") {
      return NextResponse.json(
        { error: "Não autorizado a reagendar este cliente" },
        { status: 403 }
      );
    }

    // Criar novo agendamento
    await prisma.appointment.create({
      data: {
        clientId: params.id,
        optometristId,
        scheduledDate: parseLocalDate(scheduledDate),
        scheduledTime,
      },
    });

    // Atualizar status do cliente e criar histórico
    const updatedClient = await prisma.client.update({
      where: { id: params.id },
      data: {
        currentStatus: "AGENDADO",
        queueHistories: {
          create: {
            fromStatus: client.currentStatus,
            toStatus: "AGENDADO",
            userId: (session.user as any).id,
            action: "Cliente reagendado",
          },
        },
      },
      include: {
        appointments: {
          include: {
            optometrist: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error("Erro ao reagendar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao reagendar cliente" },
      { status: 500 }
    );
  }
}
