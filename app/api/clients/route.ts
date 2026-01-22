import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { parseLocalDate, isSaturdayDate } from "@/lib/date-utils";
import { canViewClient, canCreateClient } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userGroup = (session.user as any).userGroup;
    const userId = (session.user as any).id;
    const userUnidadeId = (session.user as any).unidadeId;
    const { searchParams } = new URL(request.url);
    const queueStatus = searchParams.get("queueStatus");
    const unidadeIdParam = searchParams.get("unidadeId");

    // Buscar clientes com base nas permissões
    const whereClause: any = {};

    // Filtrar por status da fila se especificado
    if (queueStatus) {
      whereClause.currentStatus = queueStatus;
    }

    // === FILTRO POR UNIDADE ===
    // ADMIN: pode filtrar por qualquer unidade ou ver todas
    // SAC: não tem restrição de unidade (acesso global)
    // LOJA/OPTO: só vê sua unidade
    if (userGroup === "ADMIN") {
      // ADMIN pode filtrar opcionalmente por unidade
      if (unidadeIdParam) {
        whereClause.unidadeId = unidadeIdParam;
      }
    } else if (userGroup === "SAC") {
      // SAC vê apenas clientes criados por SAC (sem restrição de unidade)
      whereClause.createdByGroup = "SAC";
      // Mas pode filtrar por unidade se quiser
      if (unidadeIdParam) {
        whereClause.unidadeId = unidadeIdParam;
      }
    } else if (userGroup === "OPTO") {
      // OPTO vê apenas clientes agendados para o próprio optometrista
      // E apenas de sua unidade
      whereClause.appointments = {
        some: {
          optometristId: userId,
        },
      };
      if (userUnidadeId) {
        whereClause.unidadeId = userUnidadeId;
      }
    } else if (userGroup === "LOJA") {
      // LOJA vê apenas clientes de sua unidade
      if (userUnidadeId) {
        whereClause.unidadeId = userUnidadeId;
      }
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
            userGroup: true,
          },
        },
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
        appointments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            optometrist: true,
            photo: true,
            sale: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clients);
  } catch (error: any) {
    console.error("Erro ao buscar clientes:", error);
    return NextResponse.json(
      { error: "Erro ao buscar clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userGroup = (session.user as any).userGroup;
    const userId = (session.user as any).id;
    const userUnidadeId = (session.user as any).unidadeId;
    
    if (!canCreateClient(userGroup)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { name, birthDate, phone, scheduledDate, scheduledTime, optometristId, unidadeId } = body;

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

    // === DETERMINAR UNIDADE ===
    let finalUnidadeId: string;

    if (userGroup === "ADMIN") {
      // ADMIN pode escolher qualquer unidade
      if (!unidadeId) {
        return NextResponse.json(
          { error: "Unidade é obrigatória" },
          { status: 400 }
        );
      }
      // Validar se unidade existe
      const unidadeExists = await prisma.unidade.findUnique({ where: { id: unidadeId } });
      if (!unidadeExists) {
        return NextResponse.json(
          { error: "Unidade não encontrada" },
          { status: 400 }
        );
      }
      finalUnidadeId = unidadeId;
    } else if (userGroup === "SAC") {
      // SAC pode escolher qualquer unidade
      if (!unidadeId) {
        return NextResponse.json(
          { error: "Unidade é obrigatória" },
          { status: 400 }
        );
      }
      finalUnidadeId = unidadeId;
    } else {
      // LOJA e OPTO: forçar unidade do usuário
      if (!userUnidadeId) {
        return NextResponse.json(
          { error: "Usuário não possui unidade associada" },
          { status: 400 }
        );
      }
      finalUnidadeId = userUnidadeId;
    }

    // Criar cliente e agendamento
    const client = await prisma.client.create({
      data: {
        name,
        birthDate: parseLocalDate(birthDate),
        phone,
        createdById: userId,
        createdByGroup: userGroup,
        unidadeId: finalUnidadeId,
        appointments: {
          create: {
            optometristId,
            scheduledDate: parseLocalDate(scheduledDate),
            scheduledTime,
          },
        },
        queueHistories: {
          create: {
            toStatus: "AGENDADO",
            userId: userId,
            action: "Cliente cadastrado e agendado",
          },
        },
      },
      include: {
        appointments: {
          include: {
            optometrist: true,
          },
        },
        unidade: true,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao criar cliente" },
      { status: 500 }
    );
  }
}
