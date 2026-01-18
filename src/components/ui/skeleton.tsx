"use client";

import { motion } from "framer-motion";

// Inline pulse animation for skeleton components
const pulseAnimation = {
    opacity: [0.4, 0.7, 0.4],
    transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut" as const
    }
};

export function MapCardSkeleton() {
    return (
        <motion.div
            animate={pulseAnimation}
            className="bg-secondary/30 rounded-xl border border-border/30 overflow-hidden"
        >
            <div className="p-4 flex items-center gap-4">
                <div className="w-20 h-6 bg-secondary/50 rounded" />
                <div className="w-14 h-6 bg-secondary/50 rounded-full" />
                <div className="flex-1 h-2 bg-secondary/50 rounded-full" />
                <div className="w-8 h-6 bg-secondary/50 rounded" />
            </div>
        </motion.div>
    );
}

export function MapStrategySkeleton() {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-4 bg-secondary/50 rounded-full" />
                <div className="w-28 h-5 bg-secondary/50 rounded" />
            </div>
            {[...Array(6)].map((_, i) => (
                <MapCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function PlayerCardSkeleton() {
    return (
        <motion.div
            animate={pulseAnimation}
            className="bg-secondary/30 rounded-xl p-4 border border-border/30"
        >
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary/50 rounded-full" />
                <div className="flex-1">
                    <div className="w-24 h-5 bg-secondary/50 rounded mb-2" />
                    <div className="w-16 h-4 bg-secondary/50 rounded" />
                </div>
            </div>
        </motion.div>
    );
}

export function MatchAnalyzerSkeleton() {
    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <motion.div animate={pulseAnimation} className="w-48 h-8 bg-secondary/50 rounded mx-auto" />
                <motion.div animate={pulseAnimation} className="w-32 h-4 bg-secondary/50 rounded mx-auto" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
                <motion.div animate={pulseAnimation} className="w-24 h-6 bg-secondary/50 rounded mx-auto" />
                <motion.div animate={pulseAnimation} className="w-8 h-6 bg-secondary/50 rounded mx-auto" />
                <motion.div animate={pulseAnimation} className="w-24 h-6 bg-secondary/50 rounded mx-auto" />
            </div>

            <MapStrategySkeleton />

            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-[#ff5500] border-t-transparent rounded-full"
                />
                <span>Loading player statistics...</span>
            </div>
        </div>
    );
}

export function PlayerListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
                <PlayerCardSkeleton key={i} />
            ))}
        </div>
    );
}
