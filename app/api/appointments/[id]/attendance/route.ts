import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

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
    // ADMIN e OPTO podem registrar comparecimento
    if (userGroup !== "ADMIN" && userGroup !== "OPTO") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { attended } = body;

    if (typeof attended !== "boolean") {
      return NextResponse.json(
        { error: "Campo 'attended' é obrigatório" },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        attended,
        attendedAt: attended ? new Date() : null,
      },
      include: {
        client: true,
        optometrist: true,
      },
    });

    // Se não compareceu, mover para RENEGOCIACAO com motivo NAO_COMPARECEU
    if (!attended) {
      await prisma.client.update({
        where: { id: appointment.clientId },
        data: {
          currentStatus: "RENEGOCIACAO",
          renegotiationReason: "NAO_COMPARECEU",
          queueHistories: {
            create: {
              fromStatus: "AGENDADO",
              toStatus: "RENEGOCIACAO",
              userId: (session.user as any).id,
              action: "Cliente não compareceu - movido para renegociação",
              appointmentId: appointment.id,
            },
          },
        },
      });
    }

    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error("Erro ao registrar comparecimento:", error);
    return NextResponse.json(
      { error: "Erro ao registrar comparecimento" },
      { status: 500 }
    );
  }
}
