import path from "path";
import { mkdir, writeFile, unlink, stat } from "fs/promises";

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig } from "./aws-config";

/**
 * ✅ Provider robusto (trim + lower) pra evitar "local", local , LOCAL etc
 */
function isLocalStorage() {
  return (process.env.STORAGE_PROVIDER ?? "").toLowerCase().trim() === "local";
}

/**
 * Base do servidor (para montar URLs absolutas do /api/upload/local).
 * Em dev: http://localhost:3000
 */
function getServerBaseUrl() {
  return (
    (process.env.NEXTAUTH_URL ?? "").trim() ||
    (process.env.PUBLIC_APP_URL ?? "").trim() ||
    "http://localhost:3000"
  );
}

function sanitizeFileName(name: string) {
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getLocalUploadDir() {
  const dir = (process.env.LOCAL_STORAGE_DIR ?? "public/uploads").trim();
  return path.join(process.cwd(), dir);
}

function getPublicFilesBaseUrl() {
  return (process.env.PUBLIC_FILES_BASE_URL ?? `${getServerBaseUrl()}/uploads`).trim();
}

/**
 * Lazy init: só cria AWS client/config se realmente for S3
 */
let _s3Client: ReturnType<typeof createS3Client> | null = null;
let _bucket: { bucketName: string; folderPrefix: string } | null = null;

function getS3() {
  if (!_s3Client) _s3Client = createS3Client();
  if (!_bucket) _bucket = getBucketConfig();
  return { s3Client: _s3Client, ..._bucket };
}

/**
 * Retorna:
 * - uploadUrl: URL para dar PUT (S3 presigned ou rota local)
 * - cloud_storage_path: caminho/identificador do arquivo (S3 key ou filename local)
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic = false
) {
  const safeName = sanitizeFileName(fileName);
  const uniqueName = `${Date.now()}-${safeName}`;

  // ✅ LOCAL: devolve URL da rota local (PUT)
  if (isLocalStorage()) {
    const uploadUrl = `${getServerBaseUrl()}/api/upload/local?filename=${encodeURIComponent(
      uniqueName
    )}`;

    return { uploadUrl, cloud_storage_path: uniqueName };
  }

  // ☁️ S3 (como era)
  const { s3Client, bucketName, folderPrefix } = getS3();

  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${uniqueName}`
    : `${folderPrefix}uploads/${uniqueName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
    ContentDisposition: isPublic ? "attachment" : undefined,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return { uploadUrl, cloud_storage_path };
}

/**
 * Multipart: em LOCAL não faz sentido
 */
export async function initiateMultipartUpload(fileName: string, isPublic = false) {
  if (isLocalStorage()) {
    throw new Error("Multipart upload não suportado em STORAGE_PROVIDER=local");
  }

  const { s3Client, bucketName, folderPrefix } = getS3();
  const safeName = sanitizeFileName(fileName);
  const uniqueName = `${Date.now()}-${safeName}`;

  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${uniqueName}`
    : `${folderPrefix}uploads/${uniqueName}`;

  const command = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentDisposition: isPublic ? "attachment" : undefined,
  });

  const response = await s3Client.send(command);
  return { uploadId: response.UploadId, cloud_storage_path };
}

export async function getPresignedUrlForPart(
  cloud_storage_path: string,
  uploadId: string,
  partNumber: number
) {
  if (isLocalStorage()) {
    throw new Error("Multipart upload não suportado em STORAGE_PROVIDER=local");
  }

  const { s3Client, bucketName } = getS3();

  const command = new UploadPartCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function completeMultipartUpload(
  cloud_storage_path: string,
  uploadId: string,
  parts: { ETag: string; PartNumber: number }[]
) {
  if (isLocalStorage()) {
    throw new Error("Multipart upload não suportado em STORAGE_PROVIDER=local");
  }

  const { s3Client, bucketName } = getS3();

  const command = new CompleteMultipartUploadCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  await s3Client.send(command);
}

/**
 * ✅ URL do arquivo
 * Local: retorna URL pública para /uploads/<filename>
 * S3: URL pública (se public) ou signed (se private)
 */
export async function getFileUrl(cloud_storage_path: string, isPublic: boolean) {
  if (isLocalStorage()) {
    // opcional: validar se o arquivo existe, para evitar "URL inválida"
    const filePath = path.join(getLocalUploadDir(), cloud_storage_path);
    try {
      await stat(filePath);
    } catch {
      // arquivo ainda não existe (PUT pode ter falhado)
      throw new Error(`Arquivo local não encontrado: ${cloud_storage_path}`);
    }

    return `${getPublicFilesBaseUrl()}/${cloud_storage_path}`;
  }

  const { s3Client, bucketName } = getS3();

  if (isPublic) {
    const region = process.env.AWS_REGION ?? "us-east-1";
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: "attachment",
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteFile(cloud_storage_path: string) {
  if (isLocalStorage()) {
    const filePath = path.join(getLocalUploadDir(), cloud_storage_path);
    try {
      await stat(filePath);
      await unlink(filePath);
    } catch {
      // ignore
    }
    return;
  }

  const { s3Client, bucketName } = getS3();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });

  await s3Client.send(command);
}
