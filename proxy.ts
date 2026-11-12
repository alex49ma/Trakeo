import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from "next-intl/middleware";
import { getSessionCookie } from 'better-auth/cookies';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware({
    locales: routing.locales,
    defaultLocale: routing.defaultLocale,
});

// Pages that need a signed-in user: each path and everything under it, written without the locale.
// A new protected page must be added here
const PROTECTED_PATHS = ['/dashboard', '/account', '/accounts', '/transaction', '/analytics', '/settings'];

const isProtected = (path: string) => PROTECTED_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

// Only redirects: it checks that a session cookie exists, not that the session is valid. The real check is
// requireUser() in every action and getCurrentUser() in the (main) layout
export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    if (pathname.startsWith('/api') || pathname.startsWith('/trpc')) {
        return NextResponse.next();
    }

    // A path without a locale goes to next-intl first, which redirects to the one with it
    const [, locale, ...rest] = pathname.split('/');
    if ((routing.locales as readonly string[]).includes(locale)) {
        const path = `/${rest.join('/')}`;

        if (isProtected(path) && !getSessionCookie(request)) {
            const signIn = new URL(`/${locale}/sign-in`, request.url);
            signIn.searchParams.set('redirect', `${path}${search}`);
            return NextResponse.redirect(signIn);
        }
    }

    return intlMiddleware(request);
}

export const config = {
    matcher: [
        '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
