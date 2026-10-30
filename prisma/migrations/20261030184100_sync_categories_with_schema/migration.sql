-- The live categories table gained userId and lost icon outside migrations. This brings the history in line with the schema.

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "icon",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
