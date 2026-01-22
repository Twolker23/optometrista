import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).userGroup !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, userGroup, isActive, password, unidadeId } = body;

    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (userGroup) data.userGroup = userGroup;
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    
    // Atualizar unidade
    // Se unidadeId for string vazia ou null, remove a unidade (para ADMIN/SAC)
    // Se for uma string válida, atualiza
    if (unidadeId === "" || unidadeId === null) {
      data.unidadeId = null;
    } else if (unidadeId) {
      // Validar se unidade existe
      const unidadeExists = await prisma.unidade.findUnique({ where: { id: unidadeId } });
      if (!unidadeExists) {
        return NextResponse.json(
          { error: "Unidade não encontrada" },
          { status: 400 }
        );
      }
      data.unidadeId = unidadeId;
    }

    // Validar se LOJA/OPTO tem unidade
    if (userGroup && userGroup !== "ADMIN" && userGroup !== "SAC") {
      const currentUser = await prisma.user.findUnique({ where: { id: params.id } });
      const finalUnidadeId = data.unidadeId !== undefined ? data.unidadeId : currentUser?.unidadeId;
      if (!finalUnidadeId) {
        return NextResponse.json(
          { error: "Unidade é obrigatória para usuários LOJA e OPTO" },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
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

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).userGroup !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    // Verificar se o usuário está tentando excluir a si mesmo
    if ((session.user as any).id === params.id) {
      return NextResponse.json(
        { error: "Você não pode excluir seu próprio usuário" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Usuário excluído com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json(
      { error: "Erro ao excluir usuário" },
      { status: 500 }
    );
  }
}
