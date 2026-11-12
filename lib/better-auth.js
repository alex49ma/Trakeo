// Better Auth: sign-up, sign-in, sessions, email verification, password reset and Google. Server only.
// Every choice here has a decision ID in ../SDD/better-auth-migration/better-auth-migration-plan.md (section 2).
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getOAuthState } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { hash, verify } from "@/lib/password";
import { createSystemCategories } from "@/lib/user-setup";
import { sendInBackground } from "@/lib/email/send";
import {
    existingAccountEmail,
    passwordChangedEmail,
    resetPasswordEmail,
    verificationEmail,
} from "@/lib/email/templates";

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

// The first of the candidates that is one of our locales, else the default
function resolveLocale(...candidates) {
    return candidates.find((locale) => routing.locales.includes(locale)) ?? routing.defaultLocale;
}

// D17: the locale of the page a new user signed up on. The sign-up form sends it as a field, and the Google button
// as additionalData, which travels in the OAuth state. Both come from the browser, so resolveLocale checks them
async function signUpLocale(user, ctx) {
    let oauthLocale;
    try {
        oauthLocale = (await getOAuthState())?.locale;
    } catch {
        // Not inside a request (a script creating a user)
    }

    return resolveLocale(oauthLocale, user.locale, ctx?.getCookie?.("NEXT_LOCALE"));
}

// Email links come back to our own pages, in the user's language, whatever the browser asked for:
// /verify-email signs in and goes on to the dashboard, /reset-password asks for the new password,
// and both explain a link that expired
function withCallback(url, user, page) {
    const link = new URL(url);
    link.searchParams.set("callbackURL", `/${resolveLocale(user.locale)}/${page}`);

    return link.toString();
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
            sendInBackground(await resetPasswordEmail({ user, url: withCallback(url, user, "reset-password") }));
        },
        onPasswordReset: async ({ user }) => {
            const url = `${baseURL}/${resolveLocale(user.locale)}/forgot-password`;
            sendInBackground(await passwordChangedEmail({ user, url }));
        },
        // Signing up with an email that already has an account answers like a new sign-up, so nobody can test
        // which emails are registered. The owner of the address gets this email instead of a confirmation link
        onExistingUserSignUp: async ({ user }) => {
            const url = `${baseURL}/${resolveLocale(user.locale)}/sign-in`;
            sendInBackground(await existingAccountEmail({ user, url }));
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        // An unverified user who tries to sign in gets the email again
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        expiresIn: DAY,
        sendVerificationEmail: async ({ user, url }) => {
            sendInBackground(await verificationEmail({ user, url: withCallback(url, user, "verify-email") }));
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
                before: async (user, ctx) => ({ data: { ...user, locale: await signUpLocale(user, ctx) } }),
                // D20: users are created here, at sign-up. Not inside Better Auth's insert, so it must be safe to repeat
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

    // Where Google sign-in failures go when the button didn't say (it sends errorCallbackURL). Without the locale,
    // next-intl adds the visitor's own and keeps the ?error=<code> the sign-in page explains
    onAPIError: { errorURL: "/sign-in" },

    // Must stay last: lets server actions set Better Auth's cookies
    plugins: [nextCookies()],
});
