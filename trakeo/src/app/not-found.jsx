import Link from "next/link";
import { Button } from "@/components/ui/button";

const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-4xl text-orange-400 font-bold pb-4">404</h1>
            <h2 className="text-2xl font-bold pb-4">Page not found</h2>
            <p className="text-xl text-gray-600 font-bold pb-4">Oops! Seems like the page you are looking for doesn't exist</p>
            <Link href="/">
                <Button>Return Home</Button>
            </Link>
        </div>
    )
}

export default NotFound