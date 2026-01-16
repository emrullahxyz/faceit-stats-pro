"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Gamepad2, Users, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import Link from "next/link";

interface LiveMatchProps {
    playerId: string;
    playerNickname: string;
}

interface PlayerMapStat {
    map: string;
    matches: number;
    wins: number;
    winRate: number;
    avgKills: number;
    avgDeaths: number;
    avgKD: number;
}

interface TeamPlayerStats {
    playerId: string;
    nickname: string;
    mapStats: PlayerMapStat[];
}

export function LiveMatch({ playerId, playerNickname }: LiveMatchProps) {
    const [loading, setLoading] = useState(true);
    const [scrapeLoading, setScrapeLoading] = useState(false);
    const [match, setMatch] = useState<{
        match_id: string;
        status: string;
        teams: {
            faction1: { nickname: string; players: { player_id: string; nickname: string; skill_level?: number }[] };
            faction2: { nickname: string; players: { player_id: string; nickname: string; skill_level?: number }[] };
        };
        voting?: { map?: { pick: string[] } };
        faceit_url: string;
    } | null>(null);
    const [opponentStats, setOpponentStats] = useState<TeamPlayerStats[]>([]);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);

    useEffect(() => {
        async function checkMatch() {
            try {
                setLoading(true);

                // First try dedicated live-match API (from history)
                const response = await fetch(`/api/live-match/${playerId}`);
                const data = await response.json();

                if (data.match) {
                    setMatch(data.match);
                    await fetchOpponentStats(data.match);
                    return;
                }

                // Note: Auto-scrape disabled to prevent rate limiting
                // Users can click "Check for Live Match" button to trigger scrape

            } catch (error) {
                console.error("Error checking live match:", error);
            } finally {
                setLoading(false);
            }
        }

        async function fetchOpponentStats(matchData: {
            match_id: string;
            status: string;
            teams: {
                faction1: { nickname: string; players: { player_id: string; nickname: string; skill_level?: number }[] };
                faction2: { nickname: string; players: { player_id: string; nickname: string; skill_level?: number }[] };
            };
            voting?: { map?: { pick: string[] } };
            faceit_url: string;
        }) {
            // Determine which team is opponent
            const isInFaction1 = matchData.teams.faction1.players.some(
                (p: { player_id: string }) => p.player_id === playerId
            );
            const opponentTeam = isInFaction1
                ? matchData.teams.faction2.players
                : matchData.teams.faction1.players;

            // Fetch opponent analysis via map-stats API
            setLoadingAnalysis(true);
            const opponentStatsPromises = opponentTeam.map(async (p: { player_id: string; nickname: string }) => {
                try {
                    const res = await fetch(`/api/map-stats/${p.player_id}`);
                    const stats = await res.json();
                    return {
                        playerId: p.player_id,
                        nickname: p.nickname,
                        mapStats: stats.mapStats || []
                    };
                } catch {
                    return { playerId: p.player_id, nickname: p.nickname, mapStats: [] };
                }
            });

            const results = await Promise.all(opponentStatsPromises);
            setOpponentStats(results);
            setLoadingAnalysis(false);
        }

        checkMatch();
    }, [playerId, playerNickname]);

    // Function to manually check for live match via scraping
    const scrapeForMatch = async () => {
        setScrapeLoading(true);
        try {
            const scrapeResponse = await fetch(`/api/scrape-match/${playerNickname}`);
            const scrapeData = await scrapeResponse.json();

            if (scrapeData.inMatch && scrapeData.matchId) {
                // Fetch full match details
                const matchResponse = await fetch(`/api/match/${scrapeData.matchId}`);
                if (matchResponse.ok) {
                    const matchData = await matchResponse.json();
                    setMatch(matchData);

                    // Fetch opponent stats
                    const isInFaction1 = matchData.teams.faction1.players.some(
                        (p: { player_id: string }) => p.player_id === playerId
                    );
                    const opponentTeam = isInFaction1
                        ? matchData.teams.faction2.players
                        : matchData.teams.faction1.players;

                    setLoadingAnalysis(true);
                    const opponentStatsPromises = opponentTeam.map(async (p: { player_id: string; nickname: string }) => {
                        try {
                            const res = await fetch(`/api/map-stats/${p.player_id}`);
                            const stats = await res.json();
                            return {
                                playerId: p.player_id,
                                nickname: p.nickname,
                                mapStats: stats.mapStats || []
                            };
                        } catch {
                            return { playerId: p.player_id, nickname: p.nickname, mapStats: [] };
                        }
                    });

                    const results = await Promise.all(opponentStatsPromises);
                    setOpponentStats(results);
                    setLoadingAnalysis(false);
                }
            }
        } catch (error) {
            console.error("Error scraping for match:", error);
        } finally {
            setScrapeLoading(false);
        }
    };

    if (loading) {
        return null; // Don't show anything while loading
    }

    if (!match) {
        return null; // No live match found
    }

    const isInFaction1 = match.teams.faction1.players.some((p) => p.player_id === playerId);
    const playerTeam = isInFaction1 ? match.teams.faction1 : match.teams.faction2;
    const opponentTeam = isInFaction1 ? match.teams.faction2 : match.teams.faction1;
    const selectedMap = match.voting?.map?.pick?.[0];

    // Calculate team average stats for selected map
    const getTeamMapStats = (map: string) => {
        if (!opponentStats.length) return null;

        let totalWinRate = 0;
        let totalKD = 0;
        let count = 0;

        opponentStats.forEach((player) => {
            const mapStat = player.mapStats.find((s) =>
                s.map.toLowerCase().includes(map.toLowerCase()) ||
                map.toLowerCase().includes(s.map.toLowerCase())
            );
            if (mapStat && mapStat.matches >= 3) {
                totalWinRate += mapStat.winRate;
                totalKD += mapStat.avgKD;
                count++;
            }
        });

        if (count === 0) return null;
        return {
            avgWinRate: totalWinRate / count,
            avgKD: totalKD / count,
        };
    };

    const selectedMapStats = selectedMap ? getTeamMapStats(selectedMap) : null;

    return (
        <Card className="border-[#ff5500]/50 bg-gradient-to-br from-[#ff5500]/10 to-transparent">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Gamepad2 className="h-5 w-5 text-[#ff5500] animate-pulse" />
                        <CardTitle className="text-lg">Live Match</CardTitle>
                        <Badge variant="outline" className="border-green-500 text-green-500 animate-pulse">
                            {match.status}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={`/match-analyzer?matchId=${match.match_id}`}>
                            <Button variant="default" size="sm" className="gap-1 bg-[#ff5500] hover:bg-[#ff5500]/80">
                                <Gamepad2 className="h-4 w-4" />
                                Analyze Match
                            </Button>
                        </Link>
                        <a
                            href={match.faceit_url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button variant="ghost" size="sm" className="gap-1 text-[#ff5500]">
                                <ExternalLink className="h-4 w-4" />
                                View on Faceit
                            </Button>
                        </a>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Match Overview */}
                <div className="grid grid-cols-3 gap-4 items-center text-center">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Your Team</p>
                        <p className="font-semibold text-green-400">{playerTeam.nickname}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Map</p>
                        <Badge variant="secondary" className="text-sm">
                            {selectedMap || "TBD"}
                        </Badge>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Opponent</p>
                        <p className="font-semibold text-red-400">{opponentTeam.nickname}</p>
                    </div>
                </div>

                {/* Opponent Analysis */}
                <div className="border-t border-border/30 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm">Opponent Analysis</h3>
                        {loadingAnalysis && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>

                    {selectedMap && selectedMapStats && (
                        <div className="mb-4 p-3 rounded-lg bg-secondary/30">
                            <p className="text-xs text-muted-foreground mb-1">Team avg on {selectedMap}</p>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1">
                                    {selectedMapStats.avgWinRate >= 50 ? (
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4 text-red-500" />
                                    )}
                                    <span className={selectedMapStats.avgWinRate >= 50 ? "text-green-500" : "text-red-500"}>
                                        {selectedMapStats.avgWinRate.toFixed(0)}% WR
                                    </span>
                                </div>
                                <span className="text-muted-foreground">
                                    {selectedMapStats.avgKD.toFixed(2)} K/D
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Individual Player Stats */}
                    <div className="space-y-2">
                        {opponentStats.map((player) => (
                            <div key={player.playerId} className="p-2 rounded bg-secondary/20">
                                <Link
                                    href={`/player/${player.nickname}`}
                                    className="font-medium text-sm hover:text-[#ff5500] transition-colors"
                                >
                                    {player.nickname}
                                </Link>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {player.mapStats.slice(0, 4).map((mapStat) => (
                                        <Badge
                                            key={mapStat.map}
                                            variant="outline"
                                            className={`text-xs ${mapStat.winRate >= 55
                                                ? "border-green-500/50 text-green-400"
                                                : mapStat.winRate <= 45
                                                    ? "border-red-500/50 text-red-400"
                                                    : "border-muted-foreground/30"
                                                }`}
                                        >
                                            {mapStat.map.replace("de_", "")}: {mapStat.winRate.toFixed(0)}%
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
