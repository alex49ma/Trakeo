"use server";

import { db } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";
import { revalidatePath } from "next/cache";
import { isTransferCategory } from "@/lib/system-categories";

export async function getCategories() {
    const user = await checkUser();
    if (!user) throw new Error("Unauthorized");

    const categories = await db.category.findMany({
        where: { userId: user.id },
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
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");

        const category = await db.category.create({
            data: {
                name: data.name,
                type: data.type,
                color: data.color,
                userId: user.id,
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
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");

        const category = await db.category.findUnique({
            where: { id: data.categoryId, userId: user.id }
        });
        if (!category) throw new Error("Category not found");
        if (isTransferCategory(category)) throw new Error("Transfer categories can't have subcategories");

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
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");

        const existing = await db.category.findUnique({
            where: { id, userId: user.id }
        });
        if (!existing) throw new Error("Category not found");
        if (existing.systemKey) throw new Error("Built-in categories can't be changed");

        const category = await db.category.update({
            where: { id, userId: user.id },
            data: {
                name: data.name,
                type: data.type,
                color: data.color,
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
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");

        const category = await db.category.findUnique({
            where: { id, userId: user.id }
        });
        if (!category) throw new Error("Category not found");
        if (category.systemKey) throw new Error("Built-in categories can't be deleted");

        const transactions = await db.transaction.findMany({
            where: { categoryId: id, userId: user.id }
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
                where: { id, userId: user.id }
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
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");

        const subCategory = await db.subcategory.update({
            where: { id, category: { userId: user.id } },
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
        const user = await checkUser();
        if (!user) throw new Error("Unauthorized");

        const transactions = await db.transaction.findMany({
            where: { subcategoryId: id, userId: user.id }
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
                where: { id, category: { userId: user.id } }
            });
        });

        revalidatePath("/dashboard");
        revalidatePath("/transaction/create");
        return { success: true };
    } catch (error) {
        throw new Error(error.message);
    }
}
