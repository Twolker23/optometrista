import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { getFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const photo = await prisma.photo.findUnique({
      where: { id: params.id },
    });

    if (!photo) {
      return NextResponse.json(
        { error: "Foto não encontrada" },
        { status: 404 }
      );
    }

    const url = await getFileUrl(photo.cloudStoragePath, photo.isPublic);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Erro ao gerar URL da foto:", error);
    return NextResponse.json(
      { error: "Erro ao gerar URL da foto" },
      { status: 500 }
    );
  }
}
