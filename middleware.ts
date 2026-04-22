import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import createIntlMiddleware from "next-intl/middleware";
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware({
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
const clerk = clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
        await auth.protect();
    }
    if (req.nextUrl.pathname.startsWith('/api') || req.nextUrl.pathname.startsWith('/trpc')) {
        return NextResponse.next();
    }
    return intlMiddleware(req);
});
export default clerk;
export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};