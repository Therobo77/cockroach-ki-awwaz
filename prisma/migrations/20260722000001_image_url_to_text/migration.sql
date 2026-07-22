-- AlterTable: expand imageUrl from VARCHAR(2048) to TEXT to hold base64 data URLs
ALTER TABLE "Message" ALTER COLUMN "imageUrl" TYPE TEXT;
