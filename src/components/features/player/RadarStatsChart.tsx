"use client";

import { useEffect, useState } from "react";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2 } from "lucide-react";

interface RadarStatsChartProps {
    playerId: string;
    stats?: {
        averageKDRatio?: string;
        winRate?: string;
        averageHeadshotsPercent?: string;
        matches?: string;
    } | null;
}

interface RadarDataPoint {
    metric: string;
    value: number;
    fullMark: number;
}

export function RadarStatsChart({ playerId, stats }: RadarStatsChartProps) {
    const [mapStats, setMapStats] = useState<{
        avgKD: number;
        avgWinRate: number;
        avgHsPercent: number;
        avgConsistency: number;
        avgImpact: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMapStats() {
            try {
                const res = await fetch(`/api/map-stats/${playerId}?limit=50`);
                const data = await res.json();

                if (data.mapStats && data.mapStats.length > 0) {
                    const maps = data.mapStats;
                    const totalMaps = maps.length;

                    const avgKD = maps.reduce((sum: number, m: { avgKD: number }) => sum + m.avgKD, 0) / totalMaps;
                    const avgWinRate = maps.reduce((sum: number, m: { winRate: number }) => sum + m.winRate, 0) / totalMaps;
                    const avgHsPercent = maps.reduce((sum: number, m: { hsPercent: number }) => sum + m.hsPercent, 0) / totalMaps;
                    const avgConsistency = maps.reduce((sum: number, m: { consistencyScore?: number }) => sum + (m.consistencyScore || 70), 0) / totalMaps;
                    const avgImpact = maps.reduce((sum: number, m: { impactScore?: number }) => sum + (m.impactScore || 30), 0) / totalMaps;

                    setMapStats({ avgKD, avgWinRate, avgHsPercent, avgConsistency, avgImpact });
                }
            } catch (error) {
                console.error("Failed to fetch map stats for radar:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchMapStats();
    }, [playerId]);

    // Normalize values to 0-100 scale for radar chart
    const normalizeKD = (kd: number) => Math.min(100, (kd / 2) * 100); // 2.0 KD = 100
    const normalizeWinRate = (wr: number) => wr; // Already 0-100
    const normalizeHS = (hs: number) => hs; // Already 0-100
    const normalizeConsistency = (c: number) => c; // Already 0-100
    const normalizeImpact = (i: number) => i; // Already 0-100

    const baseKD = stats?.averageKDRatio ? parseFloat(stats.averageKDRatio) : (mapStats?.avgKD || 1);
    const baseWR = stats?.winRate ? parseFloat(stats.winRate) : (mapStats?.avgWinRate || 50);
    const baseHS = stats?.averageHeadshotsPercent ? parseFloat(stats.averageHeadshotsPercent) : (mapStats?.avgHsPercent || 40);
    const consistency = mapStats?.avgConsistency || 70;
    const impact = mapStats?.avgImpact || 30;

    const radarData: RadarDataPoint[] = [
        { metric: "K/D", value: normalizeKD(baseKD), fullMark: 100 },
        { metric: "Win Rate", value: normalizeWinRate(baseWR), fullMark: 100 },
        { metric: "HS%", value: normalizeHS(baseHS), fullMark: 100 },
        { metric: "Consistency", value: normalizeConsistency(consistency), fullMark: 100 },
        { metric: "Impact", value: normalizeImpact(impact), fullMark: 100 },
    ];

    if (loading) {
        return (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-[#ff5500]" />
                        Performance Radar
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[250px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#ff5500]" />
                    Performance Radar
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                            dataKey="metric"
                            tick={{ fill: "#fff", fontSize: 14, fontWeight: 500 }}
                        />
                        <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={{ fill: "#999", fontSize: 12, fontWeight: 500 }}
                            tickCount={5}
                        />
                        <Radar
                            name="Performance"
                            dataKey="value"
                            stroke="#ff5500"
                            fill="#ff5500"
                            fillOpacity={0.3}
                            strokeWidth={2}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                            }}
                            formatter={(value) => [`${Number(value).toFixed(1)}`, "Score"]}
                        />
                    </RadarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-5 gap-1 mt-2 text-center text-xs text-muted-foreground">
                    <div>K/D: {baseKD.toFixed(2)}</div>
                    <div>WR: {baseWR.toFixed(0)}%</div>
                    <div>HS: {baseHS.toFixed(0)}%</div>
                    <div>Cons: {consistency.toFixed(0)}</div>
                    <div>Impact: {impact.toFixed(0)}</div>
                </div>
            </CardContent>
        </Card>
    );
}
