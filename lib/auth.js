// Who is signed in. Server actions and pages ask here and work with user.id; nothing else reads Better Auth's
// session on the server (the config is in lib/better-auth.js, the browser side in lib/auth-client.js).
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth";

// One lookup per request, however many actions and components ask.
// disableRefresh: a page render can't set cookies, so the server never renews a session. The browser does, through
// /api/auth/get-session (components/user-menu.jsx), which keeps the session row and its cookie in step.
const getSession = cache(async () =>
    auth.api.getSession({ headers: await headers(), query: { disableRefresh: true } })
);

/**
 * The signed-in user: id, name, email, emailVerified, image and locale. Throws "Unauthorized" when nobody is signed
 * in. For server actions and pages that need a user. The user comes from the session, which a signed cookie caches
 * for up to 5 minutes, so query the users table for anything that must be fresh.
 */
export async function requireUser() {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    return session.user;
}

// The signed-in user, or null when nobody is signed in. For optional users
export async function getCurrentUser() {
    const session = await getSession();

    return session?.user ?? null;
}
