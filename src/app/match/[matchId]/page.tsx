"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gamepad2, ExternalLink, ChevronLeft, Crown } from "lucide-react";

interface PlayerStats {
    player_id: string;
    nickname: string;
    player_stats: {
        Kills: string;
        Deaths: string;
        Assists: string;
        Headshots: string;
        "Headshots %"?: string;
        ADR?: string;
        MVPs?: string;
    } & Record<string, string | undefined>;
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

// Map tile gradients (shared visual language with MatchList)
const MAP_TILES: Record<string, string> = {
    mirage: "linear-gradient(135deg,#3A5A6E,#1C2B36)",
    inferno: "linear-gradient(135deg,#6E4A3A,#331F16)",
    nuke: "linear-gradient(135deg,#5A6E3A,#28331C)",
    ancient: "linear-gradient(135deg,#3A6E52,#16332A)",
    anubis: "linear-gradient(135deg,#6E663A,#33301C)",
    dust2: "linear-gradient(135deg,#6E5E3A,#332C16)",
    vertigo: "linear-gradient(135deg,#4A4A6E,#1F1F33)",
    overpass: "linear-gradient(135deg,#3A6E6E,#163333)",
    train: "linear-gradient(135deg,#5E5E66,#26262B)",
};
const DEFAULT_TILE = "linear-gradient(135deg,#44505A,#1A2026)";

const SCOREBOARD_GRID =
    "grid grid-cols-[minmax(0,1fr)_36px_36px_36px_48px_48px_44px] gap-1.5";

function SkeletonRows({ count = 5 }: { count?: number }) {
    return (
        <div className="flex flex-col">
            {Array.from({ length: count }, (_, i) => (
                <div
                    key={i}
                    className={`${SCOREBOARD_GRID} items-center border-b border-white/[0.045] px-6 py-3`}
                >
                    <div className="flex items-center gap-[11px]">
                        <div className="hud-skeleton h-8 w-8 rounded-full" />
                        <div className="hud-skeleton h-3 w-24" />
                    </div>
                    {Array.from({ length: 6 }, (_, j) => (
                        <div key={j} className="hud-skeleton h-3" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default function MatchPage() {
    const params = useParams();
    const router = useRouter();
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
            <div className="mx-auto max-w-[1280px] space-y-[22px] px-5 py-[34px] sm:px-10">
                <div className="hud-skeleton h-[120px] w-full rounded-[24px]" />
                <div className="hud-glass overflow-hidden">
                    <SkeletonRows />
                </div>
                <div className="hud-glass overflow-hidden">
                    <SkeletonRows />
                </div>
            </div>
        );
    }

    if (error || !match) {
        return (
            <div className="mx-auto max-w-[1280px] px-5 py-16 text-center">
                <Gamepad2 className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                <h1 className="mb-2 text-2xl font-bold">Match Not Found</h1>
                <p className="mb-6 text-muted-foreground">{error}</p>
                <button
                    onClick={() => router.back()}
                    className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-5 text-sm font-semibold transition-colors hover:border-cyan/60"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                </button>
            </div>
        );
    }

    const round = stats?.rounds?.[0];
    const mapName = round?.round_stats?.Map || match.voting?.map?.pick?.[0] || "Unknown";
    const mapClean = mapName.replace(/^de_/i, "").replace(/^cs_/i, "");
    const tile = MAP_TILES[mapClean.toLowerCase()] || DEFAULT_TILE;
    const team1 = round?.teams?.[0];
    const team2 = round?.teams?.[1];

    // Parse score from round_stats.Score (format: "13 / 7")
    const scoreStr = round?.round_stats?.Score || "";
    const scoreParts = scoreStr.split("/").map((s) => parseInt(s.trim()) || 0);
    const score1 = scoreParts[0] || match.results?.score?.faction1 || 0;
    const score2 = scoreParts[1] || match.results?.score?.faction2 || 0;
    const isTeam1Winner = score1 > score2 || match.results?.winner === "faction1";

    const faceitUrl = (() => {
        try {
            return decodeURIComponent(match.faceit_url).replace(/\/{lang}/g, "");
        } catch {
            return match.faceit_url.replace(/\/{lang}/g, "");
        }
    })();

    const dateMeta = `${new Date(match.finished_at * 1000)
        .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        .toUpperCase()} · ${new Date(match.started_at * 1000).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    })} · CS2`;

    // Match MVP = top fragger across both teams
    const allPlayers = [...(team1?.players ?? []), ...(team2?.players ?? [])];
    const mvpId = allPlayers.reduce(
        (best, p) =>
            parseInt(p.player_stats.Kills || "0") >
            parseInt(best?.player_stats.Kills || "-1")
                ? p
                : best,
        undefined as PlayerStats | undefined
    )?.player_id;

    const TeamPanel = ({
        team,
        teamName,
        isWinner,
        accent,
    }: {
        team?: TeamData;
        teamName: string;
        isWinner: boolean;
        accent: "cyan" | "violet";
    }) => {
        if (!team) return null;

        const sorted = [...team.players].sort(
            (a, b) =>
                parseInt(b.player_stats.Kills || "0") - parseInt(a.player_stats.Kills || "0")
        );
        const wash =
            accent === "cyan" ? "rgba(0,229,255,0.07)" : "rgba(139,92,246,0.07)";
        const dot = accent === "cyan" ? "#00E5FF" : "#8B5CF6";

        return (
            <div className="hud-glass relative overflow-hidden">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background: `radial-gradient(420px circle at 12% 0%, ${wash}, transparent 60%)`,
                    }}
                />
                {/* Team header */}
                <div className="relative flex items-center justify-between px-6 pb-3.5 pt-5">
                    <div className="flex items-center gap-2.5">
                        <span
                            className="h-[9px] w-[9px] rounded-full"
                            style={{ background: dot, boxShadow: `0 0 12px ${dot}` }}
                        />
                        <span className="text-base font-bold tracking-[0.04em]">{teamName}</span>
                    </div>
                    <span
                        className={`font-mono text-[11px] tracking-[0.14em] ${
                            isWinner ? "text-success" : "text-text-faint"
                        }`}
                    >
                        {isWinner ? "WINNER" : "DEFEAT"}
                    </span>
                </div>
                {/* Column heads */}
                <div
                    className={`${SCOREBOARD_GRID} relative border-b border-white/[0.07] px-5 py-2 font-mono text-[10px] tracking-[0.14em] text-text-faint`}
                >
                    <span>PLAYER</span>
                    <span className="text-right text-cyan">K ▼</span>
                    <span className="text-right">D</span>
                    <span className="text-right">A</span>
                    <span className="text-right">K/D</span>
                    <span className="text-right">ADR</span>
                    <span className="text-right">HS%</span>
                </div>
                {/* Rows */}
                <div className="relative flex flex-col pb-1.5">
                    {sorted.map((p) => {
                        const k = parseInt(p.player_stats.Kills || "0");
                        const d = parseInt(p.player_stats.Deaths || "0");
                        const a = parseInt(p.player_stats.Assists || "0");
                        const hsRaw = p.player_stats["Headshots %"];
                        const hs = hsRaw
                            ? parseInt(hsRaw)
                            : k > 0
                              ? Math.round((parseInt(p.player_stats.Headshots || "0") / k) * 100)
                              : 0;
                        const kd = d > 0 ? (k / d).toFixed(2) : k.toFixed(2);
                        const adr = p.player_stats.ADR ?? "--";
                        const isMvp = p.player_id === mvpId;

                        return (
                            <Link
                                key={p.player_id}
                                href={`/player/${encodeURIComponent(p.nickname)}`}
                                className={`${SCOREBOARD_GRID} items-center border-b border-white/[0.045] px-6 py-[11px] text-foreground transition-colors hover:bg-cyan/[0.05]`}
                            >
                                <div className="flex min-w-0 items-center gap-[11px] overflow-hidden">
                                    <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/[0.14] bg-[radial-gradient(circle_at_30%_30%,#1A2B33,#0C0F14)] font-mono text-[11px] font-bold text-white/85">
                                        {p.nickname.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold">
                                        {p.nickname}
                                    </span>
                                    {isMvp && (
                                        <span
                                            title="Match MVP"
                                            className="flex flex-none items-center gap-1 rounded-full border border-orange/50 bg-orange/[0.09] px-2 py-[2px] font-mono text-[9px] font-bold tracking-[0.1em] text-orange-light shadow-[0_0_12px_rgba(255,85,0,0.25)]"
                                        >
                                            <Crown className="h-[10px] w-[10px]" />
                                            MVP
                                        </span>
                                    )}
                                </div>
                                <span className="tabular text-right font-mono text-[13px] font-semibold">
                                    {k}
                                </span>
                                <span className="tabular text-right font-mono text-[13px] text-muted-foreground">
                                    {d}
                                </span>
                                <span className="tabular text-right font-mono text-[13px] text-muted-foreground">
                                    {a}
                                </span>
                                <span
                                    className={`tabular text-right font-mono text-[13px] ${
                                        parseFloat(kd) >= 1 ? "text-success" : "text-danger"
                                    }`}
                                >
                                    {kd}
                                </span>
                                <span className="tabular text-right font-mono text-[13px] text-text-bright">
                                    {adr}
                                </span>
                                <span className="tabular text-right font-mono text-[13px] text-text-bright">
                                    {hs}%
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="mx-auto max-w-[1280px] px-5 py-[34px] sm:px-10">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-[22px]"
            >
                {/* Back */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-cyan"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                </button>

                {/* Score header */}
                <section className="relative overflow-hidden rounded-[24px] border border-white/[0.09] shadow-[0_8px_32px_rgba(0,0,0,0.55)]">
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-[linear-gradient(135deg,#24405266,#0B0F13),linear-gradient(180deg,rgba(7,7,8,0.2),rgba(7,7,8,0.92))]"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-[radial-gradient(600px_circle_at_20%_0%,rgba(0,229,255,0.10),transparent_60%)]"
                    />
                    <div className="relative grid grid-cols-1 items-center gap-6 px-6 py-[38px] sm:px-11 lg:grid-cols-[1fr_auto_1fr] lg:gap-[30px]">
                        {/* Map info */}
                        <div className="flex items-center gap-[18px]">
                            <div
                                className="flex h-[42px] w-16 items-center justify-center rounded-[9px] border border-white/[0.14] font-mono text-[11px] font-bold tracking-[0.08em] text-white/90"
                                style={{ background: tile }}
                            >
                                {mapClean.slice(0, 3).toUpperCase()}
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-2xl font-extrabold capitalize tracking-[-0.01em]">
                                    {mapClean}
                                </span>
                                <span className="font-mono text-[11.5px] text-muted-foreground">
                                    {dateMeta}
                                </span>
                            </div>
                        </div>

                        {/* Score */}
                        <div className="flex items-center justify-center gap-[22px]">
                            <div className="flex flex-col items-center gap-[5px]">
                                <span
                                    className={`max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] tracking-[0.2em] ${isTeam1Winner ? "text-cyan" : "text-muted-foreground"}`}
                                >
                                    {match.teams.faction1.nickname.toUpperCase()}
                                </span>
                                <span
                                    className={`tabular font-mono text-[56px] font-bold leading-none ${
                                        isTeam1Winner
                                            ? "text-cyan [text-shadow:0_0_34px_rgba(0,229,255,0.55)]"
                                            : "text-text-faint"
                                    }`}
                                >
                                    {score1}
                                </span>
                                <span
                                    className={`font-mono text-[10px] tracking-[0.16em] ${isTeam1Winner ? "text-success" : "text-text-faint"}`}
                                >
                                    {isTeam1Winner ? "WINNER" : "DEFEAT"}
                                </span>
                            </div>
                            <span className="pb-3.5 font-mono text-[26px] text-text-faint">:</span>
                            <div className="flex flex-col items-center gap-[5px]">
                                <span
                                    className={`max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] tracking-[0.2em] ${!isTeam1Winner ? "text-cyan" : "text-muted-foreground"}`}
                                >
                                    {match.teams.faction2.nickname.toUpperCase()}
                                </span>
                                <span
                                    className={`tabular font-mono text-[56px] font-bold leading-none ${
                                        !isTeam1Winner
                                            ? "text-cyan [text-shadow:0_0_34px_rgba(0,229,255,0.55)]"
                                            : "text-text-faint"
                                    }`}
                                >
                                    {score2}
                                </span>
                                <span
                                    className={`font-mono text-[10px] tracking-[0.16em] ${!isTeam1Winner ? "text-success" : "text-text-faint"}`}
                                >
                                    {!isTeam1Winner ? "WINNER" : "DEFEAT"}
                                </span>
                            </div>
                        </div>

                        {/* Faceit link — orange is part of the brand-mark exception */}
                        <div className="flex lg:justify-end">
                            <a
                                href={faceitUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-[42px] items-center gap-[9px] rounded-xl border border-orange/55 bg-orange/[0.08] px-5 text-sm font-semibold text-orange-light transition-[box-shadow,background-color,color] duration-200 hover:bg-orange/[0.14] hover:text-[#FF9A66] hover:shadow-[0_0_22px_rgba(255,85,0,0.3)]"
                            >
                                Open on Faceit
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </div>
                    </div>
                </section>

                {/* Team scoreboards */}
                {round ? (
                    <div className="grid grid-cols-1 gap-[22px]">
                        <TeamPanel
                            team={team1}
                            teamName={match.teams.faction1.nickname}
                            isWinner={isTeam1Winner}
                            accent="cyan"
                        />
                        <TeamPanel
                            team={team2}
                            teamName={match.teams.faction2.nickname}
                            isWinner={!isTeam1Winner}
                            accent="violet"
                        />
                    </div>
                ) : (
                    <div className="hud-glass p-8 text-center text-muted-foreground">
                        Detailed scoreboard is not available for this match.
                    </div>
                )}
            </motion.div>
        </div>
    );
}
