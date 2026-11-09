ALTER TABLE "User" ADD COLUMN "avatarKey" TEXT,
ADD COLUMN "avatarVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AvatarFile" (
  "key" TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AvatarFile_expiresAt_idx" ON "AvatarFile"("expiresAt");
