// A paper texture over the whole landing page. The noise is drawn once on a 240px tile and repeated, which is much
// cheaper than filtering the full page height (stitchTiles makes the tile's edges meet without a seam).
// Stacking: the FinisherHeader canvas is at z-index -1 and this is at 1, so the texture covers the background and the
// light bands. Sections, cards and timeline dots use z-10 and the handwritten notes z-20, which keeps them above it
export default function PaperGrain() {
    return (
        <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-[0.09] mix-blend-multiply"
        >
            <defs>
                <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
                    <feColorMatrix type="saturate" values="0" />
                </filter>
                <pattern id="paper-grain-tile" width="240" height="240" patternUnits="userSpaceOnUse">
                    <rect width="240" height="240" filter="url(#paper-grain)" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#paper-grain-tile)" />
        </svg>
    );
}
