"use client";
import { useEffect, useRef } from 'react';
import Script from 'next/script';

export default function FinisherBackground({
    config,
    className = "",
    children,
    ...props
}) {
    const initialized = useRef(false);
    const containerRef = useRef(null);

    const initHeader = () => {
        if (typeof window !== 'undefined' && window.FinisherHeader && !initialized.current && containerRef.current) {
            new window.FinisherHeader({
                ...config,
            });
            initialized.current = true;
        }
    };

    useEffect(() => {
        // Double check if script is already present/loaded from previous navigations
        if (typeof window !== 'undefined' && window.FinisherHeader) {
            const container = containerRef.current;
            // Only init if we haven't already created a canvas in this container
            if (container && !container.querySelector('canvas')) {
                initHeader();
            }
        }
    }, [config]); // Re-init if config changes (though FinisherHeader might not support dynamic updates deeply without destroy)

    return (
        <div
            ref={containerRef}
            className={`finisher-header ${className}`}
            style={{ width: '100%', position: 'relative', overflow: 'hidden', ...props.style }} // Added position relative to ensure children stack correctly if absolute
            suppressHydrationWarning={true}
            {...props}
        >
            <Script
                src="/finisher-header.es5.min.js"
                strategy="afterInteractive"
                onLoad={() => {
                    initHeader();
                }}
            />
            <style>{`
                .finisher-header canvas {
                    position: absolute !important;
                    top: 0;
                    left: 0;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: -1 !important;
                    pointer-events: none;
                }
            `}</style>
            {children}
        </div>
    );
}
