// Better Auth in the browser: sign-up, sign-in, sign-out and password reset call /api/auth through this client
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

/**
 * Runs one auth client call and adds retryAfter: the seconds to wait when the rate limit answered (HTTP 429), else null.
 * Usage: callAuth((fetchOptions) => authClient.signIn.email({ email, password, fetchOptions }))
 */
export async function callAuth(call) {
    let retryAfter = null;
    const result = await call({
        onError: (context) => {
            const seconds = Number(context.response?.headers.get("X-Retry-After"));
            retryAfter = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
        },
    });

    return { ...result, retryAfter };
}

const ERROR_CODE = /^[A-Za-z_]+$/;

/**
 * The text for a failed auth call or an ?error= code from an OAuth redirect. t is the "Auth" translator; codes
 * without their own text in Auth.errors get the generic one.
 */
export function authErrorMessage(t, error, retryAfter = null) {
    if (error?.status === 429) {
        return retryAfter ? t("errors.tooManyRequests", { seconds: retryAfter }) : t("errors.tooManyRequestsWait");
    }

    const code = typeof error === "string" ? error : error?.code;
    if (typeof code === "string" && ERROR_CODE.test(code) && t.has(`errors.${code}`)) return t(`errors.${code}`);

    return t("errors.generic");
}
