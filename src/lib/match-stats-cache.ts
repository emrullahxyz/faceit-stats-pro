import { prisma } from "@/lib/prisma";
import { getMatchDetails, getMatchStats, type FaceitMatchStats } from "@/lib/api";

/**
 * Match stats cache.
 *
 * Finished-match stats are immutable, so cached entries never expire — a cache
 * hit is served forever without touching the Faceit API. Any database failure
 * degrades gracefully to a live fetch and never breaks the request.
 *
 * Only FINISHED matches may be written: an ongoing BO3 returns partial stats
 * that must never be cached permanently. Pass `finishedHint` when the caller
 * already knows the match status (e.g. from a history item); otherwise the
 * cache verifies the status itself with one extra call on a cache miss.
 */
export async function getMatchStatsCached(
    matchId: string,
    finishedHint?: boolean
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

    const stats = await getMatchStats(matchId);

    // Verify the match is actually FINISHED before writing. rounds.length alone
    // is not enough: an ongoing BO3 already has rounds for its completed maps.
    let finished = finishedHint;
    if (finished === undefined && stats?.rounds?.length) {
        finished = await getMatchDetails(matchId)
            .then((m) => m.status === "FINISHED")
            .catch(() => false);
    }

    // ponytail: finished-but-empty payloads are deliberately NOT cached — a
    // transient API glitch returning {rounds: []} would otherwise be served
    // forever. Refetching those rare matches is the cheaper failure mode.
    if (finished && stats?.rounds?.length) {
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
