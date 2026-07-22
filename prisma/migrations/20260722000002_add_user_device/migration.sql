-- CreateTable: UserDevice for tracking connected devices/users
CREATE TABLE "UserDevice" (
    "id"          TEXT NOT NULL,
    "authorName"  VARCHAR(100) NOT NULL,
    "authorColor" VARCHAR(32) NOT NULL,
    "ipAddress"   VARCHAR(64) NOT NULL,
    "userAgent"   TEXT NOT NULL,
    "os"          VARCHAR(50),
    "browser"     VARCHAR(50),
    "screenRes"   VARCHAR(20),
    "timezone"    VARCHAR(100),
    "language"    VARCHAR(20),
    "cores"       INTEGER NOT NULL DEFAULT 0,
    "firstSeen"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserDevice_lastSeen_idx" ON "UserDevice"("lastSeen" DESC);
