"use client";

import { useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Gamepad2, Loader2 } from "lucide-react";
import type { FaceitPlayer } from "@/lib/api";

interface PlayerHeaderProps {
    player: FaceitPlayer;
    onLiveMatchFound?: (matchId: string) => void;
}

// Faceit level colors
const levelColors: Record<number, string> = {
    1: "bg-gray-500",
    2: "bg-green-600",
    3: "bg-green-500",
    4: "bg-yellow-500",
    5: "bg-yellow-400",
    6: "bg-orange-500",
    7: "bg-orange-400",
    8: "bg-red-500",
    9: "bg-red-400",
    10: "bg-[#ff5500]",
};

export function PlayerHeader({ player, onLiveMatchFound }: PlayerHeaderProps) {
    const [checkingLive, setCheckingLive] = useState(false);

    const gameData = player.games?.cs2 || player.games?.csgo;
    const level = gameData?.skill_level || 1;
    const elo = gameData?.faceit_elo || 0;

    const checkForLiveMatch = async () => {
        setCheckingLive(true);
        try {
            const response = await fetch(`/api/scrape-match/${player.nickname}`);
            const data = await response.json();

            if (data.inMatch && data.matchId) {
                onLiveMatchFound?.(data.matchId);
                // Redirect to match analyzer with the match
                window.location.href = `/match-analyzer?matchId=${data.matchId}`;
            } else {
                // No live match - could show a toast here
                alert("Player is not currently in a match");
            }
        } catch (error) {
            console.error("Error checking live match:", error);
        } finally {
            setCheckingLive(false);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card">
            {/* Cover Image */}
            <div className="relative h-32 md:h-48 bg-gradient-to-r from-[#ff5500]/20 to-purple-500/20">
                {player.cover_image && (
                    <Image
                        src={player.cover_image}
                        alt="Cover"
                        fill
                        className="object-cover opacity-50"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            </div>

            {/* Player Info */}
            <div className="relative px-6 pb-6">
                <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-16">
                    {/* Avatar */}
                    <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-card shadow-xl">
                        <AvatarImage src={player.avatar} alt={player.nickname} />
                        <AvatarFallback className="text-2xl">
                            {player.nickname.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    {/* Name and Details */}
                    <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                                {player.nickname}
                            </h1>
                            <a
                                href={(() => { try { return decodeURIComponent(player.faceit_url).replace(/\/{lang}/g, ""); } catch { return player.faceit_url.replace(/\/{lang}/g, ""); } })()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-[#ff5500] transition-colors"
                            >
                                <ExternalLink className="h-5 w-5" />
                            </a>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs border-[#ff5500]/50 hover:bg-[#ff5500]/10"
                                onClick={checkForLiveMatch}
                                disabled={checkingLive}
                            >
                                {checkingLive ? (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        <Gamepad2 className="h-3 w-3" />
                                        Check Live Match
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {player.country && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {player.country.toUpperCase()}
                                </span>
                            )}
                            {gameData?.region && (
                                <Badge variant="outline">{gameData.region.toUpperCase()}</Badge>
                            )}
                        </div>
                    </div>

                    {/* Level and ELO */}
                    <div className="flex items-center gap-4 mt-4 md:mt-0">
                        {/* Level Badge */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full ${levelColors[level]} text-white font-bold text-xl md:text-2xl shadow-lg`}
                            >
                                {level}
                            </div>
                            <span className="mt-1 text-xs text-muted-foreground">Level</span>
                        </div>

                        {/* ELO */}
                        <div className="flex flex-col items-center">
                            <div className="text-2xl md:text-3xl font-bold text-[#ff5500]">
                                {elo.toLocaleString()}
                            </div>
                            <span className="text-xs text-muted-foreground">ELO</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
