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
    Search, User, Target, Shield, Crown, Eye, Flame, Snowflake, AlertTriangle, Share2
} from "lucide-react";
import Link from "next/link";
import { MatchAnalyzerSkeleton } from "@/components/ui/skeleton";
import ShareCard from "@/components/features/ShareCard";
import AIPrediction from "@/components/features/AIPrediction";

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
    // Significance metrics
    myTeamTotalMatches: number;
    enemyTeamTotalMatches: number;
    reliabilityScore: number; // 0-100, based on sample sizes
    significanceLevel: "reliable" | "moderate" | "unreliable";
}

const CS2_MAPS = ["de_ancient", "de_anubis", "de_dust2", "de_inferno", "de_mirage", "de_nuke"];

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

    const [mapAnalysis, setMapAnalysis] = useState<MapAnalysis[]>([]);
    const [isUserInMatch, setIsUserInMatch] = useState(false);
    const [userTeam, setUserTeam] = useState<"faction1" | "faction2" | null>(null);
    const [showShareCard, setShowShareCard] = useState(false);
    const [selectedMapForPrediction, setSelectedMapForPrediction] = useState<string | null>(null);

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
                let totalScore = 0, totalWinRate = 0, totalKD = 0, highConf = 0, count = 0, totalMatches = 0;
                let avgStreak = 0, streakCount = 0;

                players.forEach(player => {
                    // Normalize map names for flexible comparison
                    const normalizedMapName = mapName.replace("de_", "").toLowerCase();

                    // Find matching map stat with flexible matching
                    const mapStat = player.mapStats?.find(s => {
                        if (!s.map) return false;
                        const statMapName = s.map.replace("de_", "").toLowerCase();
                        // Try exact match first, then contains match
                        return statMapName === normalizedMapName ||
                            statMapName.includes(normalizedMapName) ||
                            normalizedMapName.includes(statMapName);
                    });

                    if (mapStat && mapStat.matches >= 1) {
                        totalScore += mapStat.compositeScore;
                        totalWinRate += mapStat.weightedWinRate;
                        totalKD += mapStat.avgKD;
                        totalMatches += mapStat.matches;
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
                    totalMatches,
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

            // Calculate reliability score based on total matches (max 100)
            const totalCombinedMatches = myStats.totalMatches + enemyStats.totalMatches;
            const reliabilityScore = Math.min(100, Math.round(
                (myStats.playerCount / 5 * 40) + // 40 points for my team player coverage
                (enemyStats.playerCount / 5 * 40) + // 40 points for enemy team player coverage
                (Math.min(totalCombinedMatches, 50) / 50 * 20) // 20 points for sample size
            ));

            // Determine significance level
            const significanceLevel: "reliable" | "moderate" | "unreliable" =
                reliabilityScore >= 70 ? "reliable" :
                    reliabilityScore >= 40 ? "moderate" : "unreliable";

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
                },
                // Significance metrics
                myTeamTotalMatches: myStats.totalMatches,
                enemyTeamTotalMatches: enemyStats.totalMatches,
                reliabilityScore,
                significanceLevel
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

            // Cache helper functions
            const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
            const getCachedStats = (playerId: string) => {
                try {
                    const cached = localStorage.getItem(`mapStats_${playerId}`);
                    if (cached) {
                        const { data, timestamp } = JSON.parse(cached);
                        if (Date.now() - timestamp < CACHE_TTL) {
                            return data;
                        }
                    }
                } catch { /* ignore */ }
                return null;
            };
            const setCachedStats = (playerId: string, data: PlayerMapStat[]) => {
                try {
                    localStorage.setItem(`mapStats_${playerId}`, JSON.stringify({
                        data,
                        timestamp: Date.now()
                    }));
                } catch { /* ignore */ }
            };

            // Sequential API calls with delay to prevent rate limiting
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
            const playersWithStats: TeamPlayer[] = [];

            for (let i = 0; i < allPlayers.length; i++) {
                const player = allPlayers[i];

                // Check cache first
                const cached = getCachedStats(player.player_id);
                if (cached) {
                    console.log(`[Cache HIT] ${player.nickname} (${i + 1}/${allPlayers.length})`);
                    playersWithStats.push({ ...player, mapStats: cached });
                    continue;
                }

                try {
                    // Use 25 matches to reduce API calls
                    console.log(`[Fetching] ${player.nickname} (${i + 1}/${allPlayers.length})...`);
                    const res = await fetch(`/api/map-stats/${player.player_id}?limit=25`);
                    if (!res.ok) {
                        console.warn(`Failed to fetch map stats for ${player.nickname}: ${res.status}`);
                        playersWithStats.push({ ...player, mapStats: [] });
                    } else {
                        const data = await res.json();
                        if (data.error) {
                            console.warn(`Map stats error for ${player.nickname}: ${data.error}`);
                            playersWithStats.push({ ...player, mapStats: [] });
                        } else {
                            const mapStats = data.mapStats || [];
                            setCachedStats(player.player_id, mapStats);
                            console.log(`[Cache SET] ${player.nickname}`);
                            playersWithStats.push({ ...player, mapStats });
                        }
                    }
                } catch (err) {
                    console.warn(`Exception fetching map stats for ${player.nickname}:`, err);
                    playersWithStats.push({ ...player, mapStats: [] });
                }

                // Delay between requests (skip for cached results)
                if (i < allPlayers.length - 1) {
                    await delay(150);
                }
            }

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
        setPlayerLoading(true); setPlayerError(null); setPlayerMatches([]); setMatch(null);

        try {
            const scrapeRes = await fetch(`/api/scrape-match/${encodeURIComponent(playerNickname.trim())}`);
            const scrapeData = await scrapeRes.json();

            if (scrapeData.inMatch && scrapeData.matchId) {
                setPlayerMatches([{ match_id: scrapeData.matchId, finished_at: Date.now() / 1000, teams: { faction1: { nickname: "Live" }, faction2: { nickname: "Match" } }, isLive: true }]);
                return;
            }

            const historyRes = await fetch(`/api/player-history/${encodeURIComponent(playerNickname.trim())}`);
            if (!historyRes.ok) throw new Error("Player not found");
            const historyData = await historyRes.json();
            setPlayerMatches(historyData.matches || []);
        } catch (err) {
            setPlayerError(err instanceof Error ? err.message : "Failed to find player");
        } finally { setPlayerLoading(false); }
    };

    const myTeamName = match ? (userTeam === "faction2" ? match.teams.faction2.nickname : match.teams.faction1.nickname) : "";
    const enemyTeamName = match ? (userTeam === "faction2" ? match.teams.faction1.nickname : match.teams.faction2.nickname) : "";

    // Calculate AI Prediction for selected map
    const calculatePrediction = useCallback((mapName: string) => {
        const mapData = mapAnalysis.find(m => m.map.toLowerCase() === mapName.toLowerCase().replace("de_", ""));
        if (!mapData) return null;

        // Calculate team scores using multiple factors
        const myTeamScore = (
            mapData.myTeamScore * 0.25 +
            mapData.myTeamWinRate * 0.20 +
            Math.min(100, mapData.myTeamKD * 50) * 0.15 +
            (mapData.myTeamPlayerCount >= 4 ? 60 : mapData.myTeamPlayerCount >= 3 ? 50 : 40) * 0.15 + // Data quality bonus
            (mapData.myTeamPlayerCount / 5 * 100) * 0.10 +
            Math.min(100, mapData.myTeamScore * 0.8) * 0.10 + // Impact from composite
            (mapData.myTeamStreak?.type === "win" ? 55 : mapData.myTeamStreak?.type === "loss" ? 45 : 50) * 0.05
        );

        const enemyTeamScore = (
            mapData.enemyTeamScore * 0.25 +
            mapData.enemyTeamWinRate * 0.20 +
            Math.min(100, mapData.enemyTeamKD * 50) * 0.15 +
            (mapData.enemyTeamPlayerCount >= 4 ? 60 : mapData.enemyTeamPlayerCount >= 3 ? 50 : 40) * 0.15 +
            (mapData.enemyTeamPlayerCount / 5 * 100) * 0.10 +
            Math.min(100, mapData.enemyTeamScore * 0.8) * 0.10 +
            (mapData.enemyTeamStreak?.type === "win" ? 55 : mapData.enemyTeamStreak?.type === "loss" ? 45 : 50) * 0.05
        );

        // Calculate win probability
        const totalScore = myTeamScore + enemyTeamScore;
        const myWinProb = totalScore > 0 ? (myTeamScore / totalScore) * 100 : 50;
        const enemyWinProb = 100 - myWinProb;

        // Determine key factor
        let keyFactor = "";
        const winRateDiff = mapData.myTeamWinRate - mapData.enemyTeamWinRate;
        const kdDiff = mapData.myTeamKD - mapData.enemyTeamKD;

        if (Math.abs(winRateDiff) >= 10) {
            keyFactor = winRateDiff > 0
                ? `Takımınızın ${mapName.replace("de_", "")} win rate'i rakipten %${winRateDiff.toFixed(0)} daha yüksek`
                : `Rakip takımın ${mapName.replace("de_", "")} win rate'i sizden %${Math.abs(winRateDiff).toFixed(0)} daha yüksek`;
        } else if (Math.abs(kdDiff) >= 0.2) {
            keyFactor = kdDiff > 0
                ? `Takımınızın K/D oranı bu haritada daha yüksek (${mapData.myTeamKD.toFixed(2)} vs ${mapData.enemyTeamKD.toFixed(2)})`
                : `Rakip takımın K/D oranı daha yüksek (${mapData.enemyTeamKD.toFixed(2)} vs ${mapData.myTeamKD.toFixed(2)})`;
        } else {
            keyFactor = "İki takım bu haritada benzer performans gösteriyor";
        }

        // Find MVP candidate (highest scoring player on my team)
        const myTeamKey = userTeam || "faction1";
        const myTeamPlayers = teamStats?.[myTeamKey] || [];
        let mvpCandidate = null;

        if (myTeamPlayers.length > 0) {
            const bestPlayer = myTeamPlayers.reduce((best, player) => {
                const playerMapStat = player.mapStats?.find(s =>
                    s.map.toLowerCase().replace("de_", "") === mapName.toLowerCase().replace("de_", "")
                );
                const bestMapStat = best?.mapStats?.find(s =>
                    s.map.toLowerCase().replace("de_", "") === mapName.toLowerCase().replace("de_", "")
                );

                const playerScore = playerMapStat?.compositeScore || 0;
                const bestScore = bestMapStat?.compositeScore || 0;

                return playerScore > bestScore ? player : best;
            }, myTeamPlayers[0]);

            const bestMapStat = bestPlayer?.mapStats?.find(s =>
                s.map.toLowerCase().replace("de_", "") === mapName.toLowerCase().replace("de_", "")
            );

            if (bestMapStat && bestMapStat.compositeScore > 55) {
                mvpCandidate = {
                    name: bestPlayer.nickname,
                    reason: `Bu haritada ${bestMapStat.compositeScore.toFixed(0)} composite skoru ve %${bestMapStat.winRate.toFixed(0)} win rate`
                };
            }
        }

        return {
            myTeamWinProbability: myWinProb,
            enemyTeamWinProbability: enemyWinProb,
            confidence: mapData.significanceLevel === "reliable" ? "high" as const :
                mapData.significanceLevel === "moderate" ? "medium" as const : "low" as const,
            keyFactor,
            mvpCandidate,
            myTeamName,
            enemyTeamName,
            selectedMap: mapName.replace("de_", "")
        };
    }, [mapAnalysis, teamStats, userTeam, myTeamName, enemyTeamName]);

    // Get current prediction
    const currentPrediction = selectedMapForPrediction ? calculatePrediction(selectedMapForPrediction) : null;

    return (
        <>
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

                    {/* Loading Skeleton */}
                    {matchLoading && (
                        <div className="mt-6">
                            <MatchAnalyzerSkeleton />
                        </div>
                    )}

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
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setShowShareCard(true)} className="flex items-center gap-1 text-[#ff5500] hover:underline">
                                            <Share2 className="h-3.5 w-3.5" /> Share
                                        </button>
                                        <a href={(() => { try { return decodeURIComponent(match.faceit_url).replace(/\/{lang}/g, ""); } catch { return match.faceit_url.replace(/\/{lang}/g, ""); } })()} target="_blank" rel="noopener noreferrer" className="text-[#ff5500] hover:underline flex items-center gap-1">Faceit <ExternalLink className="h-3 w-3" /></a>
                                    </div>
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

                                                        {/* Weak Point Indicator */}
                                                        {ma.enemyTeamWinRate < 45 && ma.enemyTeamPlayerCount >= 3 && (
                                                            <span className="text-red-400 shrink-0" title="Enemy weak point!">🎯</span>
                                                        )}

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

                                                            {/* Reliability Score & Weak Point */}
                                                            <div className="pt-2 border-t border-border/20 space-y-2">
                                                                {/* Reliability Score */}
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-muted-foreground">Reliability:</span>
                                                                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full ${ma.significanceLevel === "reliable" ? "bg-emerald-500" : ma.significanceLevel === "moderate" ? "bg-amber-500" : "bg-rose-500"}`}
                                                                            style={{ width: `${ma.reliabilityScore}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className={`text-xs font-mono ${ma.significanceLevel === "reliable" ? "text-emerald-400" : ma.significanceLevel === "moderate" ? "text-amber-400" : "text-rose-400"}`}>
                                                                        {ma.reliabilityScore}%
                                                                    </span>
                                                                </div>

                                                                {/* Weak Point Indicator */}
                                                                {ma.enemyTeamWinRate < 45 && ma.enemyTeamPlayerCount >= 3 && (
                                                                    <div className="flex items-center gap-2 p-1.5 rounded bg-red-500/10 border border-red-500/20">
                                                                        <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                                                                        <span className="text-xs text-red-400">🎯 Enemy weak point! {ma.enemyTeamWinRate.toFixed(0)}% win rate</span>
                                                                    </div>
                                                                )}

                                                                {/* Sample Size Info */}
                                                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                                                    <span>Sample: {ma.myTeamTotalMatches} matches</span>
                                                                    <span>Sample: {ma.enemyTeamTotalMatches} matches</span>
                                                                </div>
                                                            </div>

                                                            {/* Recommendation */}
                                                            <div className={`p-2 rounded text-center text-sm font-medium ${ma.recommendation === "PICK" ? "bg-emerald-500/10 text-emerald-400" : ma.recommendation === "BAN" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>
                                                                {ma.recommendation === "PICK" ? "✓ PICK this map - You have the advantage" : ma.recommendation === "BAN" ? "✗ BAN this map - Opponent favored" : "○ Risky map - Be careful"}
                                                            </div>

                                                            {/* AI Prediction Button */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setSelectedMapForPrediction(ma.map); }}
                                                                className="w-full mt-2 p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-purple-300 hover:text-purple-200"
                                                            >
                                                                <span className="text-lg">🧠</span>
                                                                AI Maç Tahmini Göster
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* AI Prediction Card */}
                                <AnimatePresence>
                                    {currentPrediction && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <AIPrediction prediction={currentPrediction} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

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

            {/* Share Card Modal */}
            <AnimatePresence>
                {showShareCard && match && (
                    <ShareCard
                        matchId={match.match_id}
                        myTeamName={userTeam === "faction1" ? match.teams.faction1.nickname : match.teams.faction2.nickname}
                        enemyTeamName={userTeam === "faction1" ? match.teams.faction2.nickname : match.teams.faction1.nickname}
                        mapAnalysis={mapAnalysis}
                        onClose={() => setShowShareCard(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
