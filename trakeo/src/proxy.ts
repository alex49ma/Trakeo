import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from "next-intl/middleware";

const intlMiddleware = createMiddleware({
  locales: ["en", "es"],
  defaultLocale: "en",
});

const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
    '/account(.*)',
    '/transaction(.*)',
    '/:locale/dashboard(.*)',
    '/:locale/account(.*)',
    '/:locale/transaction(.*)'
])

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();
    
    // Protect routes
    if (!userId && isProtectedRoute(req)) {
        const { redirectToSignIn } = await auth();
        return redirectToSignIn();
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