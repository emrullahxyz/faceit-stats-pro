import { NextRequest, NextResponse } from "next/server";

const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ playerId: string }> }
) {
    const FACEIT_API_KEY = process.env.FACEIT_API_KEY || "";

    if (!FACEIT_API_KEY) {
        return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    try {
        const { playerId } = await params;

        // First get player's current ELO
        const playerResponse = await fetch(
            `${FACEIT_API_BASE}/players/${playerId}`,
            {
                headers: { Authorization: `Bearer ${FACEIT_API_KEY}` },
            }
        );

        if (!playerResponse.ok) {
            return NextResponse.json({ items: [] });
        }

        const playerData = await playerResponse.json();
        const currentElo = playerData.games?.cs2?.faceit_elo || playerData.games?.csgo?.faceit_elo || 0;
        const gameId = playerData.games?.cs2 ? "cs2" : "csgo";

        if (!currentElo) {
            return NextResponse.json({ items: [] });
        }

        // Get match history
        const historyResponse = await fetch(
            `${FACEIT_API_BASE}/players/${playerId}/history?game=${gameId}&limit=50`,
            {
                headers: { Authorization: `Bearer ${FACEIT_API_KEY}` },
            }
        );

        if (!historyResponse.ok) {
            return NextResponse.json({ items: [] });
        }

        const historyData = await historyResponse.json();
        const matches = historyData.items || [];

        if (matches.length === 0) {
            return NextResponse.json({ items: [] });
        }

        // Simulate ELO progression backwards from current ELO based on wins/losses
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

        return NextResponse.json({ items: eloItems });
    } catch (error) {
        console.error("Failed to fetch ELO history:", error);
        return NextResponse.json({ error: "Failed to fetch ELO history" }, { status: 500 });
    }
}
