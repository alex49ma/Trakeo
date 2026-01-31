import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import createMiddleware from "next-intl/middleware";

import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware({
    locales: routing.locales,
    defaultLocale: routing.defaultLocale,
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

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();

    // Protect routes
    if (!userId && isProtectedRoute(req)) {
        const { redirectToSignIn } = await auth();
        return redirectToSignIn();
    }

    // Exclude API and TRPC routes from intlMiddleware
    if (req.nextUrl.pathname.startsWith('/api') || req.nextUrl.pathname.startsWith('/trpc')) {
        return NextResponse.next();
    }

    return intlMiddleware(req);
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};