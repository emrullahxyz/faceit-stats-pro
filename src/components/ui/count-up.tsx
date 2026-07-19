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
        // requestAnimationFrame never fires in a hidden tab and is pointless
        // for reduced-motion users; without this the stat would sit at 0 and
        // read as real data. Show the true number instead of animating.
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reducedMotion || document.hidden) {
            // Timers still fire while hidden, unlike requestAnimationFrame.
            const snap = setTimeout(() => setDisplay(value), 0);
            return () => clearTimeout(snap);
        }

        const start = performance.now();
        const step = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(value * eased);
            if (p < 1) raf.current = requestAnimationFrame(step);
        };
        raf.current = requestAnimationFrame(step);

        // If the tab is hidden mid-count, snap to the final value so it is
        // correct whenever the user looks at it again.
        const onHide = () => {
            if (document.hidden) {
                cancelAnimationFrame(raf.current);
                setDisplay(value);
            }
        };
        document.addEventListener("visibilitychange", onHide);

        return () => {
            cancelAnimationFrame(raf.current);
            document.removeEventListener("visibilitychange", onHide);
        };
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
