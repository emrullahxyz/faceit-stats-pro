import { prisma } from "@/lib/prisma";
import { getMatchStats, type FaceitMatchStats } from "@/lib/api";

/**
 * Match stats cache.
 *
 * Finished-match stats are immutable, so cached entries never expire — a cache
 * hit is served forever without touching the Faceit API. Any database failure
 * degrades gracefully to a live fetch and never breaks the request.
 */
export async function getMatchStatsCached(
    matchId: string,
    apiKey: string
): Promise<FaceitMatchStats> {
    // Read path — any DB error falls through to a live fetch.
    try {
        const cached = await prisma.matchStatsCache.findUnique({ where: { matchId } });
        if (cached) {
            try {
                return JSON.parse(cached.payload) as FaceitMatchStats;
            } catch {
                // Corrupt payload — treat as a miss and refetch/overwrite below.
            }
        }
    } catch {
        // DB unavailable — fall through to live fetch.
    }

    const stats = await getMatchStats(matchId, apiKey);

    // Only cache finished matches (rounds present); never store empty/partial payloads.
    if (stats?.rounds?.length) {
        try {
            const payload = JSON.stringify(stats);
            await prisma.matchStatsCache.upsert({
                where: { matchId },
                create: { matchId, payload },
                update: { payload },
            });
        } catch {
            // Write races with a concurrent request / DB errors are non-fatal.
        }
    }

    return stats;
}
