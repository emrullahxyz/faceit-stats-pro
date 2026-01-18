"use client";

import { useState, useEffect, useCallback } from "react";

interface FavoritePlayer {
    player_id: string;
    nickname: string;
    avatar?: string;
    skill_level?: number;
    addedAt: number;
}

const STORAGE_KEY = "faceit_favorites";

export function useFavorites() {
    const [favorites, setFavorites] = useState<FavoritePlayer[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load favorites from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setFavorites(JSON.parse(stored));
            }
        } catch {
            console.warn("Failed to load favorites");
        }
        setIsLoaded(true);
    }, []);

    // Save favorites to localStorage whenever they change
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
            } catch {
                console.warn("Failed to save favorites");
            }
        }
    }, [favorites, isLoaded]);

    const addFavorite = useCallback((player: Omit<FavoritePlayer, "addedAt">) => {
        setFavorites(prev => {
            if (prev.some(p => p.player_id === player.player_id)) {
                return prev;
            }
            return [...prev, { ...player, addedAt: Date.now() }];
        });
    }, []);

    const removeFavorite = useCallback((playerId: string) => {
        setFavorites(prev => prev.filter(p => p.player_id !== playerId));
    }, []);

    const isFavorite = useCallback((playerId: string) => {
        return favorites.some(p => p.player_id === playerId);
    }, [favorites]);

    const toggleFavorite = useCallback((player: Omit<FavoritePlayer, "addedAt">) => {
        if (isFavorite(player.player_id)) {
            removeFavorite(player.player_id);
        } else {
            addFavorite(player);
        }
    }, [addFavorite, removeFavorite, isFavorite]);

    return {
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        toggleFavorite,
        isLoaded
    };
}
