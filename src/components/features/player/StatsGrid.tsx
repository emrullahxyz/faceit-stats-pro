import { GlowCard } from "@/components/ui/glow-card";
import { CountUp } from "@/components/ui/count-up";
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

    const statItems = [
        {
            label: "K/D RATIO",
            value: findStat(lifetime, ["Average K/D Ratio", "K/D Ratio", "KD Ratio", "kd_ratio"]),
            decimals: 2,
            suffix: "",
        },
        {
            label: "WIN RATE",
            value: findStat(lifetime, ["Win Rate %", "Winrate", "Win rate %", "win_rate"]),
            decimals: 1,
            suffix: "%",
        },
        {
            label: "HEADSHOT %",
            value: findStat(lifetime, ["Average Headshots %", "Headshots %", "Headshot %", "hs_rate"]),
            decimals: 1,
            suffix: "%",
        },
        {
            label: "ADR",
            value: findStat(lifetime, ["ADR", "Average ADR", "Average Damage per Round", "Average Kills", "Avg Kills"]),
            decimals: 1,
            suffix: "",
        },
        {
            label: "MATCHES",
            value: findStat(lifetime, ["Matches", "Total Matches", "matches"]),
            decimals: 0,
            suffix: "",
        },
        {
            label: "BEST STREAK",
            value: findStat(lifetime, ["Longest Win Streak", "Best Streak", "longest_win_streak"]),
            decimals: 0,
            suffix: "",
        },
    ];

    return (
        <section className="grid grid-cols-2 gap-[18px] md:grid-cols-3 xl:grid-cols-6">
            {statItems.map((stat) => {
                const num = parseFloat(stat.value);
                return (
                    <GlowCard
                        key={stat.label}
                        className="flex flex-col gap-2.5 rounded-tile px-5 pb-4 pt-5"
                    >
                        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                            {stat.label}
                        </span>
                        <span className="tabular font-mono text-[27px] font-bold leading-none text-foreground">
                            {Number.isFinite(num) ? (
                                <CountUp
                                    value={num}
                                    decimals={stat.decimals}
                                    suffix={stat.suffix}
                                />
                            ) : (
                                stat.value
                            )}
                        </span>
                    </GlowCard>
                );
            })}
        </section>
    );
}
