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
                "min": 0.03,
                "max": 0.06
            },
            "y": {
                "min": 0.03,
                "max": 0.06
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


                // "#5b51e7",
                // "#5683ec",
                // "#ee3945"
            ]
        },
        "blending": "overlay",
        "opacity": {
            "center": 1,
            "edge": 0.2
        },
        "skew": 0,
        "shapes": [
            "c"
        ]
    },
    ...props
}) {
    const initialized = useRef(false);

    const initHeader = () => {
        if (window.FinisherHeader && !initialized.current) {
            new window.FinisherHeader(config);
            initialized.current = true;
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.FinisherHeader) {
            // Reset initialization on mount to ensure it runs if script is already cached
            // But check if canvas already exists to avoid duplicates if strict mode double invokes
            const container = document.querySelector('.finisher-header');
            if (container && !container.querySelector('canvas')) {
                initHeader();
            }
        }
    }, []);

    return (
        <div className={`finisher-header ${className}`} style={{ width: '100%', ...props.style }} {...props}>
            <Script
                src="/finisher-header.es5.min.js"
                strategy="afterInteractive"
                onLoad={initHeader}
            />
            {children}
        </div>
    );
}
