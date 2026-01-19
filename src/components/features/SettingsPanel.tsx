"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Trash2, Palette, Globe, X, Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface SettingsPanelProps {
    position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export default function SettingsPanel({ position = "bottom-right" }: SettingsPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [cacheCleared, setCacheCleared] = useState(false);
    const { theme, setTheme } = useTheme();
    const panelRef = useRef<HTMLDivElement>(null);

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const clearCache = () => {
        // Clear all mapStats cache
        const keys = Object.keys(localStorage);
        let count = 0;
        keys.forEach(key => {
            if (key.startsWith("mapStats_")) {
                localStorage.removeItem(key);
                count++;
            }
        });
        console.log(`[Cache] Cleared ${count} cached player stats`);
        setCacheCleared(true);
        setTimeout(() => setCacheCleared(false), 2000);
    };

    const positionClasses = {
        "bottom-right": "bottom-4 right-4",
        "bottom-left": "bottom-4 left-4",
        "top-right": "top-20 right-4",
        "top-left": "top-20 left-4",
    };

    return (
        <div ref={panelRef} className={`fixed ${positionClasses[position]} z-50`}>
            {/* Settings Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ff5500] to-[#cc4400] shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
            >
                <Settings className="h-5 w-5 text-white" />
            </motion.button>

            {/* Settings Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="absolute bottom-16 right-0 w-72 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 bg-gradient-to-r from-[#ff5500]/10 to-transparent border-b border-border/30">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                    <Settings className="h-4 w-4 text-[#ff5500]" />
                                    Settings
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-secondary/50 rounded-full transition-colors"
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="p-2 space-y-1">
                            {/* Theme Toggle */}
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0, duration: 0.2 }}
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    {theme === "dark" ? (
                                        <Moon className="h-4 w-4 text-purple-400" />
                                    ) : (
                                        <Sun className="h-4 w-4 text-yellow-400" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium">Theme</p>
                                    <p className="text-xs text-muted-foreground">
                                        {theme === "dark" ? "Dark Mode" : "Light Mode"}
                                    </p>
                                </div>
                                <Palette className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </motion.button>

                            {/* Language (placeholder) */}
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.05, duration: 0.2 }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors group opacity-50 cursor-not-allowed"
                                disabled
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <Globe className="h-4 w-4 text-blue-400" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium">Language</p>
                                    <p className="text-xs text-muted-foreground">English (Coming soon)</p>
                                </div>
                            </motion.button>

                            {/* Clear Cache */}
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1, duration: 0.2 }}
                                onClick={clearCache}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-colors group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                    {cacheCleared ? (
                                        <Check className="h-4 w-4 text-green-400" />
                                    ) : (
                                        <Trash2 className="h-4 w-4 text-red-400" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium">Clear Cache</p>
                                    <p className="text-xs text-muted-foreground">
                                        {cacheCleared ? "Cache cleared!" : "Remove saved player data"}
                                    </p>
                                </div>
                            </motion.button>
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-border/30 bg-secondary/20">
                            <p className="text-[10px] text-muted-foreground text-center">
                                Faceit Stats Pro v1.0
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
