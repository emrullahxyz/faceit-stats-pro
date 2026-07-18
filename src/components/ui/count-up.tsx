"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated count-up for stat numbers (design motion spec: ~900-1000ms ease-out
 * cubic from 0 on mount). Always render inside a font-mono .tabular element so
 * digit width stays fixed while counting.
 */
export function CountUp({
    value,
    decimals = 0,
    suffix = "",
    duration = 950,
}: {
    value: number;
    decimals?: number;
    suffix?: string;
    duration?: number;
}) {
    const [display, setDisplay] = useState(0);
    const raf = useRef<number>(0);

    useEffect(() => {
        const start = performance.now();
        const step = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(value * eased);
            if (p < 1) raf.current = requestAnimationFrame(step);
        };
        raf.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf.current);
    }, [value, duration]);

    const formatted =
        decimals > 0
            ? display.toFixed(decimals)
            : Math.round(display).toLocaleString("en-US");

    return (
        <>
            {formatted}
            {suffix}
        </>
    );
}
