"use client";
import FinisherBackground from './FinisherBackground';

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
    return (
        <FinisherBackground
            className={className}
            config={config}
            // Pass any other props like style, id, etc.
            {...props}
        >
            {children}
        </FinisherBackground>
    );
}
