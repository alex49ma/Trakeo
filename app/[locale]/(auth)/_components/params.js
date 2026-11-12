import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";

// A search param as one string: absent and repeated (?a=1&a=2) values both become null
export function param(searchParams, name) {
    const value = searchParams?.[name];
    return typeof value === "string" ? value : null;
}

// Sign-in and sign-up have nothing to show a signed-in user. This checks the real session (unlike the proxy's
// cookie check), so a stale cookie can't bounce between here and the dashboard
export async function redirectIfSignedIn(to) {
    if (await getCurrentUser()) redirect({ href: to, locale: await getLocale() });
}
