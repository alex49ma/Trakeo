import { cn } from "@/lib/utils";

// A donut chart drawn with one circle per slice. The radius gives a circumference of ~100, so each slice's dash is
// its percentage. Decorative: the legend next to it says the same in text.
// slices: [{ key, percent, stroke }], where stroke is a Tailwind stroke-* class
export function Donut({ slices, size, className }) {
    return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 42 42" className={cn("shrink-0", className)}>
            {slices.map(({ key, percent, stroke }, index) => {
                const before = slices.slice(0, index).reduce((sum, slice) => sum + slice.percent, 0);

                return (
                    <circle
                        key={key}
                        cx="21"
                        cy="21"
                        r="15.9"
                        fill="none"
                        strokeWidth="7"
                        strokeDasharray={`${percent} ${100 - percent}`}
                        // 25 moves the start to 12 o'clock; each slice then starts where the previous one ended
                        strokeDashoffset={(125 - before) % 100}
                        className={stroke}
                    />
                );
            })}
        </svg>
    );
}

// The colored square in front of a legend entry
export function Swatch({ className }) {
    return <span aria-hidden="true" className={cn("inline-block size-[0.7em] shrink-0 rounded-[2px]", className)} />;
}
