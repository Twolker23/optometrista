import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).userGroup !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        userGroup: true,
        isActive: true,
        createdAt: true,
        unidadeId: true,
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).userGroup !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, name, userGroup, unidadeId } = body;

    if (!email || !password || !name || !userGroup) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar unidade para usuários não-ADMIN e não-SAC
    if (userGroup !== "ADMIN" && userGroup !== "SAC") {
      if (!unidadeId) {
        return NextResponse.json(
          { error: "Unidade é obrigatória para usuários LOJA e OPTO" },
          { status: 400 }
        );
      }
    }

    // Validar se unidade existe (se fornecida)
    if (unidadeId) {
      const unidadeExists = await prisma.unidade.findUnique({ where: { id: unidadeId } });
      if (!unidadeExists) {
        return NextResponse.json(
          { error: "Unidade não encontrada" },
          { status: 400 }
        );
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        userGroup,
        unidadeId: unidadeId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        userGroup: true,
        isActive: true,
        createdAt: true,
        unidadeId: true,
        unidade: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 500 }
    );
  }
}
