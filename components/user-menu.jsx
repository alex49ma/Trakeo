"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

function initials(name, email) {
    const words = (name || "").trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return (email || "?").charAt(0).toUpperCase();
    return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("");
}

// The header's avatar and its menu (replaces Clerk's UserButton). user: { name, email, image } from the server.
// useSession() asks /api/auth/get-session on load and when the tab regains focus: that request is also what renews
// the session, because server renders never do (lib/auth.js)
export default function UserMenu({ user: initialUser }) {
    const t = useTranslations("UserMenu");
    const router = useRouter();
    const { data } = authClient.useSession();
    const [signingOut, setSigningOut] = useState(false);

    const user = data?.user ?? initialUser;

    const signOut = async (event) => {
        // Keeps the menu open with the spinner until the request is done
        event.preventDefault();
        setSigningOut(true);
        await authClient.signOut();
        router.replace("/");
        router.refresh();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={t("label")}
                className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-orange-200 bg-orange-100 text-sm font-semibold text-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
            >
                {user.image ? (
                    // A Google picture: a plain img, because next/image would need Google's host in next.config
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                ) : (
                    initials(user.name, user.email)
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                    <div className="truncate text-sm font-medium">{user.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} disabled={signingOut}>
                    {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
                    {signingOut ? t("signingOut") : t("signOut")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
