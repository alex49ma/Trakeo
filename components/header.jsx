import { SignedIn, SignedOut } from "@clerk/nextjs";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Link } from '@/i18n/navigation';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, SquarePlus, BarChart, Wallet } from "lucide-react";
import { checkUser } from "@/lib/checkUser";

import LanguageSwitcher from "@/components/language-switcher";
import NavLink from "@/components/nav-link";

import { getTranslations } from "next-intl/server";

const Header = async () => {
    await checkUser()
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
                    <LanguageSwitcher />
                    <SignedIn>
                        <NavLink href="/dashboard" icon={<LayoutDashboard size={18} />} label={t('dashboard')} />
                        <NavLink href="/accounts" match={["/account"]} icon={<Wallet size={18} />} label={t('accounts')} />
                        <NavLink href="/transaction/create" icon={<SquarePlus size={18} />} label={t('addTransaction')} />
                        <NavLink href="/analytics" icon={<BarChart size={18} />} label={t('analytics')} />
                    </SignedIn>
                    <SignedOut>
                        <SignInButton forceRedirectUrl="/dashboard">
                            <Button variant="outline">{t('login')}</Button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "w-10 h-10",
                                },
                            }}
                        />
                    </SignedIn>
                </div>
            </nav>
        </header>
    )
}

export default Header