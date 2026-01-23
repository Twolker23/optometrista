-- CreateEnum
CREATE TYPE "RenegotiationReason" AS ENUM ('NAO_COMPARECEU', 'NAO_COMPROU');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "renegotiationReason" "RenegotiationReason";
