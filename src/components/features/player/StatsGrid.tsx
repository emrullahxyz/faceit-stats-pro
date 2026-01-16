import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Crosshair, Trophy, Flame, Gamepad2, TrendingUp } from "lucide-react";
import type { FaceitPlayerStats } from "@/lib/api";

interface StatsGridProps {
    stats: FaceitPlayerStats;
}

// Helper to find a stat value by checking multiple possible key names
function findStat(lifetime: Record<string, string>, keys: string[]): string {
    for (const key of keys) {
        if (lifetime[key] !== undefined && lifetime[key] !== "") {
            return lifetime[key];
        }
    }
    return "0";
}

export function StatsGrid({ stats }: StatsGridProps) {
    const lifetime = stats.lifetime || {};

    // Log the actual lifetime keys for debugging (will show in server console)
    console.log("Lifetime stats keys:", Object.keys(lifetime));
    console.log("Lifetime stats:", lifetime);

    const statItems = [
        {
            icon: Target,
            label: "K/D Ratio",
            // Try multiple possible field names
            value: findStat(lifetime, ["Average K/D Ratio", "K/D Ratio", "KD Ratio", "kd_ratio"]),
            color: "text-green-400",
        },
        {
            icon: Trophy,
            label: "Win Rate",
            value: `${findStat(lifetime, ["Win Rate %", "Winrate", "Win rate %", "win_rate"])}%`,
            color: "text-blue-400",
        },
        {
            icon: Crosshair,
            label: "Headshot %",
            value: `${findStat(lifetime, ["Average Headshots %", "Headshots %", "Headshot %", "hs_rate"])}%`,
            color: "text-yellow-400",
        },
        {
            icon: TrendingUp,
            label: "Avg Kills",
            value: findStat(lifetime, ["Average Kills", "Avg Kills", "avg_kills"]),
            color: "text-purple-400",
        },
        {
            icon: Gamepad2,
            label: "Matches",
            value: parseInt(findStat(lifetime, ["Matches", "Total Matches", "matches"]) || "0").toLocaleString(),
            color: "text-cyan-400",
        },
        {
            icon: Flame,
            label: "Best Streak",
            value: findStat(lifetime, ["Longest Win Streak", "Best Streak", "longest_win_streak"]),
            color: "text-orange-400",
        },
    ];

    return (
        <Card className="border-border/50 bg-card/50">
            <CardHeader>
                <CardTitle className="text-lg">Lifetime Statistics</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {statItems.map((stat, index) => (
                        <div
                            key={index}
                            className="flex flex-col items-center p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                            <stat.icon className={`h-6 w-6 mb-2 ${stat.color}`} />
                            <span className="text-2xl font-bold text-foreground">
                                {stat.value}
                            </span>
                            <span className="text-xs text-muted-foreground mt-1">
                                {stat.label}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
