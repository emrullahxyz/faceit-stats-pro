import { NextRequest, NextResponse } from "next/server";
import { isValidPlayerId } from "@/lib/validation";
import { getPlayerById, getPlayerMatchHistory } from "@/lib/api";

// The old raw-fetch version cached upstream responses for 5 minutes via
// next.revalidate; caching the whole route result preserves that.
export const revalidate = 300;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ playerId: string }> }
) {
    try {
        const { playerId } = await params;

        // Validate playerId format (UUID)
        if (!isValidPlayerId(playerId)) {
            return NextResponse.json(
                { error: "Invalid player ID format" },
                { status: 400 }
            );
        }

        // First get player's current ELO.
        // Central faceitApi client handles throttle, key rotation and retries.
        let currentElo: number;
        let gameId: string;
        try {
            const playerData = await getPlayerById(playerId);
            currentElo = playerData.games?.cs2?.faceit_elo || playerData.games?.csgo?.faceit_elo || 0;
            gameId = playerData.games?.cs2 ? "cs2" : "csgo";
        } catch {
            return NextResponse.json({ items: [] });
        }

        if (!currentElo) {
            return NextResponse.json({ items: [] });
        }

        // Get match history
        let matches;
        try {
            const history = await getPlayerMatchHistory(playerId, gameId, 50);
            matches = history.items || [];
        } catch {
            return NextResponse.json({ items: [] });
        }

        if (matches.length === 0) {
            return NextResponse.json({ items: [] });
        }

        // Simulate ELO progression backwards from current ELO based on wins/losses
        // Note: Faceit doesn't expose ELO per-match in their public API.
        // This is an approximation based on win/loss patterns.
        const eloItems: Array<{ match_id: string; date: string; elo: number }> = [];
        let simulatedElo = currentElo;

        // Process matches in reverse (oldest first after we reverse)
        const reversedMatches = [...matches].reverse();

        for (const match of reversedMatches) {
            const date = new Date(match.finished_at * 1000).toISOString().split('T')[0];

            // Determine if player won
            const playerInFaction1 = match.teams?.faction1?.players?.some(
                (p: { player_id: string }) => p.player_id === playerId
            );
            const playerTeam = playerInFaction1 ? "faction1" : "faction2";
            const won = match.results?.winner === playerTeam;

            // Add current ELO point
            eloItems.push({
                match_id: match.match_id,
                date,
                elo: simulatedElo,
            });

            // Adjust ELO for next iteration (going backwards, so inverse the change)
            // Average ELO change is ~25 points
            const eloChange = Math.floor(Math.random() * 15) + 18; // 18-32 points
            if (won) {
                simulatedElo -= eloChange; // Was lower before this win
            } else {
                simulatedElo += eloChange; // Was higher before this loss
            }

            // Keep ELO in reasonable bounds
            simulatedElo = Math.max(100, Math.min(4000, simulatedElo));
        }

        return NextResponse.json(
            { items: eloItems },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
                },
            }
        );
    } catch (error) {
        console.error("Failed to fetch ELO history:", error);
        return NextResponse.json({ error: "Failed to fetch ELO history" }, { status: 500 });
    }
}
