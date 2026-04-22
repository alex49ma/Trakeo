import { SignedIn, SignedOut } from "@clerk/nextjs";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Link } from '@/i18n/navigation';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, SquarePlus, BarChart } from "lucide-react";
import { checkUser } from "@/lib/checkUser";

import LanguageSwitcher from "@/components/language-switcher";

import { getTranslations } from "next-intl/server";

const Header = async () => {
    await checkUser()
    const t = await getTranslations('Header');

    return (
        <header className="sticky top-0 w-full bg-white/80 backdrop-blur-xs z-50 border-b">
            <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/">
                    <Image
                        src="/t_panel.png"
                        alt="Logo"
                        width={200}
                        height={70}
                        className="h-12 w-auto object-contain"
                    />
                </Link>

                <div className="flex items-center space-x-4">
                    <LanguageSwitcher />
                    <SignedIn>
                        <Link
                            href="/dashboard"
                            className="text-gray-600 hover:text-red-600 flex items-center gap-2"
                        >
                            <Button variant="prominent">
                                <LayoutDashboard size={18} />
                                <span className="hidden md:inline">{t('dashboard')}</span>
                            </Button>
                        </Link>
                        <Link
                            href="/transaction/create"
                            className="text-gray-600 hover:text-red-600 flex items-center gap-2"
                        >
                            <Button variant="prominent">
                                <SquarePlus size={18} />
                                <span className="hidden md:inline">{t('addTransaction')}</span>
                            </Button>
                        </Link>
                        <Link
                            href="/analytics"
                            className="text-gray-600 hover:text-red-600 flex items-center gap-2"
                        >
                            <Button variant="prominent">
                                <BarChart size={18} />
                                <span className="hidden md:inline">{t('analytics')}</span>
                            </Button>
                        </Link>
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