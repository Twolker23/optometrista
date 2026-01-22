import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { isSaturdayDate, parseLocalDate } from "@/lib/date-utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userGroup = (session.user as any)?.userGroup;
    const userId = (session.user as any)?.id;
    const isAdmin = userGroup === "ADMIN";

    if (!isAdmin && userGroup !== "LOJA" && userGroup !== "SAC") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, action, scheduledDate, scheduledTime, optometristId } = body;

    if (!clientId || !action) {
      return NextResponse.json(
        { error: "Cliente e ação são obrigatórios" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { appointments: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    if (!isAdmin && client.currentStatus !== "REPESCAGEM") {
      return NextResponse.json(
        { error: "Cliente não está na fila de Repescagem" },
        { status: 400 }
      );
    }

    // Verifica permissão baseada no grupo criador (ADMIN bypass)
    if (
      !isAdmin &&
      ((userGroup === "LOJA" && client.createdByGroup !== "LOJA") ||
       (userGroup === "SAC" && client.createdByGroup !== "SAC"))
    ) {
      return NextResponse.json(
        { error: "Você não tem permissão para gerenciar este cliente" },
        { status: 403 }
      );
    }

    switch (action) {
      case "REAGENDAR": {
        // Ação existente - reagendar exame
        if (!scheduledDate || !scheduledTime || !optometristId) {
          return NextResponse.json(
            { error: "Data, horário e optometrista são obrigatórios para reagendamento" },
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

        await prisma.$transaction([
          prisma.appointment.create({
            data: {
              clientId,
              scheduledDate: parseLocalDate(scheduledDate),
              scheduledTime,
              optometristId,
            },
          }),
          prisma.client.update({
            where: { id: clientId },
            data: {
              currentStatus: "AGENDADO",
              recovered: true,
              renegotiationReason: null,
            },
          }),
          prisma.queueHistory.create({
            data: {
              clientId,
              fromStatus: "REPESCAGEM",
              toStatus: "AGENDADO",
              userId,
              action: "Cliente recuperado - Exame reagendado",
            },
          }),
        ]);

        return NextResponse.json({ message: "Cliente reagendado com sucesso" });
      }

      case "RECUPERAR_RENEGOCIACAO": {
        // Recuperar para Renegociação
        await prisma.$transaction([
          prisma.client.update({
            where: { id: clientId },
            data: {
              currentStatus: "RENEGOCIACAO",
              recovered: true,
            },
          }),
          prisma.queueHistory.create({
            data: {
              clientId,
              fromStatus: "REPESCAGEM",
              toStatus: "RENEGOCIACAO",
              userId,
              action: "Cliente recuperado - Movido para Renegociação",
            },
          }),
        ]);

        return NextResponse.json({ message: "Cliente movido para Renegociação" });
      }

      case "RECUPERAR_RETORNO_LOJA": {
        // Recuperar para Retorno à Loja
        await prisma.$transaction([
          prisma.client.update({
            where: { id: clientId },
            data: {
              currentStatus: "RETORNO_LOJA",
              recovered: true,
            },
          }),
          prisma.queueHistory.create({
            data: {
              clientId,
              fromStatus: "REPESCAGEM",
              toStatus: "RETORNO_LOJA",
              userId,
              action: "Cliente recuperado - Movido para Retorno à Loja",
            },
          }),
        ]);

        return NextResponse.json({ message: "Cliente movido para Retorno à Loja" });
      }

      default:
        return NextResponse.json(
          { error: "Ação inválida" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Erro ao processar ação de repescagem:", error);
    return NextResponse.json(
      { error: "Erro ao processar ação" },
      { status: 500 }
    );
  }
}
