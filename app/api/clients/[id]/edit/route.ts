import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { parseLocalDate, isSaturdayDate } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export async function PATCH(
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
    
    // ADMIN, LOJA e SAC podem editar
    if (!isAdmin && userGroup !== "LOJA" && userGroup !== "SAC") {
      return NextResponse.json(
        { error: "Apenas ADMIN, LOJA e SAC podem editar clientes" },
        { status: 403 }
      );
    }

    // Buscar o cliente
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        appointments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o cliente foi criado pelo mesmo grupo (bypass para ADMIN)
    if (!isAdmin && client.createdByGroup !== userGroup) {
      return NextResponse.json(
        { error: "Você só pode editar clientes criados pelo seu grupo" },
        { status: 403 }
      );
    }

    // Verificar se o cliente está na fila AGENDADO (bypass para ADMIN)
    if (!isAdmin && client.currentStatus !== "AGENDADO") {
      return NextResponse.json(
        { error: "Apenas clientes na fila AGENDADO podem ser editados" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, birthDate, phone, scheduledDate, scheduledTime, optometristId } = body;

    // Validações
    if (!name || !birthDate || !phone || !scheduledDate || !scheduledTime || !optometristId) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
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

    // Atualizar os dados do cliente
    await prisma.client.update({
      where: { id: params.id },
      data: {
        name,
        birthDate: parseLocalDate(birthDate),
        phone,
      },
    });

    // Atualizar o agendamento mais recente
    if (client.appointments && client.appointments.length > 0) {
      await prisma.appointment.update({
        where: { id: client.appointments[0].id },
        data: {
          scheduledDate: parseLocalDate(scheduledDate),
          scheduledTime,
          optometristId,
        },
      });
    }

    // Criar entrada no histórico
    await prisma.queueHistory.create({
      data: {
        clientId: params.id,
        userId: (session.user as any).id,
        action: "Dados do cliente editados",
        fromStatus: client.currentStatus,
        toStatus: client.currentStatus,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao editar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao editar cliente" },
      { status: 500 }
    );
  }
}
