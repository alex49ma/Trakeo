"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

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

export async function createCategory(data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const category = await db.category.create({
            data: {
                name: data.name,
                type: data.type,
                color: data.color,
                icon: data.icon,
            }
        });

        revalidatePath("/dashboard");
        revalidatePath("/transaction/create");
        // Also revalidate the route where the transaction form might be used with edit mode or just the main list
        // Assuming we might want to revalidate paths where categories are used. 

        return { success: true, data: category };
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function createSubcategory(data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const subCategory = await db.subcategory.create({
            data: {
                name: data.name,
                category_id: data.categoryId,
            }
        });

        revalidatePath("/dashboard");
        revalidatePath("/transaction/create");

        return { success: true, data: subCategory };
    } catch (error) {
        throw new Error(error.message);
    }
}
