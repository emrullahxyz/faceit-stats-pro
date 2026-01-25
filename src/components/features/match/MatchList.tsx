"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Loader2, ExternalLink } from "lucide-react";
import type { FaceitMatch } from "@/lib/api";

// Helper to format map name (remove de_ prefix)
function formatMapName(mapName: string): string {
    return mapName.replace(/^de_/i, "").replace(/^cs_/i, "");
}

interface MatchListProps {
    matches: FaceitMatch[];
    currentPlayerId: string;
    playerElo?: number;
    playerLevel?: number;
    playerNickname?: string;
}

interface MatchStats {
    kills: string;
    deaths: string;
    assists: string;
    kd: string;
    kr: string;
    adr: string;
    hs: string;
    map: string;
}

// Level colors matching Faceit
const levelColors: Record<number, string> = {
    1: "bg-gray-500",
    2: "bg-green-600",
    3: "bg-green-500",
    4: "bg-lime-500",
    5: "bg-yellow-500",
    6: "bg-yellow-400",
    7: "bg-orange-500",
    8: "bg-orange-400",
    9: "bg-red-500",
    10: "bg-[#ff5500]",
};

export function MatchList({ matches, currentPlayerId, playerElo = 0, playerLevel = 1, playerNickname = "" }: MatchListProps) {
    const router = useRouter();
    const [matchStats, setMatchStats] = useState<Record<string, MatchStats>>({});
    const [loading, setLoading] = useState(true);

    // Find player stats in match stats response
    function findPlayerStats(stats: { rounds?: Array<{ round_stats?: { Map?: string }, teams?: Array<{ players?: Array<{ player_id: string, player_stats: Record<string, string> }> }> }> }, playerId: string): MatchStats {
        const round = stats?.rounds?.[0];
        const rawMap = round?.round_stats?.Map || "Unknown";
        const map = formatMapName(rawMap);

        for (const team of round?.teams || []) {
            for (const player of team?.players || []) {
                if (player.player_id === playerId) {
                    return {
                        kills: player.player_stats?.Kills || "0",
                        deaths: player.player_stats?.Deaths || "0",
                        assists: player.player_stats?.Assists || "0",
                        kd: player.player_stats?.["K/D Ratio"] || "0.00",
                        kr: player.player_stats?.["K/R Ratio"] || "0.00",
                        adr: player.player_stats?.ADR || "--",
                        hs: player.player_stats?.["Headshots %"] || "0",
                        map,
                    };
                }
            }
        }

        return {
            kills: "--",
            deaths: "--",
            assists: "--",
            kd: "--",
            kr: "--",
            adr: "--",
            hs: "--",
            map,
        };
    }

    // Fetch stats for all matches
    useEffect(() => {
        async function fetchAllMatchStats() {
            setLoading(true);
            const statsMap: Record<string, MatchStats> = {};

            // Fetch stats in parallel (max 5 at a time to avoid rate limiting)
            const batchSize = 5;
            for (let i = 0; i < matches.length; i += batchSize) {
                const batch = matches.slice(i, i + batchSize);
                const results = await Promise.all(
                    batch.map(async (match) => {
                        try {
                            const response = await fetch(`/api/match-stats/${match.match_id}`);
                            if (response.ok) {
                                const data = await response.json();
                                return { matchId: match.match_id, stats: data };
                            }
                        } catch (error) {
                            console.error(`Failed to fetch stats for match ${match.match_id}`, error);
                        }
                        return { matchId: match.match_id, stats: null };
                    })
                );

                results.forEach(({ matchId, stats }) => {
                    if (stats) {
                        // Find player stats in the response
                        const playerStats = findPlayerStats(stats, currentPlayerId);
                        statsMap[matchId] = playerStats;
                    }
                });
            }

            setMatchStats(statsMap);
            setLoading(false);
        }

        if (matches.length > 0) {
            fetchAllMatchStats();
        } else {
            setLoading(false);
        }
    }, [matches, currentPlayerId]);

    const getPlayerTeam = (match: FaceitMatch) => {
        const inFaction1 = match.teams?.faction1?.players?.some(
            (p) => p.player_id === currentPlayerId
        ) || match.teams?.faction1?.roster?.some(
            (p) => p.player_id === currentPlayerId
        );
        return inFaction1 ? "faction1" : "faction2";
    };

    const isWin = (match: FaceitMatch) => {
        const playerTeam = getPlayerTeam(match);
        return match.results?.winner === playerTeam;
    };

    const getScore = (match: FaceitMatch) => {
        const playerTeam = getPlayerTeam(match);
        const playerScore = match.results?.score?.[playerTeam] ?? 0;
        const opponentScore =
            match.results?.score?.[playerTeam === "faction1" ? "faction2" : "faction1"] ?? 0;
        return { playerScore, opponentScore };
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const handleMatchClick = (e: React.MouseEvent, matchId: string) => {
        // Ctrl+Click or Cmd+Click - let browser handle it naturally
        if (e.ctrlKey || e.metaKey) {
            return; // Don't prevent default, let anchor handle it
        }
        e.preventDefault();
        router.push(`/match/${matchId}`);
    };

    // No longer needed - using native anchor behavior for middle click

    const handleViewOnFaceit = (e: React.MouseEvent, faceitUrl: string) => {
        e.stopPropagation();
        e.preventDefault();
        // Debug log
        console.log('Original faceit URL:', faceitUrl);
        // First decode the URL, then remove the {lang} path segment
        let cleanUrl = faceitUrl;
        try {
            cleanUrl = decodeURIComponent(faceitUrl);
        } catch {
            // If decoding fails, use original URL
        }
        console.log('After decode:', cleanUrl);
        cleanUrl = cleanUrl.replace(/\/{lang}/g, "");
        console.log('After replace:', cleanUrl);
        window.open(cleanUrl, "_blank");
    };

    if (!matches || matches.length === 0) {
        return (
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg">Last matches</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                        No recent matches found.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Last matches</CardTitle>
                    <Button
                        variant="link"
                        size="sm"
                        className="text-[#ff5500] text-xs gap-1"
                        onClick={() => {
                            // Open Faceit match history for this player
                            if (playerNickname) {
                                const faceitUrl = `https://www.faceit.com/en/players/${playerNickname}/stats/cs2`;
                                window.open(faceitUrl, '_blank');
                            }
                        }}
                    >
                        SEE FULL MATCH HISTORY
                        <ExternalLink className="h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Table Header */}
                <div className="grid grid-cols-[100px_80px_100px_100px_60px_60px_60px_100px_auto] gap-2 px-4 py-2 text-xs text-muted-foreground border-b border-border/30 font-medium">
                    <span>Date</span>
                    <span>Score</span>
                    <span>Skill level</span>
                    <span>KDA</span>
                    <span>ADR</span>
                    <span>K/D</span>
                    <span>K/R</span>
                    <span>Map</span>
                    <span>Match Type</span>
                </div>

                {/* Loading indicator */}
                {loading && (
                    <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading match stats...
                    </div>
                )}

                {/* Match Rows */}
                <div className="divide-y divide-border/20">
                    {matches.map((match) => {
                        const won = isWin(match);
                        const { playerScore, opponentScore } = getScore(match);
                        const stats = matchStats[match.match_id];

                        return (
                            <a
                                key={match.match_id}
                                href={`/match/${match.match_id}`}
                                onClick={(e) => handleMatchClick(e, match.match_id)}
                                className="grid grid-cols-[100px_80px_100px_100px_60px_60px_60px_100px_auto] gap-2 px-4 py-3 hover:bg-secondary/20 cursor-pointer transition-colors items-center text-sm no-underline text-inherit"
                            >
                                {/* Date */}
                                <span className="text-muted-foreground text-xs">
                                    {formatDate(match.finished_at)}
                                </span>

                                {/* Score */}
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant={won ? "success" : "destructive"}
                                        className="w-5 h-5 p-0 flex items-center justify-center text-[10px] font-bold rounded-sm"
                                    >
                                        {won ? "W" : "L"}
                                    </Badge>
                                    <span className="text-foreground font-medium">
                                        {playerScore} : {opponentScore}
                                    </span>
                                </div>

                                {/* Skill Level */}
                                <div className="flex items-center gap-2">
                                    <div className={`h-5 w-5 rounded-full ${levelColors[playerLevel]} flex items-center justify-center text-white text-[10px] font-bold`}>
                                        {playerLevel}
                                    </div>
                                    <span className="text-foreground text-xs">
                                        {playerElo > 0 ? playerElo.toLocaleString() : "--"}
                                    </span>
                                </div>

                                {/* KDA */}
                                <span className="text-foreground text-xs">
                                    {stats ? `${stats.kills}/${stats.deaths}/${stats.assists}` : "--/--/--"}
                                </span>

                                {/* ADR */}
                                <span className="text-muted-foreground text-xs">
                                    {stats?.adr || "--"}
                                </span>

                                {/* K/D */}
                                <span className="text-foreground text-xs">
                                    {stats?.kd || "--"}
                                </span>

                                {/* K/R */}
                                <span className="text-muted-foreground text-xs">
                                    {stats?.kr || "--"}
                                </span>

                                {/* Map */}
                                <span className="text-foreground text-xs">
                                    {stats?.map || "Unknown"}
                                </span>

                                {/* Match Type + Actions */}
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs capitalize">
                                        Cs2
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                        onClick={(e) => handleViewOnFaceit(e, match.faceit_url)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </a>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
