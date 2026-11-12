"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { authClient, authErrorMessage, callAuth } from "@/lib/auth-client";

function GoogleLogo() {
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true" className="size-4">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
        </svg>
    );
}

/**
 * Signs in or signs up with Google, then lands on redirectTo (a path without the locale). A failure at Google or
 * while linking comes back to the sign-in page as ?error=<code>. onError gets the text of a failure before leaving.
 */
export default function GoogleButton({ redirectTo, onError }) {
    const t = useTranslations("Auth");
    const locale = useLocale();
    const [loading, setLoading] = useState(false);

    const signIn = async () => {
        setLoading(true);
        onError?.(null);

        const { error, retryAfter } = await callAuth((fetchOptions) =>
            authClient.signIn.social({
                provider: "google",
                callbackURL: `/${locale}${redirectTo}`,
                errorCallbackURL: `/${locale}/sign-in`,
                // Becomes the new user's language for emails (lib/better-auth.js)
                additionalData: { locale },
                fetchOptions,
            })
        );

        // On success the browser is already on its way to Google, so the button stays busy
        if (error) {
            setLoading(false);
            onError?.(authErrorMessage(t, error, retryAfter));
        }
    };

    return (
        <Button type="button" variant="outline" className="h-10 w-full" onClick={signIn} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <GoogleLogo />}
            {t("google")}
        </Button>
    );
}

// The line between the Google button and the email form
export function OrDivider() {
    const t = useTranslations("Auth");

    return (
        <div className="my-5 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
        </div>
    );
}
