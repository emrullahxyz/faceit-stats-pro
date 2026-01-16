"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import {
    LineChart,
    Line,
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
    const [eloHistory, setEloHistory] = useState<EloDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchEloHistory() {
            try {
                setLoading(true);
                const response = await fetch(`/api/elo-history/${playerId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch ELO history");
                }
                const data = await response.json();
                setEloHistory(data.items || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load ELO history");
            } finally {
                setLoading(false);
            }
        }

        if (playerId) {
            fetchEloHistory();
        }
    }, [playerId]);

    if (loading) {
        return (
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg">ELO History</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading ELO history...</span>
                </CardContent>
            </Card>
        );
    }

    if (error || eloHistory.length === 0) {
        return (
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <CardTitle className="text-lg">ELO History</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                    <span className="text-muted-foreground">
                        {error || "No ELO history available"}
                    </span>
                </CardContent>
            </Card>
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
        <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">ELO History</CardTitle>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                            {eloChange >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className={eloChange >= 0 ? "text-green-500" : "text-red-500"}>
                                {eloChange >= 0 ? "+" : ""}{eloChange}
                            </span>
                        </div>
                        <span className="text-muted-foreground">
                            Last {eloHistory.length} matches
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Stats Row */}
                <div className="flex gap-6 mb-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Current: </span>
                        <span className="font-semibold text-foreground">{currentElo}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Peak: </span>
                        <span className="font-semibold text-green-500">{maxElo}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Lowest: </span>
                        <span className="font-semibold text-red-500">{minElo}</span>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff5500" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ff5500" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                            <XAxis
                                dataKey="displayDate"
                                tick={{ fill: "#888", fontSize: 11 }}
                                tickLine={{ stroke: "#444" }}
                                axisLine={{ stroke: "#444" }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                domain={[minElo - 50, maxElo + 50]}
                                tick={{ fill: "#888", fontSize: 11 }}
                                tickLine={{ stroke: "#444" }}
                                axisLine={{ stroke: "#444" }}
                                width={50}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#1a1a1a",
                                    border: "1px solid #333",
                                    borderRadius: "8px",
                                    color: "#fff",
                                }}
                                labelStyle={{ color: "#888" }}
                                formatter={(value) => [`${value} ELO`, "Rating"]}
                            />
                            <Area
                                type="monotone"
                                dataKey="elo"
                                stroke="#ff5500"
                                strokeWidth={2}
                                fill="url(#eloGradient)"
                                dot={false}
                                activeDot={{ r: 6, fill: "#ff5500", stroke: "#fff", strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
