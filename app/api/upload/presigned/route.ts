import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { generatePresignedUploadUrl } from "@/lib/s3";
import crypto from "crypto";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { filename, contentType } = body as {
      filename?: string;
      contentType?: string;
    };

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Nome e tipo do arquivo são obrigatórios" },
        { status: 400 }
      );
    }

    const provider = (process.env.STORAGE_PROVIDER ?? "").toLowerCase().trim();
    console.log("[upload/presigned] STORAGE_PROVIDER =", process.env.STORAGE_PROVIDER);

    // ✅ LOCAL MODE
    if (provider === "local") {
      const safe = sanitizeFileName(filename);
      const unique = `${crypto.randomUUID()}_${safe}`;

      const uploadUrl = `${request.nextUrl.origin}/api/upload/local?filename=${encodeURIComponent(
        unique
      )}`;

      const cloud_storage_path = unique;

      return NextResponse.json({ uploadUrl, cloud_storage_path });
    }

    // ☁️ S3 MODE
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      filename,
      contentType,
      false
    );

    return NextResponse.json({ uploadUrl, cloud_storage_path });
  } catch (error) {
    console.error("Erro ao gerar URL de upload:", error);
    return NextResponse.json(
      { error: "Erro ao gerar URL de upload" },
      { status: 500 }
    );
  }
}
