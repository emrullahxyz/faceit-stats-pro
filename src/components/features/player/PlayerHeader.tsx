"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CountUp } from "@/components/ui/count-up";
import { ExternalLink, Gamepad2, Loader2, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import type { FaceitPlayer } from "@/lib/api";

interface PlayerHeaderProps {
    player: FaceitPlayer;
    onLiveMatchFound?: (matchId: string) => void;
}

export function PlayerHeader({ player, onLiveMatchFound }: PlayerHeaderProps) {
    const [checkingLive, setCheckingLive] = useState(false);

    const gameData = player.games?.cs2 || player.games?.csgo;
    const level = gameData?.skill_level || 1;
    const elo = gameData?.faceit_elo || 0;

    const faceitUrl = (() => {
        try {
            return decodeURIComponent(player.faceit_url).replace(/\/{lang}/g, "");
        } catch {
            return player.faceit_url.replace(/\/{lang}/g, "");
        }
    })();

    const checkForLiveMatch = async () => {
        setCheckingLive(true);
        try {
            const response = await fetch(`/api/scrape-match/${player.nickname}`);
            const data = await response.json();

            if (data.inMatch && data.matchId) {
                onLiveMatchFound?.(data.matchId);
                window.location.href = `/match-analyzer?matchId=${data.matchId}`;
            } else {
                toast.info("Maçta değil", {
                    description: `${player.nickname} şu anda bir maçta değil.`,
                });
            }
        } catch (error) {
            console.error("Error checking live match:", error);
            toast.error("Canlı maç kontrol edilemedi", {
                description: "Lütfen daha sonra tekrar deneyin.",
            });
        } finally {
            setCheckingLive(false);
        }
    };

    return (
        <section className="hud-glass flex flex-wrap items-center gap-x-[26px] gap-y-4 px-8 py-7">
            {/* Avatar */}
            <Avatar className="h-[78px] w-[78px] flex-none border border-cyan/35 shadow-[0_0_28px_rgba(0,229,255,0.18)]">
                <AvatarImage src={player.avatar} alt={player.nickname} />
                <AvatarFallback className="bg-[radial-gradient(circle_at_30%_30%,#1A2B33,#0C0F14)] font-mono text-2xl font-bold text-cyan">
                    {player.nickname.slice(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>

            {/* Name + meta */}
            <div className="flex flex-col gap-[7px]">
                <div className="flex items-center gap-3">
                    <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.01em]">
                        {player.nickname}
                    </h1>
                    {player.country && (
                        <span className="rounded-md border border-white/[0.12] px-2 py-[3px] font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
                            {player.country.toUpperCase()}
                        </span>
                    )}
                    <a
                        href={faceitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open on Faceit"
                        className="text-muted-foreground transition-colors hover:text-orange-light"
                    >
                        <ExternalLink className="h-[18px] w-[18px]" />
                    </a>
                </div>
                <div className="text-[13px] font-light text-muted-foreground">
                    {gameData?.region ? `${gameData.region.toUpperCase()} · ` : ""}
                    CS2 · Faceit
                </div>
            </div>

            {/* Divider */}
            <div className="mx-1.5 hidden w-px self-stretch bg-white/[0.08] sm:block" />

            {/* Current Elo */}
            <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">
                    GÜNCEL ELO
                </span>
                <span className="tabular font-mono text-[38px] font-bold leading-none text-cyan glow-text-cyan">
                    <CountUp value={elo} />
                </span>
            </div>

            {/* Level badge (orange is reserved for this) */}
            <div className="ml-2 flex flex-col items-center gap-1.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-orange bg-[radial-gradient(circle_at_32%_28%,rgba(255,85,0,0.28),rgba(255,85,0,0.10))] font-mono text-[19px] font-bold text-orange-light shadow-[0_0_22px_rgba(255,85,0,0.4)]">
                    {level}
                </div>
                <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground">
                    SEVİYE
                </span>
            </div>

            {/* Actions */}
            <div className="ml-auto flex gap-3">
                <Link
                    href={`/compare?player1=${encodeURIComponent(player.nickname)}`}
                    className="flex h-[42px] items-center gap-[9px] rounded-xl border border-cyan/50 bg-cyan/[0.08] px-5 text-sm font-semibold text-cyan transition-[box-shadow,background-color,color] duration-200 hover:bg-cyan/[0.14] hover:text-cyan-bright hover:shadow-[0_0_22px_rgba(0,229,255,0.3)]"
                >
                    <ArrowLeftRight className="h-[15px] w-[15px]" />
                    Karşılaştır
                </Link>
                <button
                    onClick={checkForLiveMatch}
                    disabled={checkingLive}
                    className="flex h-[42px] items-center gap-[9px] rounded-xl border border-white/[0.14] bg-white/[0.04] px-5 text-sm font-semibold text-foreground transition-colors hover:border-orange/60 disabled:opacity-60"
                >
                    {checkingLive ? (
                        <Loader2 className="h-[15px] w-[15px] animate-spin text-orange" />
                    ) : (
                        <Gamepad2 className="h-[15px] w-[15px] text-orange" />
                    )}
                    {checkingLive ? "Kontrol ediliyor..." : "Canlı Maç"}
                </button>
            </div>
        </section>
    );
}
