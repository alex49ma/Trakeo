"use client";
import FinisherBackground from './FinisherBackground';
import { useState, useEffect } from 'react';

export const defaultConfig = {
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
        "background": "#FFCC80",
        "particles": [
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
};

export default function FinisherHeader({
    className = "",
    children,
    config = defaultConfig,
    ...props
}) {
    const [responsiveConfig, setResponsiveConfig] = useState(config);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);

            let widthFactor = 1;
            if (width < 768) {
                widthFactor = 0.4;
            } else if (width < 1024) {
                widthFactor = 0.7;
            }

            let heightFactor = 1;
            if (height < 800) {
                heightFactor = 0.3;
            } else if (height < 2000) {
                heightFactor = 0.5;
            } else if (height < 3000) {
                heightFactor = 0.7;
            }

            const factor = Math.min(widthFactor, heightFactor);
            const newCount = Math.max(1, Math.floor(config.count * factor));

            setResponsiveConfig(prev => {
                // Determine if we actually need to update to avoid loop if object ref changes but content is same-ish
                if (prev.count === newCount) return prev;
                return { ...prev, count: newCount };
            });
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [config]);

    return (
        <FinisherBackground
            className={className}
            config={responsiveConfig}
            // Pass any other props like style, id, etc.
            {...props}
        >
            {children}
        </FinisherBackground>
    );
}
