import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const appointmentId = params.id;

    const body = await request.json().catch(() => ({}));
    const { isApt, aptJustification, photoId } = body as {
      isApt?: boolean;
      aptJustification?: string;
      photoId?: string | null;
    };

    // ======= Busque o appointment (ajuste include/where se precisar) =======
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }

    // ======= Atualize o appointment (ajuste campos conforme seu schema) =======
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        // ajuste os nomes se no seu schema forem diferentes:
        isApt: Boolean(isApt),
        aptJustification: aptJustification ?? null,

        // se seu campo no schema for outro (ex: recipePhotoId), ajuste aqui:
        photoId: photoId ?? null,
      },
    });

    // Se você tem esse bloco de update do client + queueHistories no seu arquivo original,
    // você pode colar aqui dentro do try, depois do update do appointment.
    // (o importante é: estar dentro do try)

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Erro ao registrar aptidão:", error);

    return NextResponse.json(
      {
        error: "Erro ao registrar aptidão",
        details: error?.message ?? String(error),
        code: error?.code,
      },
      { status: 500 }
    );
  }
}
