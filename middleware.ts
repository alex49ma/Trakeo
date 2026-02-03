import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import createIntlMiddleware from "next-intl/middleware";
import arcjet, { createMiddleware, detectBot, shield } from '@arcjet/next';

const aj = arcjet({
    key: process.env.ARCJET_KEY,
    rules: [
        shield({
            mode: 'LIVE'
        }),
        detectBot({
            mode: "LIVE",
            allow: [
                "CATEGORY:SEARCH_ENGINE", "GO_HTTP"
            ]
        })
    ],
})
const intlMiddleware = createIntlMiddleware({
    locales: ['en', 'es', 'de', 'cs'],
    defaultLocale: 'en',
});
const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
    '/account(.*)',
    '/transaction(.*)',
    '/analytics(.*)',
    '/:locale/dashboard(.*)',
    '/:locale/account(.*)',
    '/:locale/transaction(.*)',
    '/:locale/analytics(.*)'
])
const clerk = clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
        await auth.protect();
    }
    if (req.nextUrl.pathname.startsWith('/api') || req.nextUrl.pathname.startsWith('/trpc')) {
        return NextResponse.next();
    }
    return intlMiddleware(req);
});
export default createMiddleware(aj, clerk);
export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};