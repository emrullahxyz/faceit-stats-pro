"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, SearchX, TriangleAlert } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { comparePlayersAction, findSharedMatches } from "@/app/actions";
import type { FaceitPlayer, FaceitPlayerStats } from "@/lib/api";
import FavoriteButton from "@/components/features/FavoriteButton";

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

function LevelBadge({ level, size = 34 }: { level: number; size?: number }) {
    return (
        <div
            className="flex items-center justify-center rounded-full border-2 border-orange bg-[radial-gradient(circle_at_32%_28%,rgba(255,85,0,0.28),rgba(255,85,0,0.10))] font-mono font-bold text-orange-light shadow-[0_0_16px_rgba(255,85,0,0.4)]"
            style={{ width: size, height: size, fontSize: size * 0.41 }}
        >
            {level}
        </div>
    );
}

interface ComparedPlayer {
    player: FaceitPlayer;
    stats: FaceitPlayerStats | null;
}

// One side of the versus card. Player 1 = cyan (right-aligned), player 2 = violet.
function VersusColumn({
    data,
    side,
    winCount,
    totalStats,
}: {
    data: ComparedPlayer;
    side: 1 | 2;
    winCount: number;
    totalStats: number;
}) {
    const { player } = data;
    const gameData = player.games?.cs2 || player.games?.csgo;
    const level = gameData?.skill_level || 1;
    const isP1 = side === 1;
    const accent = isP1 ? "cyan" : "violet";

    return (
        <div
            className={`flex flex-col gap-3 pt-2 ${isP1 ? "items-center lg:items-end lg:text-right" : "items-center lg:items-start"}`}
        >
            <Link href={`/player/${player.nickname}`}>
                <Avatar
                    className={`h-24 w-24 border-2 ${
                        isP1
                            ? "border-cyan/55 shadow-[0_0_38px_rgba(0,229,255,0.3)]"
                            : "border-violet/55 shadow-[0_0_38px_rgba(139,92,246,0.3)]"
                    }`}
                >
                    <AvatarImage src={player.avatar} alt={player.nickname} />
                    <AvatarFallback
                        className={`bg-[radial-gradient(circle_at_30%_30%,#1A2B33,#0C0F14)] font-mono text-[28px] font-bold ${isP1 ? "text-cyan" : "text-violet-light"}`}
                    >
                        {player.nickname.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </Link>
            <Link
                href={`/player/${player.nickname}`}
                className={`text-2xl font-extrabold text-foreground transition-colors hover:text-${accent}`}
            >
                {player.nickname}
            </Link>
            <div className="flex items-center gap-2.5">
                {player.country && (
                    <span className="rounded-md border border-white/[0.12] px-[7px] py-[2px] font-mono text-[11px] text-muted-foreground">
                        {player.country.toUpperCase()}
                    </span>
                )}
                <LevelBadge level={level} />
                <FavoriteButton
                    player={{
                        player_id: player.player_id,
                        nickname: player.nickname,
                        avatar: player.avatar,
                        skill_level: level,
                    }}
                    size="sm"
                />
            </div>
            <div
                className={`font-mono text-[11px] tracking-[0.14em] ${
                    winCount > totalStats / 2 ? (isP1 ? "text-cyan" : "text-violet-light") : "text-muted-foreground"
                }`}
            >
                {totalStats} İSTATİSTİKTEN {winCount}&apos;İNDE ÖNDE
            </div>
        </div>
    );
}

export default function ComparePage() {
    const [player1, setPlayer1] = useState("EarlyDomDom");
    const [player2, setPlayer2] = useState("");
    const [isPending, startTransition] = useTransition();
    const [compareResult, setCompareResult] = useState<{
        player1: ComparedPlayer | null;
        player2: ComparedPlayer | null;
    } | null>(null);
    const [sharedMatches, setSharedMatches] = useState<Array<{
        matchId: string;
        faceitUrl: string;
        date: number;
        result: string;
        sameTeam: boolean;
    }>>([]);
    const [sharedError, setSharedError] = useState<string | null>(null);
    const [sharedInfo, setSharedInfo] = useState<{
        checkedCounts: { player1: number; player2: number };
        partial: boolean;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleMatchClick = (e: React.MouseEvent, matchId: string) => {
        if (e.ctrlKey || e.metaKey) {
            window.open(`/match/${matchId}`, "_blank");
            return;
        }
        router.push(`/match/${matchId}`);
    };

    const handleMatchMouseDown = (e: React.MouseEvent, matchId: string) => {
        if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            window.open(`/match/${matchId}`, "_blank");
        }
    };

    const cleanFaceitUrl = (url: string) => {
        try {
            return decodeURIComponent(url).replace(/\/{lang}/g, "");
        } catch {
            return url.replace(/\/{lang}/g, "");
        }
    };

    const runCompare = () => {
        if (!player1.trim() || !player2.trim()) return;

        setError(null);
        setCompareResult(null);
        setSharedMatches([]);
        setSharedError(null);
        setSharedInfo(null);

        startTransition(async () => {
            const result = await comparePlayersAction(player1.trim(), player2.trim());

            if (result.error) {
                setError(result.error);
                return;
            }

            setCompareResult({
                player1: result.player1,
                player2: result.player2,
            });

            const shared = await findSharedMatches(player1.trim(), player2.trim());
            if (shared.error) {
                setSharedError(shared.error);
            } else {
                setSharedMatches(shared.sharedMatches);
                setSharedInfo({
                    checkedCounts: shared.checkedCounts,
                    partial: shared.partial,
                });
            }
        });
    };

    const handleCompare = (e: React.FormEvent) => {
        e.preventDefault();
        runCompare();
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString("tr-TR", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    // Central stat spine — computed from real lifetime stats
    const p1 = compareResult?.player1;
    const p2 = compareResult?.player2;
    const statRows =
        p1 && p2
            ? (
                  [
                      {
                          label: "ELO",
                          v1: p1.player.games?.cs2?.faceit_elo || p1.player.games?.csgo?.faceit_elo || 0,
                          v2: p2.player.games?.cs2?.faceit_elo || p2.player.games?.csgo?.faceit_elo || 0,
                          fmt: (n: number) => n.toLocaleString("en-US"),
                      },
                      {
                          label: "K/D ORANI",
                          v1: parseFloat(findStat(p1.stats?.lifetime, ["Average K/D Ratio", "K/D Ratio"])),
                          v2: parseFloat(findStat(p2.stats?.lifetime, ["Average K/D Ratio", "K/D Ratio"])),
                          fmt: (n: number) => n.toFixed(2),
                      },
                      {
                          label: "KAZANMA ORANI",
                          v1: parseFloat(findStat(p1.stats?.lifetime, ["Win Rate %", "Winrate"])),
                          v2: parseFloat(findStat(p2.stats?.lifetime, ["Win Rate %", "Winrate"])),
                          fmt: (n: number) => `${n.toFixed(1)}%`,
                      },
                      {
                          label: "HS %",
                          v1: parseFloat(findStat(p1.stats?.lifetime, ["Average Headshots %", "Headshots %"])),
                          v2: parseFloat(findStat(p2.stats?.lifetime, ["Average Headshots %", "Headshots %"])),
                          fmt: (n: number) => `${n.toFixed(1)}%`,
                      },
                      {
                          label: "MAÇ",
                          v1: parseInt(findStat(p1.stats?.lifetime, ["Matches", "Total Matches"])),
                          v2: parseInt(findStat(p2.stats?.lifetime, ["Matches", "Total Matches"])),
                          fmt: (n: number) => n.toLocaleString("en-US"),
                      },
                  ] as const
              ).map((r) => {
                  const max = Math.max(r.v1, r.v2) || 1;
                  return {
                      ...r,
                      p1Wins: r.v1 > r.v2,
                      p2Wins: r.v2 > r.v1,
                      w1: (r.v1 / max) * 100,
                      w2: (r.v2 / max) * 100,
                  };
              })
            : [];
    const p1WinCount = statRows.filter((r) => r.p1Wins).length;
    const p2WinCount = statRows.filter((r) => r.p2Wins).length;

    return (
        <div className="relative overflow-hidden">
            {/* Ambient glows: cyan left / violet right */}
            <div
                aria-hidden
                className="pointer-events-none absolute -left-[160px] -top-[140px] h-[620px] w-[760px] bg-[radial-gradient(closest-side,rgba(0,229,255,0.10),transparent_70%)]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -right-[160px] -top-[140px] h-[620px] w-[760px] bg-[radial-gradient(closest-side,rgba(139,92,246,0.12),transparent_70%)]"
            />

            <main className="relative mx-auto flex max-w-[1280px] flex-col gap-[26px] px-5 pb-[100px] pt-10 sm:px-10">
                {/* Title */}
                <div className="flex flex-col gap-2 text-center">
                    <div className="font-mono text-[11px] tracking-[0.3em] text-violet">
                        KAFA KAFAYA
                    </div>
                    <h1 className="m-0 text-[38px] font-extrabold tracking-[-0.01em]">
                        Veriyle sonuçlandır.
                    </h1>
                </div>

                {/* VS search */}
                <form
                    onSubmit={handleCompare}
                    className="mx-auto flex w-full max-w-[980px] flex-col gap-[26px]"
                >
                    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr] sm:gap-[26px]">
                        <input
                            type="text"
                            placeholder="1. oyuncunun nickname'i..."
                            value={player1}
                            onChange={(e) => setPlayer1(e.target.value)}
                            className="h-[58px] rounded-[14px] border border-cyan/30 bg-[rgba(12,14,17,0.72)] px-[22px] text-base text-foreground outline-none backdrop-blur-[14px] [box-shadow:0_0_24px_rgba(0,229,255,0.06)] focus:animate-pulse-glow sm:text-right"
                        />
                        <div className="animate-vs-shimmer bg-gradient-to-r from-cyan to-violet bg-clip-text text-center font-mono text-[30px] font-bold tracking-[0.08em] text-transparent">
                            VS
                        </div>
                        <input
                            type="text"
                            placeholder="2. oyuncunun nickname'i..."
                            value={player2}
                            onChange={(e) => setPlayer2(e.target.value)}
                            className="h-[58px] rounded-[14px] border border-violet/35 bg-[rgba(12,14,17,0.72)] px-[22px] text-base text-foreground outline-none backdrop-blur-[14px] [box-shadow:0_0_24px_rgba(139,92,246,0.07)] focus:animate-pulse-glow"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!player1.trim() || !player2.trim() || isPending}
                        className="flex h-12 items-center gap-2 self-center rounded-full bg-gradient-to-r from-cyan to-[#4FC3F7] px-[42px] text-[15px] font-bold tracking-[0.06em] text-[#04252B] shadow-[0_0_34px_rgba(0,229,255,0.35)] transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-[0_0_54px_rgba(0,229,255,0.55)] disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isPending ? "KARŞILAŞTIRILIYOR..." : "KARŞILAŞTIR"}
                    </button>
                </form>

                {/* Compare error */}
                {error && (
                    <div className="mx-auto w-full max-w-[980px] rounded-[14px] border border-danger/35 bg-danger/[0.07] p-4 text-center text-sm text-danger">
                        {error}
                    </div>
                )}

                {/* Versus card */}
                {p1 && p2 && (
                    <section className="hud-glass relative overflow-hidden rounded-[24px] px-6 py-[38px] sm:px-11">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,229,255,0.05),transparent_32%,transparent_68%,rgba(139,92,246,0.06))]"
                        />
                        <div className="relative grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_minmax(430px,560px)_1fr] lg:gap-10">
                            <VersusColumn
                                data={p1}
                                side={1}
                                winCount={p1WinCount}
                                totalStats={statRows.length}
                            />

                            {/* Stat spine */}
                            <div className="flex flex-col gap-1.5">
                                {statRows.map((r) => (
                                    <div
                                        key={r.label}
                                        className="grid grid-cols-[86px_1fr_86px] items-center gap-3.5 border-b border-white/[0.05] px-1 py-[11px] sm:grid-cols-[110px_1fr_110px]"
                                    >
                                        <span
                                            className={`tabular text-right font-mono text-[19px] font-bold ${
                                                r.p1Wins
                                                    ? "text-cyan [text-shadow:0_0_18px_rgba(0,229,255,0.5)]"
                                                    : "text-text-faint"
                                            }`}
                                        >
                                            {Number.isFinite(r.v1) ? r.fmt(r.v1) : "--"}
                                        </span>
                                        <div className="flex flex-col gap-[7px]">
                                            <span className="text-center font-mono text-[10px] tracking-[0.22em] text-muted-foreground">
                                                {r.label}
                                            </span>
                                            <div className="grid h-1.5 grid-cols-2 gap-[3px]">
                                                <div className="flex justify-end overflow-hidden rounded-[3px] bg-white/[0.05]">
                                                    <div
                                                        className={`rounded-[3px] bg-gradient-to-r from-cyan/25 to-cyan ${r.p1Wins ? "shadow-[0_0_12px_rgba(0,229,255,0.6)]" : ""}`}
                                                        style={{ width: `${r.w1}%` }}
                                                    />
                                                </div>
                                                <div className="overflow-hidden rounded-[3px] bg-white/[0.05]">
                                                    <div
                                                        className={`h-full rounded-[3px] bg-gradient-to-r from-violet to-violet/25 ${r.p2Wins ? "shadow-[0_0_12px_rgba(139,92,246,0.6)]" : ""}`}
                                                        style={{ width: `${r.w2}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <span
                                            className={`tabular font-mono text-[19px] font-bold ${
                                                r.p2Wins
                                                    ? "text-violet-light [text-shadow:0_0_18px_rgba(139,92,246,0.5)]"
                                                    : "text-text-faint"
                                            }`}
                                        >
                                            {Number.isFinite(r.v2) ? r.fmt(r.v2) : "--"}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <VersusColumn
                                data={p2}
                                side={2}
                                winCount={p2WinCount}
                                totalStats={statRows.length}
                            />
                        </div>
                    </section>
                )}

                {/* Shared-history error / partial notice */}
                {compareResult && sharedError && (
                    <div className="flex items-center gap-3.5 rounded-[14px] border border-warning/35 bg-warning/[0.07] px-5 py-3.5 shadow-[0_0_24px_rgba(255,180,0,0.05)]">
                        <TriangleAlert className="h-[18px] w-[18px] flex-none text-warning" />
                        <span className="text-[13.5px] text-warning-light">
                            Ortak maç geçmişi yüklenemedi (Faceit API hatası). Bu genellikle
                            geçicidir.
                        </span>
                        <button
                            onClick={runCompare}
                            disabled={isPending}
                            className="ml-auto h-[30px] flex-none rounded-lg border border-warning/40 px-3.5 font-mono text-[11px] tracking-[0.1em] text-warning transition-colors hover:bg-warning/10 disabled:opacity-50"
                        >
                            TEKRAR DENE
                        </button>
                    </div>
                )}
                {compareResult && !sharedError && sharedInfo?.partial && (
                    <div className="flex items-center gap-3.5 rounded-[14px] border border-warning/35 bg-warning/[0.07] px-5 py-3.5 shadow-[0_0_24px_rgba(255,180,0,0.05)]">
                        <TriangleAlert className="h-[18px] w-[18px] flex-none text-warning" />
                        <span className="text-[13.5px] text-warning-light">
                            Kısmi sonuçlar — Faceit API istek limitine takıldı. Son{" "}
                            {sharedInfo.checkedCounts.player1} + {sharedInfo.checkedCounts.player2}{" "}
                            maç tarandı; daha eski maçlar taranamamış olabilir.
                        </span>
                        <button
                            onClick={runCompare}
                            disabled={isPending}
                            className="ml-auto h-[30px] flex-none rounded-lg border border-warning/40 px-3.5 font-mono text-[11px] tracking-[0.1em] text-warning transition-colors hover:bg-warning/10 disabled:opacity-50"
                        >
                            TEKRAR DENE
                        </button>
                    </div>
                )}

                {/* Shared match history */}
                {compareResult && !sharedError && (
                    sharedMatches.length > 0 ? (
                        <section className="hud-glass relative overflow-hidden">
                            <div className="flex items-center justify-between px-7 pb-4 pt-6">
                                <div className="flex flex-col gap-1">
                                    <span className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">
                                        ORTAK MAÇ GEÇMİŞİ
                                    </span>
                                    <span className="text-[17px] font-bold">
                                        Birlikte {sharedMatches.length} maç
                                    </span>
                                </div>
                                <span className="hidden font-mono text-[11px] text-text-faint sm:block">
                                    SONUÇLAR {p1?.player.nickname.toUpperCase()} REFERANSLI
                                </span>
                            </div>
                            <div className="grid grid-cols-[130px_90px_130px_1fr] gap-3 border-b border-white/[0.07] px-7 py-2 font-mono text-[10px] tracking-[0.16em] text-text-faint">
                                <span>TARİH</span>
                                <span>SONUÇ</span>
                                <span>İLİŞKİ</span>
                                <span />
                            </div>
                            {sharedMatches.map((match) => (
                                <div
                                    key={match.matchId}
                                    onClick={(e) => handleMatchClick(e, match.matchId)}
                                    onMouseDown={(e) => handleMatchMouseDown(e, match.matchId)}
                                    className="grid cursor-pointer grid-cols-[130px_90px_130px_1fr] items-center gap-3 border-b border-white/[0.045] px-7 py-[13px] text-foreground transition-colors hover:bg-cyan/[0.045]"
                                >
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {formatDate(match.date)}
                                    </span>
                                    <span
                                        className={`justify-self-start rounded-full px-2.5 py-[3px] font-mono text-[10.5px] font-bold tracking-[0.1em] ${
                                            match.result === "WIN"
                                                ? "border border-success/35 bg-success/[0.08] text-success"
                                                : "border border-danger/35 bg-danger/[0.08] text-danger"
                                        }`}
                                    >
                                        {match.result === "WIN" ? "GALİP" : "MAĞLUP"}
                                    </span>
                                    <span
                                        className={`justify-self-start rounded-full px-2.5 py-[3px] font-mono text-[10.5px] font-bold tracking-[0.12em] ${
                                            match.sameTeam
                                                ? "border border-cyan/35 bg-cyan/[0.08] text-cyan"
                                                : "border border-violet/40 bg-violet/[0.08] text-violet-light"
                                        }`}
                                    >
                                        {match.sameTeam ? "MÜTTEFİK" : "RAKİP"}
                                    </span>
                                    <span className="flex items-center justify-end gap-3 font-mono text-[11px] text-text-faint">
                                        MAÇI GÖR →
                                        <a
                                            href={cleanFaceitUrl(match.faceitUrl)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            title="Faceit'te aç"
                                            className="text-text-faint transition-colors hover:text-orange-light"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </span>
                                </div>
                            ))}
                        </section>
                    ) : (
                        <section className="flex flex-col items-center gap-3 rounded-card border border-dashed border-white/[0.14] bg-white/[0.02] px-6 py-11 text-center">
                            <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border border-violet/30 bg-violet/[0.07]">
                                <SearchX className="h-6 w-6 text-violet" />
                            </div>
                            <div className="text-[17px] font-bold">Ortak maç bulunamadı</div>
                            <div className="max-w-[420px] text-[13.5px] font-light text-muted-foreground">
                                Bu oyuncular {p1?.player.nickname} adlı oyuncunun son{" "}
                                {sharedInfo?.checkedCounts.player1 ?? 0} ve {p2?.player.nickname}{" "}
                                adlı oyuncunun son {sharedInfo?.checkedCounts.player2 ?? 0} maçında
                                aynı lobide görünmemiş.
                            </div>
                        </section>
                    )
                )}
            </main>
        </div>
    );
}
