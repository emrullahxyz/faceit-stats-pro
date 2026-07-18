"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
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

// Map tile codes + gradients (design: "Holographic HUD" match rows)
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

function timeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp * 1000;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(mins, 1)}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1w ago" : `${weeks}w ago`;
}

export function MatchList({ matches, currentPlayerId, playerNickname = "" }: MatchListProps) {
    const router = useRouter();
    const [matchStats, setMatchStats] = useState<Record<string, MatchStats>>({});
    const [loading, setLoading] = useState(() => matches.length > 0);

    // Find player stats in match stats response
    const findPlayerStats = useCallback(function(stats: { rounds?: Array<{ round_stats?: { Map?: string }, teams?: Array<{ players?: Array<{ player_id: string, player_stats: Record<string, string> }> }> }> }, playerId: string): MatchStats {
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
    }, []);

    // Fetch stats for all matches
    useEffect(() => {
        let cancelled = false;

        async function fetchMatchStats(matchId: string) {
            try {
                const response = await fetch(`/api/match-stats/${matchId}`);
                if (response.ok) {
                    const data = await response.json();
                    return { matchId, stats: data };
                }
            } catch (error) {
                console.error(`Failed to fetch stats for match ${matchId}`, error);
            }
            return { matchId, stats: null };
        }

        async function fetchAllMatchStats() {
            setLoading(true);
            const statsMap: Record<string, MatchStats> = {};
            const failedIds: string[] = [];

            // Fetch stats in parallel (max 5 at a time to avoid rate limiting)
            const batchSize = 5;
            for (let i = 0; i < matches.length; i += batchSize) {
                const batch = matches.slice(i, i + batchSize);
                const results = await Promise.all(
                    batch.map((match) => fetchMatchStats(match.match_id))
                );

                if (cancelled) return;

                results.forEach(({ matchId, stats }) => {
                    if (stats) {
                        // Find player stats in the response
                        const playerStats = findPlayerStats(stats, currentPlayerId);
                        statsMap[matchId] = playerStats;
                    } else {
                        failedIds.push(matchId);
                    }
                });
            }

            if (cancelled) return;
            setMatchStats(statsMap);
            setLoading(false);

            // Retry failed fetches once after a short delay (server throttles+caches,
            // so failures are usually transient)
            if (failedIds.length > 0) {
                await new Promise((resolve) => setTimeout(resolve, 2500));
                if (cancelled) return;

                const recovered: Record<string, MatchStats> = {};
                const retryBatchSize = 3;
                for (let i = 0; i < failedIds.length; i += retryBatchSize) {
                    const batch = failedIds.slice(i, i + retryBatchSize);
                    const results = await Promise.all(
                        batch.map((matchId) => fetchMatchStats(matchId))
                    );

                    if (cancelled) return;

                    results.forEach(({ matchId, stats }) => {
                        if (stats) {
                            recovered[matchId] = findPlayerStats(stats, currentPlayerId);
                        }
                    });
                }

                if (cancelled) return;
                if (Object.keys(recovered).length > 0) {
                    setMatchStats((prev) => ({ ...prev, ...recovered }));
                }
            }
        }

        if (matches.length > 0) {
            fetchAllMatchStats();
        }

        return () => {
            cancelled = true;
        };
    }, [matches, currentPlayerId, findPlayerStats]);

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
        let cleanUrl = faceitUrl;
        try {
            cleanUrl = decodeURIComponent(faceitUrl);
        } catch {
            // If decoding fails, use original URL
        }
        cleanUrl = cleanUrl.replace(/\/{lang}/g, "");
        window.open(cleanUrl, "_blank");
    };

    const GRID =
        "grid grid-cols-[minmax(140px,200px)_80px_64px_120px_70px_70px_70px_1fr] gap-3";

    if (!matches || matches.length === 0) {
        return (
            <section className="hud-glass p-7">
                <span className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">
                    MATCH HISTORY
                </span>
                <p className="py-8 text-center text-muted-foreground">
                    No recent matches found.
                </p>
            </section>
        );
    }

    return (
        <section className="hud-glass relative overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-7 pb-4 pt-6">
                <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">
                        MATCH HISTORY
                    </span>
                    <span className="text-[17px] font-bold">
                        Last {matches.length} matches
                    </span>
                </div>
                {playerNickname && (
                    <a
                        href={`https://www.faceit.com/en/players/${playerNickname}/stats/cs2`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] text-orange-light transition-colors hover:text-orange"
                    >
                        FULL HISTORY
                        <ExternalLink className="h-3 w-3" />
                    </a>
                )}
            </div>

            {/* Column heads */}
            <div
                className={`${GRID} border-b border-white/[0.07] px-7 py-2 font-mono text-[10px] tracking-[0.16em] text-text-faint`}
            >
                <span>MAP</span>
                <span>SCORE</span>
                <span>RESULT</span>
                <span>K / D / A</span>
                <span>ADR</span>
                <span>HS%</span>
                <span>K/R</span>
                <span className="text-right">PLAYED</span>
            </div>

            {/* Rows */}
            <div className="flex flex-col">
                {matches.map((match) => {
                    const won = isWin(match);
                    const { playerScore, opponentScore } = getScore(match);
                    const stats = matchStats[match.match_id];
                    const mapKey = (stats?.map || "").toLowerCase();
                    const tile = MAP_TILES[mapKey] || DEFAULT_TILE;
                    const statCell = (v?: string) =>
                        stats ? (
                            <span className="tabular font-mono text-[13px] text-text-bright">
                                {v || "--"}
                            </span>
                        ) : loading ? (
                            <span className="hud-skeleton inline-block h-3 w-10" />
                        ) : (
                            <span className="font-mono text-[13px] text-text-faint">--</span>
                        );

                    return (
                        <a
                            key={match.match_id}
                            href={`/match/${match.match_id}`}
                            onClick={(e) => handleMatchClick(e, match.match_id)}
                            className={`${GRID} items-center border-b border-white/[0.045] px-7 py-3 text-foreground transition-colors hover:bg-cyan/[0.045]`}
                        >
                            {/* Map */}
                            <div className="flex items-center gap-3">
                                <div
                                    className="flex h-7 w-11 items-center justify-center rounded-[7px] border border-white/10 font-mono text-[9px] font-bold tracking-[0.08em] text-white/85"
                                    style={{ background: tile }}
                                >
                                    {stats?.map
                                        ? stats.map.slice(0, 3).toUpperCase()
                                        : "CS2"}
                                </div>
                                <span className="text-sm font-semibold capitalize">
                                    {stats?.map || "—"}
                                </span>
                            </div>

                            {/* Score */}
                            <span className="tabular font-mono text-[13.5px] text-text-bright">
                                {playerScore}-{opponentScore}
                            </span>

                            {/* Result pill */}
                            <span
                                className={`justify-self-start rounded-full px-2.5 py-[3px] font-mono text-[10.5px] font-bold tracking-[0.1em] ${
                                    won
                                        ? "border border-success/35 bg-success/[0.08] text-success"
                                        : "border border-danger/35 bg-danger/[0.08] text-danger"
                                }`}
                            >
                                {won ? "WIN" : "LOSS"}
                            </span>

                            {/* K/D/A, ADR, HS%, K/R */}
                            {statCell(
                                stats
                                    ? `${stats.kills} / ${stats.deaths} / ${stats.assists}`
                                    : undefined
                            )}
                            {statCell(stats?.adr)}
                            {statCell(stats?.hs ? `${stats.hs}%` : undefined)}
                            {statCell(stats?.kr)}

                            {/* Played + Faceit link */}
                            <div className="flex items-center justify-end gap-2">
                                <span className="font-mono text-[11.5px] text-text-faint">
                                    {timeAgo(match.finished_at)}
                                </span>
                                <button
                                    onClick={(e) => handleViewOnFaceit(e, match.faceit_url)}
                                    title="View on Faceit"
                                    className="text-text-faint transition-colors hover:text-orange-light"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                </button>
                            </div>
                        </a>
                    );
                })}
            </div>
        </section>
    );
}
