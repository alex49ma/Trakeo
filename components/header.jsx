import { Link } from '@/i18n/navigation';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, SquarePlus, BarChart, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

import LanguageSwitcher from "@/components/language-switcher";
import NavLink from "@/components/nav-link";
import LandingNavLinks from "@/components/landing-nav-links";
import UserMenu from "@/components/user-menu";

import { getTranslations } from "next-intl/server";

const Header = async () => {
    const user = await getCurrentUser();
    const t = await getTranslations('Header');

    return (
        <header className="sticky top-0 w-full bg-white/80 backdrop-blur-xs z-50 border-b">
            <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
                {/* Below sm only the bag icon of the logo shows, so the header buttons fit on a phone */}
                <Link href="/" className="block w-8 overflow-hidden shrink-0 sm:w-auto">
                    <Image
                        src="/t_panel.png"
                        alt="Logo"
                        width={200}
                        height={70}
                        className="h-12 w-auto max-w-none -ml-[15px] object-contain sm:ml-0"
                    />
                </Link>

                <div className="flex items-center gap-1.5 sm:gap-4">
                    {!user && <LandingNavLinks />}
                    <LanguageSwitcher />
                    {user ? (
                        <>
                            <NavLink href="/dashboard" icon={<LayoutDashboard size={18} />} label={t('dashboard')} />
                            <NavLink href="/accounts" match={["/account"]} icon={<Wallet size={18} />} label={t('accounts')} />
                            <NavLink href="/transaction/create" icon={<SquarePlus size={18} />} label={t('addTransaction')} />
                            <NavLink href="/analytics" icon={<BarChart size={18} />} label={t('analytics')} />
                            <UserMenu user={{ name: user.name, email: user.email, image: user.image }} />
                        </>
                    ) : (
                        <Button asChild variant="outline">
                            <Link href="/sign-in">{t('login')}</Link>
                        </Button>
                    )}
                </div>
            </nav>
        </header>
    )
}

export default Header
