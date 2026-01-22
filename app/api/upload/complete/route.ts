import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    // Aceita camelCase e snake_case
    const cloudStoragePath =
      body.cloudStoragePath ?? body.cloud_storage_path ?? body.path ?? null;

    const url: string | null = body.url ?? null;
    const isPublic: boolean = Boolean(body.isPublic ?? false);

    if (!cloudStoragePath) {
      return NextResponse.json(
        { error: "cloudStoragePath é obrigatório" },
        { status: 400 }
      );
    }

    const photo = await prisma.photo.create({
      data: {
        cloudStoragePath,
        url: url ?? undefined,
        isPublic,
      },
    });

    return NextResponse.json(photo);
  } catch (error: any) {
    console.error("Erro no /api/upload/complete:", error);
    return NextResponse.json(
      {
        error: "Erro ao completar upload",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
