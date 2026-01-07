/*
  Warnings:

  - You are about to drop the column `icon_id` on the `categories` table. All the data in the column will be lost.
  - Added the required column `icon` to the `categories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "categories" DROP COLUMN "icon_id",
ADD COLUMN     "icon" TEXT NOT NULL;
