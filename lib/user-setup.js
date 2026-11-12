// What every new user gets (D20 in ../SDD/better-auth-migration/). Server only: lib/system-categories.js stays
// free of database imports because client components use it too
import { db } from "@/lib/prisma";
import { SYSTEM_CATEGORIES } from "@/lib/system-categories";

/**
 * Creates the five built-in categories. Safe to run again: the unique (userId, systemKey) skips the ones that exist.
 */
export function createSystemCategories(userId, client = db) {
    return client.category.createMany({
        data: SYSTEM_CATEGORIES.map((category) => ({ ...category, userId })),
        skipDuplicates: true,
    });
}
