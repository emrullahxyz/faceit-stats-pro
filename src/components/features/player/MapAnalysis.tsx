"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

// Radar geometry (design: 340x320 viewBox, 7 axes)
const CX = 170;
const CY = 158;
const R = 108;

function polar(i: number, n: number, r: number): [number, number] {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function ringPoints(n: number, f: number): string {
    return Array.from({ length: n }, (_, i) =>
        polar(i, n, R * f)
            .map((v) => v.toFixed(1))
            .join(",")
    ).join(" ");
}

export function MapAnalysis({ playerId }: MapAnalysisProps) {
    const [matchCount, setMatchCount] = useState<string>("25");

    // react-query caches per (player, limit), so flipping the LAST select back
    // to an already-loaded window renders instantly instead of refetching.
    const { data, isLoading: loading } = useQuery({
        queryKey: ["map-stats", playerId, matchCount],
        queryFn: async (): Promise<{ mapStats: PlayerMapStat[]; matchesAnalyzed: number }> => {
            const response = await fetch(`/api/map-stats/${playerId}?limit=${matchCount}`);
            const json = await response.json();
            return {
                mapStats: json.mapStats || [],
                matchesAnalyzed: json.matchesAnalyzed || 0,
            };
        },
    });
    const mapStats = data?.mapStats ?? [];
    const matchesAnalyzed = data?.matchesAnalyzed ?? 0;

    const header = (
        <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">
                    HARİTA ANALİZİ
                </span>
                <span className="text-[17px] font-bold">Harita başına kazanma oranı</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-text-faint">SON</span>
                <Select value={matchCount} onValueChange={setMatchCount}>
                    <SelectTrigger className="h-7 w-[70px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    if (loading) {
        return (
            <section className="hud-glass flex flex-col px-7 py-[26px]">
                {header}
                <div className="hud-skeleton mx-auto my-8 h-[220px] w-[220px] rounded-full" />
            </section>
        );
    }

    // Top maps by play count, radar-ready
    const sorted = [...mapStats].sort((a, b) => b.matches - a.matches);
    const radarMaps = sorted.slice(0, 7);
    const n = radarMaps.length;

    if (n < 3) {
        return (
            <section className="hud-glass flex flex-col px-7 py-[26px]">
                {header}
                <div className="flex flex-1 items-center justify-center py-10">
                    <span className="text-sm text-muted-foreground">
                        Henüz yeterli harita verisi yok
                    </span>
                </div>
            </section>
        );
    }

    const radarPoly = radarMaps
        .map((m, i) =>
            polar(i, n, Math.max(R * (m.winRate / 100), 4))
                .map((v) => v.toFixed(1))
                .join(",")
        )
        .join(" ");

    return (
        <section className="hud-glass flex flex-col px-7 py-[26px]">
            {header}
            <svg viewBox="0 0 340 320" className="mx-auto mt-2 block w-full max-w-[340px]">
                {/* Rings */}
                <g fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1">
                    <polygon points={ringPoints(n, 1)} />
                    <polygon points={ringPoints(n, 2 / 3)} />
                    <polygon points={ringPoints(n, 1 / 3)} />
                </g>
                {/* Axes */}
                <g stroke="rgba(255,255,255,0.06)" strokeWidth="1">
                    {radarMaps.map((m, i) => {
                        const [x, y] = polar(i, n, R);
                        return <line key={m.map} x1={CX} y1={CY} x2={x} y2={y} />;
                    })}
                </g>
                {/* Data polygon: violet fill + cyan dashed edge */}
                <polygon
                    points={radarPoly}
                    fill="rgba(139,92,246,0.18)"
                    stroke="#8B5CF6"
                    strokeWidth="2"
                />
                <polygon
                    points={radarPoly}
                    fill="none"
                    stroke="rgba(0,229,255,0.55)"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                />
                {/* Labels */}
                {radarMaps.map((m, i) => {
                    const [lx, ly] = polar(i, n, R + 30);
                    return (
                        <g key={m.map}>
                            <text
                                x={lx.toFixed(1)}
                                y={(ly + 1).toFixed(1)}
                                textAnchor="middle"
                                fill="#8A93A0"
                                fontSize="11"
                                fontFamily="var(--font-geist-mono), monospace"
                            >
                                {m.map.replace("de_", "").toUpperCase()}
                            </text>
                            <text
                                x={lx.toFixed(1)}
                                y={(ly + 15).toFixed(1)}
                                textAnchor="middle"
                                fill="#00E5FF"
                                fontSize="10.5"
                                fontWeight="600"
                                fontFamily="var(--font-geist-mono), monospace"
                            >
                                {m.winRate.toFixed(0)}%
                            </text>
                        </g>
                    );
                })}
            </svg>
            {matchesAnalyzed > 0 && (
                <span className="mt-1 text-center font-mono text-[11px] text-text-faint">
                    {matchesAnalyzed} MAÇ ANALİZ EDİLDİ
                </span>
            )}
        </section>
    );
}
