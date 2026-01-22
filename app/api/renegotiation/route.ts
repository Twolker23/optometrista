import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { parseLocalDate, isSaturdayDate } from "@/lib/date-utils";

/**
 * API para gerenciar ações em clientes na fila RENEGOCIACAO
 * 
 * Ações disponíveis:
 * 1. RETORNO: Cliente retornou e será reagendado (vai para AGENDADO)
 * 2. CONVERSAO: Cliente converteu venda (vai para VENDAS)
 * 3. DESISTENCIA: Cliente desistiu definitivamente (vai para REPESCAGEM)
 * 4. SEM_RETORNO: Cliente não retornou (vai para REPESCAGEM)
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    const userGroup = (session.user as any)?.userGroup;
    const isAdmin = userGroup === "ADMIN";
    
    // ADMIN, LOJA e SAC podem gerenciar renegociações
    if (!isAdmin && userGroup !== "LOJA" && userGroup !== "SAC") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, action, ...actionData } = body;

    if (!clientId || !action) {
      return NextResponse.json(
        { error: "Campos obrigatórios: clientId e action" },
        { status: 400 }
      );
    }

    // Buscar cliente
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        appointments: {
          orderBy: { scheduledDate: "desc" },
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

    // Validar que o cliente está em RENEGOCIACAO (ADMIN bypass)
    if (!isAdmin && client.currentStatus !== "RENEGOCIACAO") {
      return NextResponse.json(
        { error: "Cliente não está em RENEGOCIACAO" },
        { status: 400 }
      );
    }

    // Validar que o cliente foi criado pelo mesmo grupo (ADMIN bypass)
    if (!isAdmin && client.createdByGroup !== userGroup && userGroup !== "LOJA") {
      return NextResponse.json(
        { error: "Apenas o grupo criador pode gerenciar este cliente" },
        { status: 403 }
      );
    }

    const latestAppointment = client.appointments[0];
    const userId = (session.user as any).id;

    switch (action) {
      case "RETORNO":
        // Cliente retornou - reagendar
        const { scheduledDate, scheduledTime, optometristId } = actionData;
        
        if (!scheduledDate || !scheduledTime || !optometristId) {
          return NextResponse.json(
            { error: "Dados de agendamento obrigatórios: scheduledDate, scheduledTime, optometristId" },
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

        // Criar novo agendamento
        await prisma.appointment.create({
          data: {
            clientId: client.id,
            optometristId,
            scheduledDate: parseLocalDate(scheduledDate),
            scheduledTime,
          },
        });

        // Mover para AGENDADO e limpar renegotiationReason
        await prisma.client.update({
          where: { id: clientId },
          data: {
            currentStatus: "AGENDADO",
            renegotiationReason: null,
            queueHistories: {
              create: {
                fromStatus: "RENEGOCIACAO",
                toStatus: "AGENDADO",
                userId,
                action: "Cliente retornou - reagendado",
                appointmentId: latestAppointment?.id,
              },
            },
          },
        });

        return NextResponse.json({ message: "Cliente reagendado com sucesso" });

      case "CONVERSAO":
        // Cliente converteu venda
        const { os, value } = actionData;
        
        if (!os || !value) {
          return NextResponse.json(
            { error: "Dados de venda obrigatórios: os, value" },
            { status: 400 }
          );
        }

        // Criar venda
        const sale = await prisma.sale.create({
          data: {
            os,
            value: parseFloat(value),
          },
        });

        // Atualizar último agendamento com a venda
        if (latestAppointment) {
          await prisma.appointment.update({
            where: { id: latestAppointment.id },
            data: { saleId: sale.id },
          });
        }

        // Mover para VENDAS e limpar renegotiationReason
        await prisma.client.update({
          where: { id: clientId },
          data: {
            currentStatus: "VENDA",
            renegotiationReason: null,
            queueHistories: {
              create: {
                fromStatus: "RENEGOCIACAO",
                toStatus: "VENDA",
                userId,
                action: "Venda convertida após renegociação",
                appointmentId: latestAppointment?.id,
              },
            },
          },
        });

        return NextResponse.json({ message: "Venda registrada com sucesso", sale });

      case "DESISTENCIA":
        // Cliente desistiu definitivamente
        const { justification: desistenciaJustification } = actionData;

        await prisma.client.update({
          where: { id: clientId },
          data: {
            currentStatus: "REPESCAGEM",
            // Mantém o renegotiationReason original para histórico
            queueHistories: {
              create: {
                fromStatus: "RENEGOCIACAO",
                toStatus: "REPESCAGEM",
                userId,
                action: "Desistência definitiva",
                justification: desistenciaJustification,
                appointmentId: latestAppointment?.id,
              },
            },
          },
        });

        return NextResponse.json({ message: "Cliente movido para repescagem por desistência" });

      case "SEM_RETORNO":
        // Cliente não retornou
        const { justification: semRetornoJustification } = actionData;

        await prisma.client.update({
          where: { id: clientId },
          data: {
            currentStatus: "REPESCAGEM",
            // Mantém o renegotiationReason original para histórico
            queueHistories: {
              create: {
                fromStatus: "RENEGOCIACAO",
                toStatus: "REPESCAGEM",
                userId,
                action: "Cliente não retornou",
                justification: semRetornoJustification,
                appointmentId: latestAppointment?.id,
              },
            },
          },
        });

        return NextResponse.json({ message: "Cliente movido para repescagem por falta de retorno" });

      default:
        return NextResponse.json(
          { error: `Ação inválida: ${action}. Ações válidas: RETORNO, CONVERSAO, DESISTENCIA, SEM_RETORNO` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Erro ao processar ação de renegociação:", error);
    return NextResponse.json(
      { error: "Erro ao processar ação de renegociação" },
      { status: 500 }
    );
  }
}
