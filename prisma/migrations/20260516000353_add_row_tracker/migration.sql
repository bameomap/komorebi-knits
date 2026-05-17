-- AlterTable
ALTER TABLE "Pattern" ADD COLUMN "patternFile" TEXT;
ALTER TABLE "Pattern" ADD COLUMN "readerState" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "currentRow" INTEGER;
ALTER TABLE "Project" ADD COLUMN "totalRows" INTEGER;
