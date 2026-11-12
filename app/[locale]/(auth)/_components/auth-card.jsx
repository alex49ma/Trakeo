import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// The frame every auth page shares: a title, an optional subtitle, then the form or the message
export default function AuthCard({ title, subtitle, children }) {
    return (
        <Card className="w-full max-w-md gap-0 p-6 sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-6">{children}</div>
        </Card>
    );
}

// A message above or below a form: an error (announced to screen readers right away) or a confirmation
export function FormMessage({ tone = "error", className, children }) {
    if (!children) return null;

    return (
        <p
            role={tone === "error" ? "alert" : "status"}
            className={cn(
                "rounded-md border px-3 py-2 text-sm",
                tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800",
                className
            )}
        >
            {children}
        </p>
    );
}

// A labelled input with its validation message. error is the already translated text
export function Field({ id, label, error, hint, children }) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>
            {children}
            {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
