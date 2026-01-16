"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, TrendingUp, TrendingDown } from "lucide-react";

interface MapAnalysisProps {
    playerId: string;
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

export function MapAnalysis({ playerId }: MapAnalysisProps) {
    const [loading, setLoading] = useState(true);
    const [mapStats, setMapStats] = useState<PlayerMapStat[]>([]);
    const [matchCount, setMatchCount] = useState<string>("25");
    const [matchesAnalyzed, setMatchesAnalyzed] = useState(0);

    useEffect(() => {
        async function fetchStats() {
            try {
                setLoading(true);
                const response = await fetch(`/api/map-stats/${playerId}?limit=${matchCount}`);
                const data = await response.json();
                if (data.mapStats) {
                    setMapStats(data.mapStats);
                    setMatchesAnalyzed(data.matchesAnalyzed || 0);
                }
            } catch (error) {
                console.error("Error fetching map stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [playerId, matchCount]);

    if (loading) {
        return (
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Map Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (mapStats.length === 0) {
        return (
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Map Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <span className="text-muted-foreground">No map statistics available</span>
                </CardContent>
            </Card>
        );
    }

    // Sort by win rate and matches
    const sortedStats = [...mapStats].sort((a, b) => {
        if (b.matches !== a.matches && Math.abs(b.matches - a.matches) > 5) {
            return b.matches - a.matches;
        }
        return b.winRate - a.winRate;
    });

    const bestMaps = sortedStats.filter((m) => m.winRate >= 55 && m.matches >= 2);
    const worstMaps = sortedStats.filter((m) => m.winRate <= 45 && m.matches >= 2);

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Map Statistics
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Last</span>
                        <Select value={matchCount} onValueChange={setMatchCount}>
                            <SelectTrigger className="w-[70px] h-7 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">matches</span>
                    </div>
                </div>
                {matchesAnalyzed > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Analyzed {matchesAnalyzed} matches
                    </p>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Best & Worst Maps Summary */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-1 mb-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-400 font-medium">Best Maps</span>
                        </div>
                        <div className="space-y-1">
                            {bestMaps.length > 0 ? (
                                bestMaps.slice(0, 3).map((m) => (
                                    <div key={m.map} className="flex justify-between text-sm">
                                        <span className="text-foreground">{m.map.replace("de_", "")}</span>
                                        <span className="text-green-400">{m.winRate.toFixed(0)}%</span>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-muted-foreground">Not enough data</span>
                            )}
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-1 mb-2">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            <span className="text-xs text-red-400 font-medium">Worst Maps</span>
                        </div>
                        <div className="space-y-1">
                            {worstMaps.length > 0 ? (
                                worstMaps.slice(0, 3).map((m) => (
                                    <div key={m.map} className="flex justify-between text-sm">
                                        <span className="text-foreground">{m.map.replace("de_", "")}</span>
                                        <span className="text-red-400">{m.winRate.toFixed(0)}%</span>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-muted-foreground">Not enough data</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* All Maps Table */}
                <div className="border-t border-border/30 pt-3">
                    <div className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-2 text-xs text-muted-foreground font-medium border-b border-border/20 pb-2">
                        <span>Map</span>
                        <span className="text-center">Games</span>
                        <span className="text-center">Win%</span>
                        <span className="text-center">K/D</span>
                        <span className="text-center">Kills</span>
                    </div>
                    <div className="space-y-1 mt-2">
                        {sortedStats.slice(0, 7).map((stat) => (
                            <div
                                key={stat.map}
                                className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-2 text-sm items-center py-1"
                            >
                                <span className="font-medium">{stat.map.replace("de_", "")}</span>
                                <span className="text-center text-muted-foreground">{stat.matches}</span>
                                <span className={`text-center font-medium ${stat.winRate >= 55 ? "text-green-400" :
                                    stat.winRate <= 45 ? "text-red-400" : "text-foreground"
                                    }`}>
                                    {stat.winRate.toFixed(0)}%
                                </span>
                                <span className={`text-center ${stat.avgKD >= 1.2 ? "text-green-400" :
                                    stat.avgKD <= 0.9 ? "text-red-400" : "text-foreground"
                                    }`}>
                                    {stat.avgKD.toFixed(2)}
                                </span>
                                <span className="text-center text-muted-foreground">
                                    {stat.avgKills.toFixed(1)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
