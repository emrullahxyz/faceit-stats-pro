import { NextRequest, NextResponse } from "next/server";
import { getActiveApiKey, handleRateLimitError } from "@/lib/api-keys";

const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

interface MatchStats {
    map: string;
    won: boolean;
    kills: number;
    deaths: number;
    assists: number;
    headshots: number;
    matchDate: number;
    daysAgo: number;
    // New fields for enhanced analysis
    tripleKills: number;
    quadroKills: number;
    pentaKills: number;
    mvps: number;
    firstKills: number;  // Entry kills (first kill of round)
}

interface PlayerStats {
    player_id: string;
    player_stats: {
        Kills: string;
        Deaths: string;
        Assists: string;
        Headshots: string;
        "Triple Kills"?: string;
        "Quadro Kills"?: string;
        "Penta Kills"?: string;
        MVPs?: string;
        "First Kills"?: string;
        "Entry Count"?: string;
    };
}

interface MatchItem {
    match_id: string;
    finished_at: number;
    results?: { winner: string };
    teams?: {
        faction1?: { players?: { player_id: string }[]; roster?: { player_id: string }[] };
        faction2?: { players?: { player_id: string }[]; roster?: { player_id: string }[] };
    };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ playerId: string }> }
) {
    let FACEIT_API_KEY: string;
    try {
        FACEIT_API_KEY = getActiveApiKey();
    } catch {
        return NextResponse.json({ mapStats: [], error: "API key not configured" });
    }

    try {
        const { playerId } = await params;
        const searchParams = request.nextUrl.searchParams;
        const matchCount = Math.min(parseInt(searchParams.get("limit") || "100", 10), 100);

        let historyResponse = await fetch(
            `${FACEIT_API_BASE}/players/${playerId}/history?game=cs2&limit=${matchCount}`,
            { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } }
        );

        // Handle rate limit with key rotation and retry
        if (historyResponse.status === 429) {
            const switched = handleRateLimitError();
            if (switched) {
                FACEIT_API_KEY = getActiveApiKey();
                // Retry with new key
                historyResponse = await fetch(
                    `${FACEIT_API_BASE}/players/${playerId}/history?game=cs2&limit=${matchCount}`,
                    { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } }
                );
            }
        }

        if (!historyResponse.ok) {
            return NextResponse.json({ mapStats: [], error: historyResponse.status === 429 ? "Rate limit exceeded" : "Failed to fetch match history" });
        }

        const historyData = await historyResponse.json();
        const matches = historyData?.items || [];

        if (matches.length === 0) {
            return NextResponse.json({ mapStats: [], matchesAnalyzed: 0 });
        }

        const now = Date.now();
        const mapData: Record<string, MatchStats[]> = {};

        await Promise.all(
            matches.map(async (match: MatchItem) => {
                try {
                    let statsResponse = await fetch(
                        `${FACEIT_API_BASE}/matches/${match.match_id}/stats`,
                        { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } }
                    );

                    // Rate limit handling with retry
                    if (statsResponse.status === 429) {
                        const switched = handleRateLimitError();
                        if (switched) {
                            FACEIT_API_KEY = getActiveApiKey();
                            statsResponse = await fetch(
                                `${FACEIT_API_BASE}/matches/${match.match_id}/stats`,
                                { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } }
                            );
                        }
                    }

                    if (!statsResponse.ok) return;

                    const statsData = await statsResponse.json();
                    const round = statsData?.rounds?.[0];
                    const mapName = round?.round_stats?.Map;

                    if (!mapName) return;

                    // Check both players and roster arrays for reliable team detection
                    const inFaction1 = match.teams?.faction1?.players?.some(
                        (p: { player_id: string }) => p.player_id === playerId
                    ) || match.teams?.faction1?.roster?.some(
                        (p: { player_id: string }) => p.player_id === playerId
                    );
                    const playerTeam = inFaction1 ? "faction1" : "faction2";
                    const won = match.results?.winner === playerTeam;

                    const allPlayers = [
                        ...(round?.teams?.[0]?.players || []),
                        ...(round?.teams?.[1]?.players || [])
                    ];
                    const playerMatchStats = allPlayers.find(
                        (p: PlayerStats) => p.player_id === playerId
                    );

                    if (!mapData[mapName]) mapData[mapName] = [];

                    const matchDate = match.finished_at * 1000;
                    const daysAgo = Math.floor((now - matchDate) / (1000 * 60 * 60 * 24));

                    const stats = playerMatchStats?.player_stats;
                    mapData[mapName].push({
                        map: mapName,
                        won,
                        kills: parseInt(stats?.Kills || "0", 10),
                        deaths: parseInt(stats?.Deaths || "0", 10),
                        assists: parseInt(stats?.Assists || "0", 10),
                        headshots: parseInt(stats?.Headshots || "0", 10),
                        tripleKills: parseInt(stats?.["Triple Kills"] || "0", 10),
                        quadroKills: parseInt(stats?.["Quadro Kills"] || "0", 10),
                        pentaKills: parseInt(stats?.["Penta Kills"] || "0", 10),
                        mvps: parseInt(stats?.MVPs || "0", 10),
                        firstKills: parseInt(stats?.["First Kills"] || stats?.["Entry Count"] || "0", 10),
                        matchDate,
                        daysAgo
                    });
                } catch {
                    // Skip failed match stats
                }
            })
        );

        // Calculate advanced stats for each map
        const mapStats = Object.entries(mapData).map(([map, matchList]) => {
            const totalMatches = matchList.length;
            matchList.sort((a, b) => b.matchDate - a.matchDate);

            // === ENHANCED ALGORITHM ===
            let weightedWins = 0;
            let totalWeight = 0;
            let totalKills = 0;
            let totalDeaths = 0;
            let totalHeadshots = 0;

            // Impact metrics
            let totalTripleKills = 0;
            let totalQuadroKills = 0;
            let totalPentaKills = 0;
            let totalMVPs = 0;
            let totalFirstKills = 0;

            // Recent form
            let recentWins = 0;
            let recentMatches = 0;

            // Streak tracking
            let currentStreak = 0;
            let streakType: "win" | "loss" | "none" = "none";
            let maxWinStreak = 0;
            let maxLossStreak = 0;
            let tempStreak = 0;
            let lastResult: boolean | null = null;

            const kdValues: number[] = [];

            matchList.forEach((m, index) => {
                // Tiered weighting for 100 matches: 1-20 = 3x, 21-50 = 1.5x, 51-100 = 1x
                const recencyMultiplier = index < 20 ? 3.0 : (index < 50 ? 1.5 : 1.0);
                const expWeight = Math.exp(-0.05 * m.daysAgo) * recencyMultiplier;
                totalWeight += expWeight;
                if (m.won) weightedWins += expWeight;

                totalKills += m.kills;
                totalDeaths += m.deaths;
                totalHeadshots += m.headshots;

                // Impact stats
                totalTripleKills += m.tripleKills;
                totalQuadroKills += m.quadroKills;
                totalPentaKills += m.pentaKills;
                totalMVPs += m.mvps;
                totalFirstKills += m.firstKills;

                if (index < 5) {
                    recentMatches++;
                    if (m.won) recentWins++;
                }

                // Streak logic
                if (lastResult === null) {
                    tempStreak = 1;
                    streakType = m.won ? "win" : "loss";
                } else if (m.won === lastResult) {
                    tempStreak++;
                } else {
                    if (lastResult) maxWinStreak = Math.max(maxWinStreak, tempStreak);
                    else maxLossStreak = Math.max(maxLossStreak, tempStreak);
                    tempStreak = 1;
                }
                lastResult = m.won;

                if (index === 0) {
                    currentStreak = 1;
                    streakType = m.won ? "win" : "loss";
                } else if (index < 5 && m.won === matchList[0].won) {
                    currentStreak++;
                }

                const kd = m.deaths > 0 ? m.kills / m.deaths : m.kills;
                kdValues.push(kd);
            });

            if (lastResult !== null) {
                if (lastResult) maxWinStreak = Math.max(maxWinStreak, tempStreak);
                else maxLossStreak = Math.max(maxLossStreak, tempStreak);
            }

            // Calculate metrics
            const rawWinRate = totalMatches > 0 ? (matchList.filter(m => m.won).length / totalMatches) * 100 : 50;
            const weightedWinRate = totalWeight > 0 ? (weightedWins / totalWeight) * 100 : 50;
            const avgKD = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;
            const avgKills = totalMatches > 0 ? totalKills / totalMatches : 0;
            const hsPercent = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;
            const recentFormWinRate = recentMatches > 0 ? (recentWins / recentMatches) * 100 : rawWinRate;

            // === IMPACT SCORE ===
            // Multi-kills and entry frags indicate high-impact plays
            const avgTripleKills = totalMatches > 0 ? totalTripleKills / totalMatches : 0;
            const avgQuadroKills = totalMatches > 0 ? totalQuadroKills / totalMatches : 0;
            const avgPentaKills = totalMatches > 0 ? totalPentaKills / totalMatches : 0;
            const avgMVPs = totalMatches > 0 ? totalMVPs / totalMatches : 0;
            const avgFirstKills = totalMatches > 0 ? totalFirstKills / totalMatches : 0;

            // Impact score: weighted sum of impactful plays (0-100 scale)
            // First kills (entry) are very important, multi-kills show clutch potential
            const impactScore = Math.min(100,
                (avgFirstKills * 8) +        // Entry kills are crucial
                (avgTripleKills * 15) +      // Triple kills show impact
                (avgQuadroKills * 25) +      // Quad kills are rare and impactful
                (avgPentaKills * 50) +       // Ace rounds are extremely impactful
                (avgMVPs * 5)                // MVPs indicate overall contribution
            );

            // Consistency score
            let kdVariance = 0;
            if (kdValues.length > 1) {
                const kdMean = kdValues.reduce((a, b) => a + b, 0) / kdValues.length;
                kdVariance = kdValues.reduce((sum, kd) => sum + Math.pow(kd - kdMean, 2), 0) / kdValues.length;
            }
            const consistencyScore = Math.max(50, 100 - (kdVariance * 50));

            // Form momentum
            let formMomentum = 0;
            const streakTypeStr = String(streakType);
            if (currentStreak >= 3) {
                if (streakTypeStr === "win") {
                    formMomentum = Math.min(15, currentStreak * 3);
                } else if (streakTypeStr === "loss") {
                    formMomentum = Math.max(-15, -currentStreak * 3);
                }
            }

            // Confidence
            const hasRecentMatch = matchList.some(m => m.daysAgo <= 7);
            let confidence: "high" | "medium" | "low" = "low";
            if (totalMatches >= 5 && hasRecentMatch) confidence = "high";
            else if (totalMatches >= 3) confidence = "medium";

            // === ENHANCED COMPOSITE SCORE ===
            // Win Rate (25%) + K/D (15%) + Recent Form (15%) + Consistency (15%) + Impact (15%) + Momentum (15%)
            const kdScore = Math.min(100, avgKD * 50);
            const compositeScore = (
                weightedWinRate * 0.25 +
                kdScore * 0.15 +
                recentFormWinRate * 0.15 +
                consistencyScore * 0.15 +
                impactScore * 0.15 +
                (50 + formMomentum) * 0.15
            );

            return {
                map,
                matches: totalMatches,
                wins: matchList.filter(m => m.won).length,
                winRate: rawWinRate,
                weightedWinRate,
                avgKD,
                avgKills,
                hsPercent,
                recentFormWinRate,
                recentMatches,
                confidence,
                compositeScore,
                lastPlayedDaysAgo: matchList.length > 0 ? matchList[0].daysAgo : 999,
                currentStreak,
                streakType,
                consistencyScore,
                formMomentum,
                maxWinStreak,
                maxLossStreak,
                // New impact metrics
                impactScore,
                avgTripleKills,
                avgQuadroKills,
                avgPentaKills,
                avgMVPs,
                avgFirstKills
            };
        }).sort((a, b) => b.compositeScore - a.compositeScore);

        return NextResponse.json({
            mapStats,
            matchesAnalyzed: matches.length
        });
    } catch (error) {
        console.error("Map stats API error:", error);
        return NextResponse.json({ mapStats: [], error: "Failed to fetch map stats" });
    }
}
