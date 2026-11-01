"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A header button that's highlighted on its own page and the pages under it. `match` lists extra path prefixes
// that count as this page (the accounts button also covers /account/<id>). The icon stays visible below md
const NavLink = ({ href, icon, label, match = [] }) => {
    const pathname = usePathname();
    const active = [href, ...match].some((path) => pathname === path || pathname.startsWith(`${path}/`));

    return (
        <Button
            asChild
            variant="prominent"
            className={cn(
                "has-[>svg]:px-2.5 md:has-[>svg]:px-3",
                // The prominent variant paints its white background on ::before, so the tint goes there too
                active && "before:bg-orange-50 border-orange-300 text-orange-800"
            )}
        >
            <Link href={href} aria-current={active ? "page" : undefined} aria-label={label}>
                {icon}
                <span className="hidden md:inline">{label}</span>
            </Link>
        </Button>
    );
};

export default NavLink;
