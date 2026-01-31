"use server";

import { db } from "@/lib/prisma";
import { subDays } from "date-fns";
import { defaultCategories } from "@/data/categories";

const ACCOUNT_ID = "5b263bf6-a472-48e8-b3f2-317dfa75b905"; //My first account
const USER_ID = "3215ab6a-35a4-4a94-b8e2-f5b6120c9066";

// Amount ranges mapped to category IDs
const CATEGORY_RANGES = {
  salary: [2150, 2300],
  donation: [10, 100],
  investments: [10, 30],
  "other-income": [1, 50],
  housing: [50, 100],
  transportation: [1, 100],
  groceries: [10, 50],
  utilities: [10, 50],
  entertainment: [10, 50],
  food: [10, 50],
  shopping: [10, 50],
  healthcare: [10, 50],
  education: [10, 50],
  travel: [10, 50],
};

// Helper to generate random amount within a range
function getRandomAmount(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

export async function seedTransactions() {
  try {
    console.log("Starting seeding process...");

    // 1. Clean up existing data
    await db.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { accountId: ACCOUNT_ID } });
      await tx.subcategory.deleteMany({});
      await tx.category.deleteMany({});
    });

    console.log("Cleaned up existing data.");

    // 2. Seed Categories and Subcategories
    const categoryMap = new Map();
    const subcategoryMap = new Map();

    for (const cat of defaultCategories) {
      const createdCategory = await db.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          color: cat.color,
          userId: USER_ID,
        },
      });

      categoryMap.set(cat.id, createdCategory);

      if (cat.subcategories && cat.subcategories.length > 0) {
        const subs = [];
        for (const subName of cat.subcategories) {
          const createdSub = await db.subcategory.create({
            data: {
              name: subName,
              category_id: createdCategory.id,
            },
          });
          subs.push(createdSub);
        }
        subcategoryMap.set(cat.id, subs);
      }
    }

    console.log("Seeded categories and subcategories.");

    // 3. Generate Transactions
    const transactions = [];
    let totalBalance = 0;

    const incomeCategories = defaultCategories.filter(c => c.type === "INCOME");
    const expenseCategories = defaultCategories.filter(c => c.type === "EXPENSE");

    for (let i = 90; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const transactionsPerDay = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < transactionsPerDay; j++) {
        const type = Math.random() < 0.4 ? "INCOME" : "EXPENSE";
        const pool = type === "INCOME" ? incomeCategories : expenseCategories;
        const categoryData = pool[Math.floor(Math.random() * pool.length)];

        const createdCategory = categoryMap.get(categoryData.id);
        const subcategories = subcategoryMap.get(categoryData.id);
        const selectedSub = subcategories ? subcategories[Math.floor(Math.random() * subcategories.length)] : null;

        const range = CATEGORY_RANGES[categoryData.id] || [10, 100];
        const amount = getRandomAmount(range[0], range[1]);

        const transaction = {
          id: crypto.randomUUID(),
          type,
          amount,
          description: `${type === "INCOME" ? "Received" : "Paid for"} ${selectedSub ? selectedSub.name : createdCategory.name}`,
          date,
          status: "COMPLETED",
          userId: USER_ID,
          accountId: ACCOUNT_ID,
          categoryId: createdCategory.id,
          subcategoryId: selectedSub ? selectedSub.id : null,
          createdAt: date,
          updatedAt: date,
        };

        totalBalance += type === "INCOME" ? amount : -amount;
        transactions.push(transaction);
      }
    }

    // 4. Insert Transactions and Update Balance
    await db.$transaction(async (tx) => {
      await tx.transaction.createMany({
        data: transactions,
      });

      await tx.account.update({
        where: { id: ACCOUNT_ID },
        data: { balance: totalBalance },
      });
    });

    console.log(`Seeding completed. Created ${transactions.length} transactions.`);

    return {
      success: true,
      message: `Created ${transactions.length} transactions`,
    };
  } catch (error) {
    console.error("Error seeding transactions:", error);
    return { success: false, error: error.message };
  }
}
