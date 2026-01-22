import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

function sanitizeFileName(name: string) {
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function PUT(request: NextRequest) {
  try {
    const filenameParam = request.nextUrl.searchParams.get("filename");
    console.log("[upload/local] PUT recebido filename =", filenameParam);

    if (!filenameParam) {
      return NextResponse.json({ error: "filename é obrigatório" }, { status: 400 });
    }

    const safeName = sanitizeFileName(filenameParam);

    const uploadDir = path.join(
      process.cwd(),
      (process.env.LOCAL_STORAGE_DIR ?? "public/uploads").trim()
    );

    await mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await request.arrayBuffer();
    const filePath = path.join(uploadDir, safeName);

    await writeFile(filePath, Buffer.from(arrayBuffer));

    const publicBase =
      (process.env.PUBLIC_FILES_BASE_URL ?? "http://localhost:3000/uploads").trim();

    const fileUrl = `${publicBase}/${safeName}`;
    console.log("[upload/local] arquivo salvo em:", filePath);
    console.log("[upload/local] fileUrl:", fileUrl);

    return NextResponse.json({ ok: true, fileUrl, filename: safeName });
  } catch (err) {
    console.error("[upload/local] Erro:", err);
    return NextResponse.json({ error: "Falha ao salvar arquivo" }, { status: 500 });
  }
}
