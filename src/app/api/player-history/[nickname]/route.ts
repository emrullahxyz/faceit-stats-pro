import { NextRequest, NextResponse } from "next/server";

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ nickname: string }> }
) {
    if (!FACEIT_API_KEY) {
        return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    try {
        const { nickname } = await params;

        // First get player ID from nickname
        const playerRes = await fetch(
            `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nickname)}`,
            {
                headers: {
                    'Authorization': `Bearer ${FACEIT_API_KEY}`,
                    'Accept': 'application/json'
                }
            }
        );

        if (!playerRes.ok) {
            return NextResponse.json({ error: "Player not found" }, { status: 404 });
        }

        const playerData = await playerRes.json();

        // Fetch match history
        const historyRes = await fetch(
            `https://open.faceit.com/data/v4/players/${playerData.player_id}/history?game=cs2&limit=10`,
            {
                headers: {
                    'Authorization': `Bearer ${FACEIT_API_KEY}`,
                    'Accept': 'application/json'
                }
            }
        );

        if (!historyRes.ok) {
            return NextResponse.json({ matches: [] });
        }

        const historyData = await historyRes.json();

        return NextResponse.json({
            player: {
                player_id: playerData.player_id,
                nickname: playerData.nickname
            },
            matches: historyData.items || []
        });
    } catch (error) {
        console.error("Error fetching player history:", error);
        return NextResponse.json({ error: "Failed to fetch player history" }, { status: 500 });
    }
}
