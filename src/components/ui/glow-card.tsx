"use client";

import { useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Glass card with a cursor-tracking gradient border glow (design: "Holographic HUD").
 * Sets --mx/--my/--go CSS vars on mousemove; .cardglow-wash/.cardglow-border in
 * globals.css render the masked radial glow. Renders as <a> when href is given.
 */
export function GlowCard({
    href,
    className,
    children,
}: {
    href?: string;
    className?: string;
    children: React.ReactNode;
}) {
    const onMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
        const t = e.currentTarget;
        const r = t.getBoundingClientRect();
        t.style.setProperty("--mx", `${e.clientX - r.left}px`);
        t.style.setProperty("--my", `${e.clientY - r.top}px`);
        t.style.setProperty("--go", "1");
    }, []);
    const onLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.setProperty("--go", "0");
    }, []);

    const props = {
        onMouseMove: onMove,
        onMouseLeave: onLeave,
        className: cn(
            "relative overflow-hidden hud-tile rounded-[20px] transition-transform duration-300 hover:-translate-y-[3px]",
            className
        ),
    };
    const overlays = (
        <>
            <div className="cardglow-wash" aria-hidden />
            <div className="cardglow-border" aria-hidden />
        </>
    );

    return href ? (
        <Link href={href} {...props}>
            {overlays}
            {children}
        </Link>
    ) : (
        <div {...props}>
            {overlays}
            {children}
        </div>
    );
}
