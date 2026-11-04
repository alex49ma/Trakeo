-- CreateTable
CREATE TABLE "import_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headerSignature" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "lastAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_profiles_lastAccountId_idx" ON "import_profiles"("lastAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "import_profiles_userId_headerSignature_key" ON "import_profiles"("userId", "headerSignature");

-- AddForeignKey
ALTER TABLE "import_profiles" ADD CONSTRAINT "import_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_profiles" ADD CONSTRAINT "import_profiles_lastAccountId_fkey" FOREIGN KEY ("lastAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

