// The only server-side module that talks to the auth provider (Clerk). Everything else asks it for the database
// user and works with user.id, so a provider change stays inside this file, the middleware and the auth UI.
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { SYSTEM_CATEGORIES } from "@/lib/system-categories";

// The provider's id for the signed-in user, or null
async function getAuthUserId() {
    const { userId } = await auth();
    return userId ?? null;
}

function findUserByAuthId(authUserId) {
    return db.user.findUnique({ where: { clerkUserId: authUserId } });
}

/**
 * The signed-in user's database row. Throws "Unauthorized" when nobody is signed in and "User not found" when the
 * row doesn't exist yet. For server actions and pages that need a user.
 */
export async function requireUser() {
    const authUserId = await getAuthUserId();
    if (!authUserId) throw new Error("Unauthorized");

    const user = await findUserByAuthId(authUserId);
    if (!user) throw new Error("User not found");

    return user;
}

// The signed-in user's database row, or null when nobody is signed in or the row doesn't exist. For optional users
export async function getCurrentUser() {
    const authUserId = await getAuthUserId();
    if (!authUserId) return null;

    return findUserByAuthId(authUserId);
}

/**
 * Like getCurrentUser, but creates the row, with the built-in categories, on the user's first visit. Called from
 * the Header on every render. The provider's profile (name, email, image) is only fetched when the row is missing.
 * Returns null when nobody is signed in or something fails.
 */
export async function ensureUser() {
    let authUserId;
    try {
        authUserId = await getAuthUserId();
    } catch (error) {
        console.error("ensureUser: error reading the session (likely middleware missing):", error);
        return null;
    }
    if (!authUserId) return null;

    try {
        const existing = await findUserByAuthId(authUserId);
        if (existing) return existing;

        const profile = await currentUser();
        if (!profile) return null;

        return await db.user.create({
            data: {
                clerkUserId: authUserId,
                name: profile.firstName + " " + profile.lastName,
                imageUrl: profile.imageUrl,
                email: profile.emailAddresses[0].emailAddress,
                // The two defaults plus the three transfer categories, all locked
                categories: {
                    create: SYSTEM_CATEGORIES
                }
            }
        });
    } catch (error) {
        console.error("Error checking user:", error);
        return null;
    }
}
