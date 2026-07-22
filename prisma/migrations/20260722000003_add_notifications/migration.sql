-- CreateTable: Notification for reactions and @mentions
CREATE TABLE "Notification" (
    "id"          TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type"        VARCHAR(20) NOT NULL,
    "messageId"   TEXT,
    "fromName"    VARCHAR(100) NOT NULL,
    "fromColor"   VARCHAR(32) NOT NULL,
    "emoji"       VARCHAR(32),
    "excerpt"     VARCHAR(120),
    "read"        BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_recipientId_read_idx" ON "Notification"("recipientId", "read");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt" DESC);
