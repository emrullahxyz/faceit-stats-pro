"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Loader2, Gamepad2, Trophy, Target,
    Clock, Calendar, ExternalLink, ChevronLeft, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlayerStats {
    player_id: string;
    nickname: string;
    player_stats: {
        Kills: string;
        Deaths: string;
        Assists: string;
        Headshots: string;
        "Headshots %"?: string;
        MVPs?: string;
        "Triple Kills"?: string;
        "Quadro Kills"?: string;
        "Penta Kills"?: string;
    };
}

interface TeamData {
    team_id: string;
    nickname: string;
    players: PlayerStats[];
}

interface MatchDetails {
    match_id: string;
    status: string;
    finished_at: number;
    started_at: number;
    faceit_url: string;
    teams: {
        faction1: { nickname: string };
        faction2: { nickname: string };
    };
    results?: {
        winner: string;
        score: { faction1: number; faction2: number };
    };
    voting?: { map?: { pick: string[] } };
}

interface MatchStats {
    rounds: Array<{
        round_stats: { Map: string; Score: string };
        teams: TeamData[];
    }>;
}

export default function MatchPage() {
    const params = useParams();
    const matchId = params.matchId as string;

    const [match, setMatch] = useState<MatchDetails | null>(null);
    const [stats, setStats] = useState<MatchStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMatch() {
            try {
                setLoading(true);
                const matchRes = await fetch(`/api/match/${matchId}`);
                if (!matchRes.ok) throw new Error("Match not found");
                setMatch(await matchRes.json());

                const statsRes = await fetch(`/api/match-stats/${matchId}`);
                if (statsRes.ok) setStats(await statsRes.json());
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load");
            } finally {
                setLoading(false);
            }
        }
        if (matchId) fetchMatch();
    }, [matchId]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-16 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-[#ff5500]" />
            </div>
        );
    }

    if (error || !match) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <Gamepad2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Match Not Found</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Link href="/match-analyzer">
                    <Button variant="outline"><ChevronLeft className="h-4 w-4 mr-2" />Back</Button>
                </Link>
            </div>
        );
    }

    const round = stats?.rounds?.[0];
    const mapName = round?.round_stats?.Map || match.voting?.map?.pick?.[0] || "Unknown";
    const team1 = round?.teams?.[0];
    const team2 = round?.teams?.[1];

    // Parse score from round_stats.Score (format: "13 / 7")
    const scoreStr = round?.round_stats?.Score || "";
    const scoreParts = scoreStr.split("/").map(s => parseInt(s.trim()) || 0);
    const score1 = scoreParts[0] || match.results?.score?.faction1 || 0;
    const score2 = scoreParts[1] || match.results?.score?.faction2 || 0;
    const isTeam1Winner = score1 > score2 || match.results?.winner === "faction1";

    const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString("tr-TR");
    const formatTime = (ts: number) => new Date(ts * 1000).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

    const Scoreboard = ({ team, teamName, isWinner }: { team?: TeamData; teamName: string; isWinner: boolean }) => {
        if (!team) return null;

        const sorted = [...team.players].sort((a, b) => {
            const aK = parseInt(a.player_stats.Kills || "0"), aD = parseInt(a.player_stats.Deaths || "1");
            const bK = parseInt(b.player_stats.Kills || "0"), bD = parseInt(b.player_stats.Deaths || "1");
            return (bK / bD) - (aK / aD);
        });

        return (
            <Card className={`overflow-hidden ${isWinner ? "border-green-500/40" : "border-border/50"}`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-3 ${isWinner ? "bg-green-500/10" : "bg-secondary/20"}`}>
                    <div className="flex items-center gap-2">
                        {isWinner && <Trophy className="h-4 w-4 text-yellow-400" />}
                        <span className="font-bold">{teamName}</span>
                    </div>
                    <Badge className={isWinner ? "bg-green-500" : "bg-red-500/80"}>
                        {isWinner ? "WINNER" : "LOSER"}
                    </Badge>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-[auto_1fr_repeat(4,50px)] gap-2 px-4 py-2 bg-secondary/10 text-xs text-muted-foreground border-b border-border/30">
                    <span className="w-6">#</span>
                    <span>Player</span>
                    <span className="text-center">K/D/A</span>
                    <span className="text-center">K/D</span>
                    <span className="text-center">HS%</span>
                    <span className="text-center">MVP</span>
                </div>

                {/* Players */}
                {sorted.map((p, i) => {
                    const k = parseInt(p.player_stats.Kills || "0");
                    const d = parseInt(p.player_stats.Deaths || "0");
                    const a = parseInt(p.player_stats.Assists || "0");
                    const hs = parseInt(p.player_stats.Headshots || "0");
                    const kd = d > 0 ? (k / d).toFixed(2) : k.toFixed(2);
                    const hsP = k > 0 ? Math.round((hs / k) * 100) : 0;
                    const mvp = parseInt(p.player_stats.MVPs || "0");

                    return (
                        <div
                            key={p.player_id}
                            className={`grid grid-cols-[auto_1fr_repeat(4,50px)] gap-2 px-4 py-2.5 items-center border-b border-border/20 last:border-0 hover:bg-secondary/10 ${i === 0 ? "bg-[#ff5500]/5" : ""}`}
                        >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-[#ff5500] text-white" : "bg-secondary/50 text-muted-foreground"}`}>
                                {i + 1}
                            </span>
                            <Link href={`/player/${p.nickname}`} className="font-medium hover:text-[#ff5500] truncate">
                                {p.nickname}
                            </Link>
                            <div className="text-center text-xs font-mono">
                                <span className="text-green-400">{k}</span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-red-400">{d}</span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-blue-400">{a}</span>
                            </div>
                            <span className={`text-center text-sm font-bold ${parseFloat(kd) >= 1 ? "text-green-400" : "text-red-400"}`}>
                                {kd}
                            </span>
                            <span className="text-center text-sm">{hsP}%</span>
                            <span className="text-center text-sm">
                                {mvp > 0 && <span className="text-yellow-400 flex items-center justify-center"><Star className="h-3 w-3 mr-0.5" />{mvp}</span>}
                            </span>
                        </div>
                    );
                })}
            </Card>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto space-y-6"
            >
                {/* Nav */}
                <div className="flex items-center justify-between">
                    <Link href="/match-analyzer">
                        <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
                    </Link>
                    <a href={match.faceit_url} target="_blank" rel="noopener noreferrer" className="text-[#ff5500] hover:underline text-sm flex items-center gap-1">
                        Faceit <ExternalLink className="h-3 w-3" />
                    </a>
                </div>

                {/* Score Header */}
                <Card className="overflow-hidden border-[#ff5500]/30">
                    <div className="p-6 bg-gradient-to-r from-[#ff5500]/5 via-transparent to-[#ff5500]/5">
                        <div className="flex items-center justify-between">
                            {/* Team 1 */}
                            <div className="flex-1 text-center">
                                <h2 className={`text-xl font-bold ${isTeam1Winner ? "text-green-400" : ""}`}>
                                    {match.teams.faction1.nickname}
                                </h2>
                            </div>

                            {/* Score */}
                            <div className="px-8">
                                <div className="text-4xl font-black">
                                    <span className={isTeam1Winner ? "text-green-400" : "text-red-400"}>
                                        {score1}
                                    </span>
                                    <span className="text-muted-foreground/30 mx-3">:</span>
                                    <span className={!isTeam1Winner ? "text-green-400" : "text-red-400"}>
                                        {score2}
                                    </span>
                                </div>
                                <div className="text-center mt-2">
                                    <Badge variant="outline"><Target className="h-3 w-3 mr-1" />{mapName}</Badge>
                                </div>
                            </div>

                            {/* Team 2 */}
                            <div className="flex-1 text-center">
                                <h2 className={`text-xl font-bold ${!isTeam1Winner ? "text-green-400" : ""}`}>
                                    {match.teams.faction2.nickname}
                                </h2>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(match.finished_at)}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(match.started_at)}</span>
                        </div>
                    </div>
                </Card>

                {/* Scoreboards */}
                {round && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Scoreboard team={team1} teamName={match.teams.faction1.nickname} isWinner={isTeam1Winner} />
                        <Scoreboard team={team2} teamName={match.teams.faction2.nickname} isWinner={!isTeam1Winner} />
                    </div>
                )}
            </motion.div>
        </div>
    );
}
