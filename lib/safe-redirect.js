// Where to go after signing in (D23 in ../SDD/better-auth-migration/). The value comes from the URL (?redirect=),
// so it's only accepted as a path inside the app, written without the locale like every href: "/transaction/create"
const ORIGIN = "http://trakeo.invalid";

export const DEFAULT_REDIRECT = "/dashboard";

export function safeRedirect(value, fallback = DEFAULT_REDIRECT) {
    if (typeof value !== "string" || !value.startsWith("/")) return fallback;
    // "//host" and "/\host" are other sites to a browser
    if (value.startsWith("//") || value.includes("\\")) return fallback;

    try {
        const url = new URL(value, ORIGIN);
        if (url.origin !== ORIGIN) return fallback;

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return fallback;
    }
}
