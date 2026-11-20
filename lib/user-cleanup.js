// Removes sign-ups that were never finished. Server only
import { subDays } from "date-fns";
import { db } from "@/lib/prisma";

// Users with an unconfirmed email can't sign in, so after this long they're abandoned or fake sign-ups. The
// confirmation link lasts 24 hours and signing in sends a new one. Deleting them also frees the email: while the
// row exists, signing up with that address only emails the owner
export const UNVERIFIED_USER_MAX_AGE_DAYS = 3;

/**
 * Deletes users whose email is still unconfirmed UNVERIFIED_USER_MAX_AGE_DAYS after signing up. Their sessions,
 * sign-in methods and built-in categories go with them (foreign keys cascade). Users imported from Clerk and
 * users with bank accounts or transactions are never deleted here. Returns how many were deleted.
 */
export async function deleteUnverifiedUsers(now = new Date()) {
    const { count } = await db.user.deleteMany({
        where: {
            emailVerified: false,
            createdAt: { lt: subDays(now, UNVERIFIED_USER_MAX_AGE_DAYS) },
            clerkUserId: null,
            accounts: { none: {} },
            transactions: { none: {} },
        },
    });

    return count;
}
