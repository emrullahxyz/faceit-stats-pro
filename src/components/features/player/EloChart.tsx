"use client";

import { useQuery } from "@tanstack/react-query";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from "recharts";

interface EloChartProps {
    playerId: string;
    playerNickname: string;
}

interface EloDataPoint {
    match_id: string;
    date: string;
    elo: number;
}

export function EloChart({ playerId, playerNickname }: EloChartProps) {
    const {
        data: eloHistory = [],
        isLoading: loading,
        error,
    } = useQuery({
        queryKey: ["elo-history", playerId],
        enabled: !!playerId,
        queryFn: async (): Promise<EloDataPoint[]> => {
            const response = await fetch(`/api/elo-history/${playerId}`);
            if (!response.ok) {
                throw new Error("Elo geçmişi yüklenemedi.");
            }
            const data = await response.json();
            return data.items || [];
        },
    });

    const header = (
        <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">
                ELO HISTORY
            </span>
            <span className="text-[17px] font-bold">
                {playerNickname}&apos;s progression
            </span>
        </div>
    );

    if (loading) {
        return (
            <section className="hud-glass px-7 py-[26px]">
                {header}
                <div className="mt-5 space-y-3">
                    <div className="hud-skeleton h-40 w-full rounded-xl" />
                    <div className="hud-skeleton h-3 w-2/3" />
                </div>
            </section>
        );
    }

    if (error || eloHistory.length === 0) {
        return (
            <section className="hud-glass px-7 py-[26px]">
                {header}
                <div className="flex items-center justify-center py-12">
                    <span className="text-muted-foreground">
                        {error ? error.message : "No ELO history available"}
                    </span>
                </div>
            </section>
        );
    }

    // Calculate stats
    const currentElo = eloHistory[eloHistory.length - 1]?.elo || 0;
    const startElo = eloHistory[0]?.elo || 0;
    const eloChange = currentElo - startElo;
    const maxElo = Math.max(...eloHistory.map((d) => d.elo));
    const minElo = Math.min(...eloHistory.map((d) => d.elo));

    // Format data for chart
    const chartData = eloHistory.map((item, index) => ({
        ...item,
        index: index + 1,
        displayDate: new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        }),
    }));

    return (
        <section className="hud-glass px-7 py-[26px]">
            <div className="mb-[18px] flex items-baseline justify-between">
                {header}
                <span
                    className={`font-mono text-xs ${eloChange >= 0 ? "text-success" : "text-danger"}`}
                >
                    {eloChange >= 0 ? "▲ +" : "▼ "}
                    {eloChange} this window
                </span>
            </div>

            {/* Chart */}
            <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.22} />
                                <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="0"
                            stroke="rgba(255,255,255,0.06)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="displayDate"
                            tick={{ fill: "#525C68", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            domain={[minElo - 50, maxElo + 50]}
                            tick={{ fill: "#525C68", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                            tickLine={false}
                            axisLine={false}
                            width={50}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#101014",
                                border: "1px solid rgba(0,229,255,0.25)",
                                borderRadius: "10px",
                                color: "#EAF0F2",
                                fontFamily: "var(--font-geist-mono)",
                                fontSize: 12,
                                boxShadow: "0 0 24px rgba(0,229,255,0.15)",
                            }}
                            labelStyle={{ color: "#8A93A0" }}
                            formatter={(value) => [`${value} ELO`, "Rating"]}
                        />
                        <Area
                            type="monotone"
                            dataKey="elo"
                            stroke="#00E5FF"
                            strokeWidth={2.4}
                            fill="url(#eloGradient)"
                            dot={false}
                            activeDot={{ r: 5, fill: "#070708", stroke: "#00E5FF", strokeWidth: 2.4 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* LOW / count / PEAK footer */}
            <div className="mt-2.5 flex justify-between font-mono text-[11px] text-text-faint">
                <span>{minElo} LOW</span>
                <span>{eloHistory.length} MATCHES · CURRENT {currentElo}</span>
                <span>{maxElo} PEAK</span>
            </div>
        </section>
    );
}
