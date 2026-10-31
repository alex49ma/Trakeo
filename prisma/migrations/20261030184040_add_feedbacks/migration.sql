-- The feedbacks table was first created by hand in Supabase. This migration lets a reset rebuild it.

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" BIGSERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep the row-level security the hand-made table had. Prisma connects as the table owner, which RLS doesn't restrict.
ALTER TABLE "feedbacks" ENABLE ROW LEVEL SECURITY;
