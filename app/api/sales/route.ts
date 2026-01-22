import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    const userGroup = (session.user as any)?.userGroup;
    
    // ADMIN, LOJA e SAC podem processar vendas
    if (userGroup !== "ADMIN" && userGroup !== "LOJA" && userGroup !== "SAC") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { appointmentId, os, value, converted, justification } = body;

    if (!appointmentId || typeof converted !== "boolean") {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes" },
        { status: 400 }
      );
    }

    if (converted && (!os || !value)) {
      return NextResponse.json(
        { error: "OS e valor são obrigatórios para vendas" },
        { status: 400 }
      );
    }

    if (!converted && !justification) {
      return NextResponse.json(
        { error: "Justificativa é obrigatória quando não há conversão" },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { client: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }

    if (converted) {
      // Criar venda
      const sale = await prisma.sale.create({
        data: {
          os,
          value: parseFloat(value),
        },
      });

      // Atualizar agendamento
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { saleId: sale.id },
      });

      // Mover cliente para fila de vendas
      await prisma.client.update({
        where: { id: appointment.clientId },
        data: {
          currentStatus: "VENDA",
          queueHistories: {
            create: {
              fromStatus: "RETORNO_LOJA",
              toStatus: "VENDA",
              userId: (session.user as any).id,
              action: "Venda efetivada",
              appointmentId,
            },
          },
        },
      });

      return NextResponse.json(sale, { status: 201 });
    } else {
      // Mover para renegociação com motivo NAO_COMPROU
      await prisma.client.update({
        where: { id: appointment.clientId },
        data: {
          currentStatus: "RENEGOCIACAO",
          renegotiationReason: "NAO_COMPROU",
          queueHistories: {
            create: {
              fromStatus: "RETORNO_LOJA",
              toStatus: "RENEGOCIACAO",
              userId: (session.user as any).id,
              action: "Negociação sem sucesso - movido para renegociação",
              justification,
              appointmentId,
            },
          },
        },
      });

      return NextResponse.json({ message: "Cliente movido para renegociação" });
    }
  } catch (error: any) {
    console.error("Erro ao processar venda:", error);
    return NextResponse.json(
      { error: "Erro ao processar venda" },
      { status: 500 }
    );
  }
}
