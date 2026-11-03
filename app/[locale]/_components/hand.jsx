import { cn } from "@/lib/utils";

// Hand-drawn strokes, each in its own viewBox (width x height)
const ARROWS = {
    // Curls back up and left, to something above it (Day 0)
    left: { width: 70, height: 40, paths: ["M66 30 C 48 34, 26 26, 6 12", "M6 12 L 22 12", "M6 12 L 12 27"] },
    // Drops down and left (Day 6)
    "down-left": { width: 90, height: 50, paths: ["M60 4 C 50 26, 32 38, 6 40", "M6 40 L 20 30", "M6 40 L 20 48"] },
    // A shorter down-left (Day 30)
    "down-left-short": { width: 80, height: 44, paths: ["M50 4 C 44 24, 30 34, 6 36", "M6 36 L 18 26", "M6 36 L 19 42"] },
    // A long curve down to the left (the "spoiler" note)
    curve: { width: 120, height: 110, paths: ["M100 4 C 92 40, 60 70, 14 96", "M14 96 L 30 80", "M14 96 L 34 100"] },
    // A wide sweep to the left (the final call to action)
    swoop: { width: 150, height: 70, paths: ["M140 10 C 110 50, 60 64, 8 56", "M8 56 L 24 44", "M8 56 L 24 66"] },
    check: { width: 34, height: 30, strokeWidth: 3, paths: ["M3 16 C 7 19, 10 23, 12 26 C 17 16, 23 8, 31 3"] },
    // A loop around something. It stretches to whatever size its className gives it, keeping the stroke width
    ellipse: {
        width: 480,
        height: 70,
        stretch: true,
        paths: ["M30 12 C 140 2, 360 0, 452 14 C 478 22, 474 50, 440 58 C 330 70, 120 70, 34 60 C 4 54, 6 22, 46 10"],
    },
};

// Decorative, so screen readers skip it. It strokes in currentColor
export function HandArrow({ variant, className }) {
    const { width, height, paths, strokeWidth = 2.5, stretch = false } = ARROWS[variant];

    return (
        <svg
            aria-hidden="true"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio={stretch ? "none" : undefined}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {paths.map((d) => (
                <path key={d} d={d} vectorEffect={stretch ? "non-scaling-stroke" : undefined} />
            ))}
        </svg>
    );
}

const TONES = {
    light: { text: "text-orange-900", arrow: "text-orange-700" },
    // On the dark call-to-action block
    dark: { text: "text-orange-200", arrow: "text-orange-300" },
};

// Handwritten text. A "\n" in the message starts a new line. The line height goes last: tailwind-merge drops a
// leading-* that comes before a text size, and every caller sets one
export function HandText({ as: Tag = "div", tone = "light", className, children }) {
    return (
        <Tag className={cn("font-hand whitespace-pre-line", TONES[tone].text, className, "leading-[1.2]")}>
            {children}
        </Tag>
    );
}

// Full class names, so Tailwind generates them
const SHOW_FROM = {
    md: { block: "md:block", flex: "md:flex" },
    lg: { block: "lg:block", flex: "lg:flex" },
    xl: { block: "xl:block", flex: "xl:flex" },
};

// A handwritten note in the margin, with an optional arrow before or after the text. className positions it inside
// the nearest positioned ancestor. Notes are hidden below md, and `from` delays one that needs more room to lg or xl.
// They never catch the pointer, and sit above the cards (z-10)
export function HandNote({
    children,
    arrow,
    arrowFirst = false,
    from = "md",
    layout = "block",
    tone = "light",
    className,
    textClassName,
    arrowClassName,
}) {
    const arrowSvg = arrow && <HandArrow variant={arrow} className={cn(TONES[tone].arrow, arrowClassName)} />;

    return (
        <div className={cn("pointer-events-none absolute z-20 hidden", SHOW_FROM[from][layout], className)}>
            {arrowFirst && arrowSvg}
            <HandText tone={tone} className={textClassName}>
                {children}
            </HandText>
            {!arrowFirst && arrowSvg}
        </div>
    );
}
