import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.userGroup !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    // Delete all related records in order (respecting foreign keys)
    await prisma.$transaction(async (tx) => {
      // Delete queue histories first
      await tx.queueHistory.deleteMany({});
      // Delete appointments
      await tx.appointment.deleteMany({});
      // Delete clients
      await tx.client.deleteMany({});
    });

    return NextResponse.json({ message: "Todas as filas foram limpas com sucesso" });
  } catch (error: any) {
    console.error("Erro ao limpar filas:", error);
    return NextResponse.json(
      { error: "Erro ao limpar filas" },
      { status: 500 }
    );
  }
}
