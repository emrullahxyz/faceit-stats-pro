"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2, Gamepad2, Users, TrendingUp, TrendingDown, ExternalLink,
    Search, User, Target, Shield, Crown, Eye, Flame, Snowflake, AlertTriangle
} from "lucide-react";
import Link from "next/link";

// Your nickname - analysis will prioritize your team's perspective
const MY_NICKNAME = "EarlyDomDom";

interface PlayerMapStat {
    map: string;
    matches: number;
    wins: number;
    winRate: number;
    weightedWinRate: number;
    avgKD: number;
    avgKills: number;
    hsPercent: number;
    recentFormWinRate: number;
    confidence: "high" | "medium" | "low";
    compositeScore: number;
    lastPlayedDaysAgo: number;
    currentStreak?: number;
    streakType?: "win" | "loss" | "none";
    consistencyScore?: number;
    formMomentum?: number;
}

interface TeamPlayer {
    player_id: string;
    nickname: string;
    skill_level?: number;
    mapStats?: PlayerMapStat[];
}

interface MatchData {
    match_id: string;
    status: string;
    teams: {
        faction1: { nickname: string; players: TeamPlayer[] };
        faction2: { nickname: string; players: TeamPlayer[] };
    };
    voting?: { map?: { pick: string[] } };
    faceit_url: string;
}

interface MatchHistoryItem {
    match_id: string;
    finished_at: number;
    teams: { faction1: { nickname: string }; faction2: { nickname: string } };
    results?: { winner: string; score?: { faction1: number; faction2: number } };
    isLive?: boolean;
}

interface MapAnalysis {
    map: string;
    myTeamScore: number;
    enemyTeamScore: number;
    myTeamWinRate: number;
    enemyTeamWinRate: number;
    myTeamKD: number;
    enemyTeamKD: number;
    myTeamPlayerCount: number;
    enemyTeamPlayerCount: number;
    scoreDiff: number;
    recommendation: "PICK" | "SAFE" | "RISKY" | "BAN";
    confidence: "high" | "medium" | "low";
    myTeamStreak?: { type: "win" | "loss" | "none"; count: number };
    enemyTeamStreak?: { type: "win" | "loss" | "none"; count: number };
}

const CS2_MAPS = ["de_ancient", "de_anubis", "de_dust2", "de_inferno", "de_mirage", "de_nuke", "de_vertigo"];

export default function MatchAnalyzerPage() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState("match");
    const [expandedMap, setExpandedMap] = useState<string | null>(null);

    const [matchUrl, setMatchUrl] = useState("");
    const [matchLoading, setMatchLoading] = useState(false);
    const [match, setMatch] = useState<MatchData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [teamStats, setTeamStats] = useState<{
        faction1: TeamPlayer[];
        faction2: TeamPlayer[];
    } | null>(null);

    const [playerNickname, setPlayerNickname] = useState("");
    const [playerLoading, setPlayerLoading] = useState(false);
    const [playerMatches, setPlayerMatches] = useState<MatchHistoryItem[]>([]);
    const [playerError, setPlayerError] = useState<string | null>(null);
    const [checkingLive, setCheckingLive] = useState(false);

    const [mapAnalysis, setMapAnalysis] = useState<MapAnalysis[]>([]);
    const [isUserInMatch, setIsUserInMatch] = useState(false);
    const [userTeam, setUserTeam] = useState<"faction1" | "faction2" | null>(null);

    const extractMatchId = (url: string): string | null => {
        const matchResult = url.match(/room\/(1-[a-f0-9-]+)/i);
        return matchResult ? matchResult[1] : null;
    };

    useEffect(() => {
        if (!match) { setIsUserInMatch(false); setUserTeam(null); return; }
        const inF1 = match.teams.faction1.players.some(p => p.nickname.toLowerCase() === MY_NICKNAME.toLowerCase());
        const inF2 = match.teams.faction2.players.some(p => p.nickname.toLowerCase() === MY_NICKNAME.toLowerCase());
        if (inF1) { setIsUserInMatch(true); setUserTeam("faction1"); }
        else if (inF2) { setIsUserInMatch(true); setUserTeam("faction2"); }
        else { setIsUserInMatch(false); setUserTeam(null); }
    }, [match]);

    useEffect(() => {
        if (!teamStats || !match) { setMapAnalysis([]); return; }

        const myTeamKey = userTeam || "faction1";
        const enemyTeamKey = userTeam === "faction1" ? "faction2" : userTeam === "faction2" ? "faction1" : "faction2";

        const myTeamPlayers = teamStats[myTeamKey];
        const enemyTeamPlayers = teamStats[enemyTeamKey];

        const analysis: MapAnalysis[] = CS2_MAPS.map(mapName => {
            const getTeamStats = (players: TeamPlayer[]) => {
                let totalScore = 0, totalWinRate = 0, totalKD = 0, highConf = 0, count = 0;
                let avgStreak = 0, streakCount = 0;

                players.forEach(player => {
                    // Normalize map names for comparison (handle de_ prefix)
                    const normalizedMapName = mapName.replace("de_", "").toLowerCase();
                    const mapStat = player.mapStats?.find(s => {
                        const statMapName = s.map.replace("de_", "").toLowerCase();
                        return statMapName === normalizedMapName;
                    });

                    // Debug log for first player of each team on first map
                    if (mapName === "de_mirage" && players.indexOf(player) === 0) {
                        console.log(`[DEBUG] Player: ${player.nickname}, mapStats count: ${player.mapStats?.length || 0}`);
                        console.log(`[DEBUG] Looking for: "${normalizedMapName}"`);
                        console.log(`[DEBUG] Available maps:`, player.mapStats?.map(s => s.map) || []);
                        console.log(`[DEBUG] Found mapStat:`, mapStat ? `${mapStat.map} (${mapStat.matches} matches)` : "NOT FOUND");
                    }

                    if (mapStat && mapStat.matches >= 1) {
                        totalScore += mapStat.compositeScore;
                        totalWinRate += mapStat.weightedWinRate;
                        totalKD += mapStat.avgKD;
                        if (mapStat.confidence === "high") highConf++;
                        if (mapStat.streakType === "win" && mapStat.currentStreak) {
                            avgStreak += mapStat.currentStreak;
                            streakCount++;
                        } else if (mapStat.streakType === "loss" && mapStat.currentStreak) {
                            avgStreak -= mapStat.currentStreak;
                            streakCount++;
                        }
                        count++;
                    }
                });

                return {
                    avgScore: count > 0 ? totalScore / count : 50,
                    avgWinRate: count > 0 ? totalWinRate / count : 50,
                    avgKD: count > 0 ? totalKD / count : 1,
                    playerCount: count,
                    confidence: count >= 4 && highConf >= 2 ? "high" : count >= 3 ? "medium" : "low" as const,
                    avgStreak: streakCount > 0 ? avgStreak / streakCount : 0
                };
            };

            const myStats = getTeamStats(myTeamPlayers);
            const enemyStats = getTeamStats(enemyTeamPlayers);

            const scoreDiff = myStats.avgScore - enemyStats.avgScore;
            let recommendation: "PICK" | "SAFE" | "RISKY" | "BAN" = "SAFE";

            if (scoreDiff > 12) recommendation = "PICK";
            else if (scoreDiff > 5) recommendation = "SAFE";
            else if (scoreDiff < -12) recommendation = "BAN";
            else if (scoreDiff < -5) recommendation = "RISKY";

            const avgConf: "high" | "medium" | "low" =
                (myStats.confidence === "high" && enemyStats.confidence === "high") ? "high" :
                    (myStats.confidence === "low" || enemyStats.confidence === "low") ? "low" : "medium";

            return {
                map: mapName.replace("de_", ""),
                myTeamScore: myStats.avgScore,
                enemyTeamScore: enemyStats.avgScore,
                myTeamWinRate: myStats.avgWinRate,
                enemyTeamWinRate: enemyStats.avgWinRate,
                myTeamKD: myStats.avgKD,
                enemyTeamKD: enemyStats.avgKD,
                myTeamPlayerCount: myStats.playerCount,
                enemyTeamPlayerCount: enemyStats.playerCount,
                scoreDiff,
                recommendation,
                confidence: avgConf,
                myTeamStreak: {
                    type: (myStats.avgStreak > 0.5 ? "win" : myStats.avgStreak < -0.5 ? "loss" : "none") as "win" | "loss" | "none",
                    count: Math.abs(Math.round(myStats.avgStreak))
                },
                enemyTeamStreak: {
                    type: (enemyStats.avgStreak > 0.5 ? "win" : enemyStats.avgStreak < -0.5 ? "loss" : "none") as "win" | "loss" | "none",
                    count: Math.abs(Math.round(enemyStats.avgStreak))
                }
            };
        }).sort((a, b) => b.scoreDiff - a.scoreDiff);

        setMapAnalysis(analysis);
    }, [teamStats, match, userTeam]);

    const analyzeMatch = useCallback(async (matchIdToAnalyze?: string) => {
        const matchId = matchIdToAnalyze || extractMatchId(matchUrl) || matchUrl.trim();
        if (!matchId) { setError("Please enter a valid match URL or ID"); return; }

        setMatchLoading(true);
        setError(null);
        setMatch(null);
        setTeamStats(null);

        try {
            const matchRes = await fetch(`/api/match/${matchId}`);
            if (!matchRes.ok) {
                const errorData = await matchRes.json().catch(() => ({}));
                throw new Error(errorData.error || "Match not found");
            }
            const matchData = await matchRes.json();
            setMatch(matchData);

            const allPlayers = [...matchData.teams.faction1.players, ...matchData.teams.faction2.players];
            const playerStatsPromises = allPlayers.map(async (player: TeamPlayer) => {
                try {
                    const res = await fetch(`/api/map-stats/${player.player_id}?limit=100`);
                    const data = await res.json();
                    return { ...player, mapStats: data.mapStats || [] };
                } catch { return { ...player, mapStats: [] }; }
            });

            const playersWithStats = await Promise.all(playerStatsPromises);

            setTeamStats({
                faction1: playersWithStats.filter(p => matchData.teams.faction1.players.some((fp: TeamPlayer) => fp.player_id === p.player_id)),
                faction2: playersWithStats.filter(p => matchData.teams.faction2.players.some((fp: TeamPlayer) => fp.player_id === p.player_id))
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to analyze match");
        } finally {
            setMatchLoading(false);
        }
    }, [matchUrl]);

    useEffect(() => {
        const matchIdFromUrl = searchParams.get("matchId");
        if (matchIdFromUrl) { setMatchUrl(matchIdFromUrl); analyzeMatch(matchIdFromUrl); }
    }, [searchParams, analyzeMatch]);

    const searchPlayer = async () => {
        if (!playerNickname.trim()) { setPlayerError("Enter a nickname"); return; }
        setPlayerLoading(true); setPlayerError(null); setPlayerMatches([]); setCheckingLive(true); setMatch(null);

        try {
            const scrapeRes = await fetch(`/api/scrape-match/${encodeURIComponent(playerNickname.trim())}`);
            const scrapeData = await scrapeRes.json();

            if (scrapeData.inMatch && scrapeData.matchId) {
                setCheckingLive(false);
                setPlayerMatches([{ match_id: scrapeData.matchId, finished_at: Date.now() / 1000, teams: { faction1: { nickname: "Live" }, faction2: { nickname: "Match" } }, isLive: true }]);
                return;
            }

            setCheckingLive(false);
            const historyRes = await fetch(`/api/player-history/${encodeURIComponent(playerNickname.trim())}`);
            if (!historyRes.ok) throw new Error("Player not found");
            const historyData = await historyRes.json();
            setPlayerMatches(historyData.matches || []);
        } catch (err) {
            setPlayerError(err instanceof Error ? err.message : "Failed to find player");
        } finally { setPlayerLoading(false); setCheckingLive(false); }
    };

    const myTeamName = match ? (userTeam === "faction2" ? match.teams.faction2.nickname : match.teams.faction1.nickname) : "";
    const enemyTeamName = match ? (userTeam === "faction2" ? match.teams.faction1.nickname : match.teams.faction2.nickname) : "";

    return (
        <div className="container mx-auto py-6 px-4">
            <div className="max-w-4xl mx-auto space-y-5">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Gamepad2 className="h-6 w-6 text-[#ff5500]" />
                        Match Analyzer
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">AI-powered map recommendations</p>
                </div>

                {/* Search Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="match"><Gamepad2 className="h-4 w-4 mr-1.5" />Match ID</TabsTrigger>
                        <TabsTrigger value="player"><User className="h-4 w-4 mr-1.5" />Player</TabsTrigger>
                    </TabsList>

                    <TabsContent value="match" className="mt-3">
                        <div className="flex gap-2">
                            <Input placeholder="Faceit match URL or ID..." value={matchUrl} onChange={(e) => setMatchUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyzeMatch()} />
                            <Button onClick={() => analyzeMatch()} disabled={matchLoading} className="bg-[#ff5500] hover:bg-[#ff5500]/80 shrink-0">
                                {matchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1" />Analyze</>}
                            </Button>
                        </div>
                        {error && <p className="text-rose-400 text-sm mt-2">{error}</p>}
                    </TabsContent>

                    <TabsContent value="player" className="mt-3">
                        <div className="flex gap-2">
                            <Input placeholder="Player nickname..." value={playerNickname} onChange={(e) => setPlayerNickname(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchPlayer()} />
                            <Button onClick={searchPlayer} disabled={playerLoading} className="bg-[#ff5500] hover:bg-[#ff5500]/80 shrink-0">
                                {playerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1" />Search</>}
                            </Button>
                        </div>
                        {playerError && <p className="text-rose-400 text-sm mt-2">{playerError}</p>}

                        {playerMatches.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                                {playerMatches.slice(0, 5).map((m) => (
                                    <button key={m.match_id} onClick={() => { setActiveTab("match"); setMatchUrl(m.match_id); analyzeMatch(m.match_id); }}
                                        className={`w-full p-2 rounded text-sm text-left flex items-center justify-between ${m.isLive ? "bg-emerald-500/20 border border-emerald-500/40" : "bg-secondary/50 hover:bg-secondary"}`}>
                                        <span>{m.isLive ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block mr-1.5" />Live Match</> : `${m.teams.faction1.nickname} vs ${m.teams.faction2.nickname}`}</span>
                                        {m.isLive && <Badge className="bg-emerald-500 text-xs">LIVE</Badge>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Results */}
                <AnimatePresence>
                    {match && teamStats && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="space-y-4"
                        >
                            {/* Match Info */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-[#ff5500]/10 to-transparent border border-[#ff5500]/20 text-sm">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={match.status === "ONGOING" ? "border-emerald-500 text-emerald-400" : ""}>{match.status}</Badge>
                                    {isUserInMatch ? <><Crown className="h-4 w-4 text-amber-400" /><span className="text-amber-400">Your match</span></> : <><Eye className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Spectating</span></>}
                                </div>
                                <a href={match.faceit_url} target="_blank" rel="noopener noreferrer" className="text-[#ff5500] hover:underline flex items-center gap-1">Faceit <ExternalLink className="h-3 w-3" /></a>
                            </div>

                            {/* Teams Header */}
                            <div className="grid grid-cols-3 items-center text-center py-2">
                                <div className="text-right pr-4">
                                    <p className="font-semibold truncate">{myTeamName}</p>
                                    <p className="text-xs text-muted-foreground">{isUserInMatch ? "Your Team" : "Team 1"}</p>
                                </div>
                                <div className="text-xl font-bold text-muted-foreground">VS</div>
                                <div className="text-left pl-4">
                                    <p className="font-semibold truncate">{enemyTeamName}</p>
                                    <p className="text-xs text-muted-foreground">{isUserInMatch ? "Opponent" : "Team 2"}</p>
                                </div>
                            </div>

                            {/* Map Analysis */}
                            <Card>
                                <CardHeader className="py-3 px-4">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Target className="h-4 w-4 text-[#ff5500]" />
                                        Map Strategy
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border/50">
                                        {mapAnalysis.map((ma) => (
                                            <div key={ma.map} className="hover:bg-secondary/30 transition-colors">
                                                <button onClick={() => setExpandedMap(expandedMap === ma.map ? null : ma.map)} className="w-full p-3 flex items-center gap-3">
                                                    {/* Map Name */}
                                                    <span className="font-bold w-16 text-left shrink-0">{ma.map}</span>

                                                    {/* Recommendation */}
                                                    <Badge className={`shrink-0 text-xs ${ma.recommendation === "PICK" ? "bg-emerald-500" :
                                                        ma.recommendation === "SAFE" ? "bg-sky-500" :
                                                            ma.recommendation === "RISKY" ? "bg-amber-500" : "bg-rose-500"
                                                        }`}>{ma.recommendation}</Badge>

                                                    {/* Score Comparison Bar */}
                                                    <div className="flex-1 flex items-center gap-2 min-w-0">
                                                        <span className="text-sm font-mono w-6 text-right shrink-0">{ma.myTeamScore.toFixed(0)}</span>
                                                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden relative">
                                                            {ma.scoreDiff >= 0 ? (
                                                                <div className="absolute left-1/2 h-full bg-emerald-500 rounded-r" style={{ width: `${Math.min(50, ma.scoreDiff * 2)}%` }} />
                                                            ) : (
                                                                <div className="absolute right-1/2 h-full bg-rose-500 rounded-l" style={{ width: `${Math.min(50, Math.abs(ma.scoreDiff) * 2)}%` }} />
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-mono w-6 shrink-0">{ma.enemyTeamScore.toFixed(0)}</span>
                                                    </div>

                                                    {/* Data Quality - Clear Label */}
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${ma.confidence === "high" ? "bg-emerald-500/20 text-emerald-400" : ma.confidence === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"}`}>
                                                        {ma.confidence === "high" ? "✓ Reliable" : ma.confidence === "medium" ? "○ Medium" : "! Low data"}
                                                    </span>
                                                </button>

                                                {/* Expanded Details */}
                                                {expandedMap === ma.map && (
                                                    <div className="px-4 pb-4 space-y-3 bg-secondary/20 border-t border-border/30">
                                                        {/* Comparison Header */}
                                                        <div className="grid grid-cols-3 gap-2 pt-3 text-center text-xs text-muted-foreground">
                                                            <span className="font-medium text-emerald-400">{myTeamName}</span>
                                                            <span>vs</span>
                                                            <span className="font-medium text-rose-400">{enemyTeamName}</span>
                                                        </div>

                                                        {/* Stats Comparison */}
                                                        <div className="space-y-2">
                                                            {/* Win Rate */}
                                                            <div className="grid grid-cols-3 gap-2 items-center text-sm">
                                                                <span className={`text-center font-bold ${ma.myTeamWinRate > ma.enemyTeamWinRate ? "text-emerald-400" : ""}`}>{ma.myTeamWinRate.toFixed(0)}%</span>
                                                                <span className="text-center text-xs text-muted-foreground">Win Rate</span>
                                                                <span className={`text-center font-bold ${ma.enemyTeamWinRate > ma.myTeamWinRate ? "text-rose-400" : ""}`}>{ma.enemyTeamWinRate.toFixed(0)}%</span>
                                                            </div>

                                                            {/* K/D */}
                                                            <div className="grid grid-cols-3 gap-2 items-center text-sm">
                                                                <span className={`text-center font-bold ${ma.myTeamKD > ma.enemyTeamKD ? "text-emerald-400" : ""}`}>{ma.myTeamKD.toFixed(2)}</span>
                                                                <span className="text-center text-xs text-muted-foreground">K/D Ratio</span>
                                                                <span className={`text-center font-bold ${ma.enemyTeamKD > ma.myTeamKD ? "text-rose-400" : ""}`}>{ma.enemyTeamKD.toFixed(2)}</span>
                                                            </div>

                                                            {/* Match Count */}
                                                            <div className="grid grid-cols-3 gap-2 items-center text-sm">
                                                                <span className="text-center">{ma.myTeamPlayerCount}/5 players</span>
                                                                <span className="text-center text-xs text-muted-foreground">Data</span>
                                                                <span className="text-center">{ma.enemyTeamPlayerCount}/5 players</span>
                                                            </div>
                                                        </div>

                                                        {/* Streaks */}
                                                        <div className="flex justify-between pt-2 border-t border-border/20">
                                                            <div className="flex gap-1">
                                                                {ma.myTeamStreak?.type === "win" && ma.myTeamStreak.count >= 2 && (
                                                                    <Badge className="bg-emerald-500/20 text-emerald-400 text-xs"><Flame className="h-3 w-3 mr-0.5" />{ma.myTeamStreak.count} win streak</Badge>
                                                                )}
                                                                {ma.myTeamStreak?.type === "loss" && ma.myTeamStreak.count >= 2 && (
                                                                    <Badge className="bg-rose-500/20 text-rose-400 text-xs"><Snowflake className="h-3 w-3 mr-0.5" />{ma.myTeamStreak.count} loss streak</Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-1">
                                                                {ma.enemyTeamStreak?.type === "win" && ma.enemyTeamStreak.count >= 2 && (
                                                                    <Badge className="bg-emerald-500/20 text-emerald-400 text-xs"><Flame className="h-3 w-3 mr-0.5" />{ma.enemyTeamStreak.count} wins</Badge>
                                                                )}
                                                                {ma.enemyTeamStreak?.type === "loss" && ma.enemyTeamStreak.count >= 2 && (
                                                                    <Badge className="bg-rose-500/20 text-rose-400 text-xs"><Snowflake className="h-3 w-3 mr-0.5" />{ma.enemyTeamStreak.count} losses</Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Recommendation */}
                                                        <div className={`p-2 rounded text-center text-sm font-medium ${ma.recommendation === "PICK" ? "bg-emerald-500/10 text-emerald-400" : ma.recommendation === "BAN" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>
                                                            {ma.recommendation === "PICK" ? "✓ PICK this map - You have the advantage" : ma.recommendation === "BAN" ? "✗ BAN this map - Opponent favored" : "○ Risky map - Be careful"}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Summary */}
                            <div className="grid grid-cols-2 gap-3">
                                <Card className="border-emerald-500/30">
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                                            <span className="font-medium text-sm text-emerald-400">Best Picks</span>
                                        </div>
                                        <div className="space-y-0.5 text-sm">
                                            {mapAnalysis.filter(m => m.recommendation === "PICK").length > 0 ?
                                                mapAnalysis.filter(m => m.recommendation === "PICK").map(m => (
                                                    <div key={m.map} className="flex justify-between"><span>{m.map}</span><span className="text-emerald-400">+{m.scoreDiff.toFixed(0)}</span></div>
                                                )) : <p className="text-muted-foreground text-xs">No strong picks</p>
                                            }
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-rose-500/30">
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <TrendingDown className="h-4 w-4 text-rose-400" />
                                            <span className="font-medium text-sm text-rose-400">Must Ban</span>
                                        </div>
                                        <div className="space-y-0.5 text-sm">
                                            {mapAnalysis.filter(m => m.recommendation === "BAN").length > 0 ?
                                                mapAnalysis.filter(m => m.recommendation === "BAN").map(m => (
                                                    <div key={m.map} className="flex justify-between"><span>{m.map}</span><span className="text-rose-400">{m.scoreDiff.toFixed(0)}</span></div>
                                                )) : <p className="text-muted-foreground text-xs">No critical bans</p>
                                            }
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Team Rosters */}
                            <div className="grid grid-cols-2 gap-3">
                                <Card>
                                    <CardHeader className="py-2 px-3">
                                        <CardTitle className="text-sm flex items-center gap-1.5">
                                            {isUserInMatch && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                                            <Users className="h-3.5 w-3.5" />
                                            <span className="truncate">{myTeamName}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3 pb-2 pt-0">
                                        {(userTeam === "faction2" ? teamStats.faction2 : teamStats.faction1).map(p => (
                                            <div key={p.player_id} className="flex items-center justify-between py-0.5 text-sm">
                                                <Link href={`/player/${p.nickname}`} className="hover:text-[#ff5500] truncate">{p.nickname}</Link>
                                                <Badge variant="outline" className="text-xs h-5 shrink-0 ml-2">{p.skill_level || "?"}</Badge>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="py-2 px-3">
                                        <CardTitle className="text-sm flex items-center gap-1.5">
                                            <Shield className="h-3.5 w-3.5 text-rose-400" />
                                            <span className="truncate">{enemyTeamName}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3 pb-2 pt-0">
                                        {(userTeam === "faction2" ? teamStats.faction1 : teamStats.faction2).map(p => (
                                            <div key={p.player_id} className="flex items-center justify-between py-0.5 text-sm">
                                                <Link href={`/player/${p.nickname}`} className="hover:text-[#ff5500] truncate">{p.nickname}</Link>
                                                <Badge variant="outline" className="text-xs h-5 shrink-0 ml-2">{p.skill_level || "?"}</Badge>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
