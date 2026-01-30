"use client";
import { useEffect, useRef } from 'react';
import Script from 'next/script';

export default function FinisherHeader({
    className = "",
    children,
    config = {
        "count": 10,
        "size": {
            "min": 1200,
            "max": 1400,
            "pulse": 0
        },
        "speed": {
            "x": {
                "min": 0.18,
                "max": 0.22
            },
            "y": {
                "min": 0.18,
                "max": 0.22
            }
        },
        "colors": {
            "background": "#FFCC80",//#F2EFE9 #823038 #0E1116
            "particles": [

                // "#b38d97",
                // "#F0FFCE",
                // "#FFFCF2"
                "#78290f",
                "#881600",
                "#2B4141"
            ]
        },
        "blending": "overlay",
        "opacity": {
            "center": 1,
            "edge": 0.1
        },
        "skew": 0,
        "shapes": [
            "c"
        ]
    },
    ...props
}) {
    const initialized = useRef(false);
    const containerRef = useRef(null);

    const initHeader = () => {
        if (window.FinisherHeader && !initialized.current && containerRef.current) {
            new window.FinisherHeader({
                ...config,
            });
            initialized.current = true;
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.FinisherHeader) {
            const container = containerRef.current;
            if (container && !container.querySelector('canvas')) {
                initHeader();
            }
        }
    }, []);

    return (
        <div
            ref={containerRef}
            className={`finisher-header ${className}`}
            style={{ width: '100%', ...props.style }}
            suppressHydrationWarning={true}
            {...props}
        >
            <Script
                src="/finisher-header.es5.min.js"
                strategy="afterInteractive"
                onLoad={initHeader}
            />
            {children}
        </div>
    );
}
