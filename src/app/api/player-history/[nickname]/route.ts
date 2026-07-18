import { NextRequest, NextResponse } from "next/server";
import { isValidNickname } from "@/lib/validation";
import { getPlayerByNickname, getPlayerMatchHistory, type FaceitMatch } from "@/lib/api";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ nickname: string }> }
) {
    try {
        const { nickname } = await params;

        if (!isValidNickname(nickname)) {
            return NextResponse.json(
                { error: "Invalid nickname format" },
                { status: 400 }
            );
        }

        // Central faceitApi client handles throttle, key rotation and retries.
        let player;
        try {
            player = await getPlayerByNickname(nickname);
        } catch {
            return NextResponse.json({ error: "Player not found" }, { status: 404 });
        }

        let matches: FaceitMatch[];
        try {
            const history = await getPlayerMatchHistory(player.player_id, "cs2", 10);
            matches = history.items || [];
        } catch {
            matches = [];
        }

        return NextResponse.json({
            player: {
                player_id: player.player_id,
                nickname: player.nickname,
            },
            matches,
        });
    } catch (error) {
        console.error("Error fetching player history:", error);
        return NextResponse.json({ error: "Failed to fetch player history" }, { status: 500 });
    }
}
