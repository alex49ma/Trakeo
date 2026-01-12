"use server";

import { db } from "@/lib/prisma";

export async function getCategories() {
    const categories = await db.category.findMany({
        orderBy: {
            name: "asc",
        },
        include: {
            subCategories: true,
        },
    });

    return categories;
}
