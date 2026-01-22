import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { deleteFile } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Buscar fotos com mais de 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldPhotos = await prisma.photo.findMany({
      where: {
        uploadDate: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`Encontradas ${oldPhotos.length} fotos para excluir`);

    // Excluir fotos do S3 e do banco
    for (const photo of oldPhotos) {
      try {
        await deleteFile(photo.cloudStoragePath);
        await prisma.photo.delete({
          where: { id: photo.id },
        });
        console.log(`Foto ${photo.id} excluída com sucesso`);
      } catch (error: any) {
        console.error(`Erro ao excluir foto ${photo.id}:`, error);
      }
    }

    return NextResponse.json({
      message: "Job de exclusão de fotos executado",
      deleted: oldPhotos.length,
    });
  } catch (error: any) {
    console.error("Erro ao executar job de exclusão:", error);
    return NextResponse.json(
      { error: "Erro ao executar job de exclusão" },
      { status: 500 }
    );
  }
}
