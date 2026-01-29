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

export async function updateCategory(id, data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const category = await db.category.update({
            where: { id },
            data: {
                name: data.name,
                type: data.type,
                color: data.color,
                icon: data.icon,
            }
        });

        revalidatePath("/dashboard");
        revalidatePath("/transaction/create");
        return { success: true, data: category };
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function deleteCategory(id) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const transactions = await db.transaction.findMany({
            where: { categoryId: id }
        });

        await db.$transaction(async (tx) => {
            for (const transaction of transactions) {
                const balanceChange = transaction.type === "EXPENSE" ? transaction.amount : -transaction.amount;
                await tx.account.update({
                    where: { id: transaction.accountId },
                    data: { balance: { increment: balanceChange } }
                });
            }
            await tx.category.delete({
                where: { id }
            });
        });

        revalidatePath("/dashboard");
        revalidatePath("/transaction/create");
        return { success: true };
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function updateSubcategory(id, data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const subCategory = await db.subcategory.update({
            where: { id },
            data: {
                name: data.name,
                // Usually we don't move subcategories between categories, but if needed:
                // category_id: data.categoryId 
            }
        });

        revalidatePath("/dashboard");
        revalidatePath("/transaction/create");
        return { success: true, data: subCategory };
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function deleteSubcategory(id) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const transactions = await db.transaction.findMany({
            where: { subcategoryId: id }
        });

        await db.$transaction(async (tx) => {
            for (const transaction of transactions) {
                const balanceChange = transaction.type === "EXPENSE" ? transaction.amount : -transaction.amount;
                await tx.account.update({
                    where: { id: transaction.accountId },
                    data: { balance: { increment: balanceChange } }
                });
            }
            await tx.subcategory.delete({
                where: { id }
            });
        });

        revalidatePath("/dashboard");
        revalidatePath("/transaction/create");
        return { success: true };
    } catch (error) {
        throw new Error(error.message);
    }
}
