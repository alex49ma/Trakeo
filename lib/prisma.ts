import { PrismaClient } from "@/generated/prisma/client";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("DATABASE_URL is not defined in production environment");
    }
}

const createPrismaClient = () => {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
};

const prisma = globalThis.prisma || createPrismaClient();

export const db = prisma;

if (process.env.NODE_ENV !== "production") {
    globalThis.prisma = db;
}