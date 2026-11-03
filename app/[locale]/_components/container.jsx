import { cn } from "@/lib/utils";

// The landing page's content column: 1280px wide at most, with 32px gutters (16px on phones)
export default function Container({ className, children }) {
    return <div className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-8", className)}>{children}</div>;
}
