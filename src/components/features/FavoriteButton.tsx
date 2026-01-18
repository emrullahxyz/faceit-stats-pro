"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

interface FavoriteButtonProps {
    player: {
        player_id: string;
        nickname: string;
        avatar?: string;
        skill_level?: number;
    };
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
}

export default function FavoriteButton({ player, size = "md", showLabel = false }: FavoriteButtonProps) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const isActive = isFavorite(player.player_id);

    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-8 h-8",
        lg: "w-10 h-10"
    };

    const iconSizes = {
        sm: "h-3.5 w-3.5",
        md: "h-4 w-4",
        lg: "h-5 w-5"
    };

    return (
        <motion.button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(player);
            }}
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-colors ${isActive
                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                } ${showLabel ? "px-3 w-auto gap-1.5" : ""}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={isActive ? "Remove from favorites" : "Add to favorites"}
        >
            <Star className={`${iconSizes[size]} ${isActive ? "fill-amber-400" : ""}`} />
            {showLabel && (
                <span className="text-xs font-medium">
                    {isActive ? "Favorited" : "Favorite"}
                </span>
            )}
        </motion.button>
    );
}
