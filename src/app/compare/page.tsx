"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight, Users, ArrowLeftRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { comparePlayersAction, findSharedMatches } from "@/app/actions";
import type { FaceitPlayer, FaceitPlayerStats } from "@/lib/api";

// Helper to find stat
function findStat(lifetime: Record<string, string> | undefined, keys: string[]): string {
    if (!lifetime) return "0";
    for (const key of keys) {
        if (lifetime[key] !== undefined && lifetime[key] !== "") {
            return lifetime[key];
        }
    }
    return "0";
}

// Level colors
const levelColors: Record<number, string> = {
    1: "bg-gray-500", 2: "bg-green-600", 3: "bg-green-500", 4: "bg-yellow-500",
    5: "bg-yellow-400", 6: "bg-orange-500", 7: "bg-orange-400", 8: "bg-red-500",
    9: "bg-red-400", 10: "bg-[#ff5500]",
};

function PlayerCompareCard({ player, stats }: { player: FaceitPlayer; stats: FaceitPlayerStats | null }) {
    const gameData = player.games?.cs2 || player.games?.csgo;
    const level = gameData?.skill_level || 1;
    const elo = gameData?.faceit_elo || 0;
    const lifetime = stats?.lifetime || {};

    return (
        <div className="flex-1 p-4 rounded-lg border border-border/50 bg-card/50">
            <div className="flex flex-col items-center text-center">
                <Link href={`/player/${player.nickname}`} className="group">
                    <Avatar className="h-20 w-20 mb-3 ring-2 ring-transparent group-hover:ring-[#ff5500] transition-all">
                        <AvatarImage src={player.avatar} alt={player.nickname} />
                        <AvatarFallback>{player.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>
                <Link href={`/player/${player.nickname}`} className="hover:text-[#ff5500] transition-colors">
                    <h3 className="text-lg font-bold text-foreground hover:text-[#ff5500]">{player.nickname}</h3>
                </Link>
                <div className="flex items-center gap-2 mt-2">
                    <div className={`h-8 w-8 rounded-full ${levelColors[level]} flex items-center justify-center text-white text-sm font-bold`}>
                        {level}
                    </div>
                    <span className="text-xl font-bold text-[#ff5500]">{elo}</span>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded bg-secondary/30">
                    <div className="text-lg font-bold text-green-400">
                        {findStat(lifetime, ["Average K/D Ratio", "K/D Ratio"])}
                    </div>
                    <div className="text-xs text-muted-foreground">K/D</div>
                </div>
                <div className="p-2 rounded bg-secondary/30">
                    <div className="text-lg font-bold text-blue-400">
                        {findStat(lifetime, ["Win Rate %", "Winrate"])}%
                    </div>
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
                <div className="p-2 rounded bg-secondary/30">
                    <div className="text-lg font-bold text-yellow-400">
                        {findStat(lifetime, ["Average Headshots %", "Headshots %"])}%
                    </div>
                    <div className="text-xs text-muted-foreground">HS %</div>
                </div>
                <div className="p-2 rounded bg-secondary/30">
                    <div className="text-lg font-bold text-cyan-400">
                        {parseInt(findStat(lifetime, ["Matches", "Total Matches"])).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Matches</div>
                </div>
            </div>
        </div>
    );
}

export default function ComparePage() {
    const [player1, setPlayer1] = useState("");
    const [player2, setPlayer2] = useState("");
    const [isPending, startTransition] = useTransition();
    const [compareResult, setCompareResult] = useState<{
        player1: { player: FaceitPlayer; stats: FaceitPlayerStats | null } | null;
        player2: { player: FaceitPlayer; stats: FaceitPlayerStats | null } | null;
    } | null>(null);
    const [sharedMatches, setSharedMatches] = useState<Array<{
        matchId: string;
        date: number;
        result: string;
        sameTeam: boolean;
    }>>([]);
    const [error, setError] = useState<string | null>(null);

    const handleCompare = (e: React.FormEvent) => {
        e.preventDefault();
        if (!player1.trim() || !player2.trim()) return;

        setError(null);
        setCompareResult(null);
        setSharedMatches([]);

        startTransition(async () => {
            // Fetch comparison data
            const result = await comparePlayersAction(player1.trim(), player2.trim());

            if (result.error) {
                setError(result.error);
                return;
            }

            setCompareResult({
                player1: result.player1,
                player2: result.player2,
            });

            // Also fetch shared matches
            const shared = await findSharedMatches(player1.trim(), player2.trim());
            if (!shared.error) {
                setSharedMatches(shared.sharedMatches);
            }
        });
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto text-center mb-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#ff5500]/10 mb-4">
                    <Users className="h-8 w-8 text-[#ff5500]" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Compare Players</h1>
                <p className="text-muted-foreground">
                    Compare stats and find shared match history between two players.
                </p>
            </div>

            {/* Search Form */}
            <Card className="max-w-2xl mx-auto border-border/50 bg-card/50 mb-8">
                <CardHeader>
                    <CardTitle>Player Comparison</CardTitle>
                    <CardDescription>
                        Enter two nicknames to compare stats and find shared matches.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCompare} className="space-y-4">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-foreground mb-2">Player 1</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Enter nickname..."
                                        value={player1}
                                        onChange={(e) => setPlayer1(e.target.value)}
                                        className="pl-10 bg-secondary/50"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-center">
                                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#ff5500]/10">
                                    <ArrowLeftRight className="h-4 w-4 text-[#ff5500]" />
                                </div>
                            </div>

                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-foreground mb-2">Player 2</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Enter nickname..."
                                        value={player2}
                                        onChange={(e) => setPlayer2(e.target.value)}
                                        className="pl-10 bg-secondary/50"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-[#ff5500] hover:bg-[#ff5500]/90"
                            disabled={!player1.trim() || !player2.trim() || isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Comparing...
                                </>
                            ) : (
                                "Compare Players"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Error */}
            {error && (
                <div className="max-w-2xl mx-auto mb-8 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-center">
                    {error}
                </div>
            )}

            {/* Comparison Results */}
            {compareResult && compareResult.player1 && compareResult.player2 && (
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Side by Side Stats */}
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle>Stats Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-4">
                                <PlayerCompareCard
                                    player={compareResult.player1.player}
                                    stats={compareResult.player1.stats}
                                />
                                <div className="hidden md:flex items-center justify-center">
                                    <div className="text-2xl font-bold text-muted-foreground">VS</div>
                                </div>
                                <PlayerCompareCard
                                    player={compareResult.player2.player}
                                    stats={compareResult.player2.stats}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shared Matches */}
                    <Card className="border-border/50 bg-card/50">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Shared Match History</span>
                                <Badge variant={sharedMatches.length > 0 ? "default" : "secondary"}>
                                    {sharedMatches.length} matches found
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                Matches where both players participated
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {sharedMatches.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">
                                    No shared matches found in recent history.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {sharedMatches.map((match) => (
                                        <div
                                            key={match.matchId}
                                            className={`flex items-center justify-between p-3 rounded-lg border ${match.result === "WIN"
                                                ? "border-green-500/30 bg-green-500/5"
                                                : "border-red-500/30 bg-red-500/5"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Badge variant={match.sameTeam ? "success" : "destructive"}>
                                                    {match.sameTeam ? "TEAMMATES" : "OPPONENTS"}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    {formatDate(match.date)}
                                                </span>
                                            </div>
                                            <Badge variant={match.result === "WIN" ? "success" : "destructive"}>
                                                {match.result}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
