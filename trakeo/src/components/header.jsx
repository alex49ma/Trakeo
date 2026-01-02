import { SignedIn, SignedOut } from "@clerk/nextjs";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, PenBox } from "lucide-react";
import { checkUser } from "@/lib/checkUser";

const Header = async () => {
    await checkUser()

    return (
        <header className="fixed top-0 w-full bg-white/80 backdrop-blur-xs z-50 border-b">
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
                    <SignedIn>
                        <Link
                            href="/dashboard"
                            className="text-gray-600 hover:text-red-600 flex items-center gap-2"
                        >
                            <Button variant="outline"
                                className="group relative w-full h-full overflow-hidden bg-white">
                                <div className="absolute inset-0 bg-gradient-to-t from-orange-300 to-white to-80% translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                <LayoutDashboard size={18} className="relative z-10" />
                                <span className="hidden md:inline relative z-10">Dashboard</span>
                            </Button>
                        </Link>
                        <Link
                            href="/transaction/create"
                            className="text-gray-600 hover:text-red-600 flex items-center gap-2"
                        >
                            <Button variant="outline"
                                className="group relative w-full h-full overflow-hidden bg-white">
                                <div className="absolute inset-0 bg-gradient-to-t from-orange-300 to-white to-80% translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                <PenBox size={18} className="relative z-10" />
                                <span className="hidden md:inline relative z-10">Add Transaction</span>
                            </Button>
                        </Link>
                    </SignedIn>
                    <SignedOut>
                        <SignInButton forceRedirectUrl="/dashboard">
                            <Button variant="outline">Login</Button>
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