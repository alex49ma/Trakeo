// Better Auth: sign-up, sign-in, sessions, email verification, password reset and Google. Server only.
// Every choice here has a decision ID in ../SDD/better-auth-migration/better-auth-migration-plan.md (section 2).
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { hash, verify } from "@/lib/password";
import { createSystemCategories } from "@/lib/user-setup";
import { sendInBackground } from "@/lib/email/send";
import { passwordChangedEmail, resetPasswordEmail, verificationEmail } from "@/lib/email/templates";

const baseURL = process.env.BETTER_AUTH_URL;

// Preview deployments run on their own *.vercel.app address
const trustedOrigins = [
    baseURL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
].filter(Boolean);

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// D17: the sign-up form sends the page's locale. Google sign-ups fall back to next-intl's NEXT_LOCALE cookie
function resolveLocale(requested, ctx) {
    const candidates = [requested, ctx?.getCookie?.("NEXT_LOCALE")];
    return candidates.find((locale) => routing.locales.includes(locale)) ?? routing.defaultLocale;
}

export const auth = betterAuth({
    appName: "Trakeo",
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins,

    database: prismaAdapter(db, { provider: "postgresql" }),
    advanced: {
        // D8: Better Auth leaves ids out and Prisma's @default(uuid()) fills them, as for every other table
        database: { generateId: "uuid" },
        // 5.5: Vercel overwrites these with the client's real IP, so they can't be spoofed
        ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"] },
    },

    // D7: our users table is Better Auth's user
    user: {
        fields: { image: "imageUrl" },
        additionalFields: {
            locale: { type: "string", required: false, defaultValue: routing.defaultLocale, input: true },
        },
    },
    // D9: Account already means a bank account
    account: {
        modelName: "authAccount",
        // D26: we only use Google for identity, but whatever it returns is stored encrypted
        encryptOAuthTokens: true,
        // D19: a Google sign-in with the verified email of an existing user links to that user
        accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    // D12: a signed cookie caches the session for 5 minutes, so most requests skip the sessions query
    session: {
        expiresIn: 7 * DAY,
        updateAge: DAY,
        cookieCache: { enabled: true, maxAge: 5 * MINUTE },
    },

    // D2, D5, D16
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        password: { hash, verify },
        resetPasswordTokenExpiresIn: HOUR,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }) => {
            sendInBackground(await resetPasswordEmail({ user, url }));
        },
        onPasswordReset: async ({ user }) => {
            const url = `${baseURL}/${resolveLocale(user.locale)}/forgot-password`;
            sendInBackground(await passwordChangedEmail({ user, url }));
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        // An unverified user who tries to sign in gets the email again
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        expiresIn: DAY,
        sendVerificationEmail: async ({ user, url }) => {
            sendInBackground(await verificationEmail({ user, url }));
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account",
        },
    },

    databaseHooks: {
        user: {
            create: {
                before: async (user, ctx) => ({ data: { ...user, locale: resolveLocale(user.locale, ctx) } }),
                // D20: replaces ensureUser(). Not inside Better Auth's insert, so it must be safe to repeat
                after: async (user) => {
                    await createSystemCategories(user.id);
                },
            },
        },
    },

    // D15: counters in the database, because each serverless instance has its own memory. On in production only
    rateLimit: {
        storage: "database",
        customRules: {
            "/sign-in/email": { window: 10, max: 3 },
            "/sign-up/email": { window: MINUTE, max: 3 },
            "/request-password-reset": { window: MINUTE, max: 3 },
            "/send-verification-email": { window: MINUTE, max: 3 },
        },
    },

    // Must stay last: lets server actions set Better Auth's cookies
    plugins: [nextCookies()],
});
