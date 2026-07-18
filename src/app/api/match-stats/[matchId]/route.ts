import { NextRequest, NextResponse } from "next/server";
import { getMatchStatsCached } from "@/lib/match-stats-cache";
import { isValidMatchId } from "@/lib/validation";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const { matchId } = await params;

        if (!isValidMatchId(matchId)) {
            return NextResponse.json(
                { error: "Invalid match ID format" },
                { status: 400 }
            );
        }

        const stats = await getMatchStatsCached(matchId);
        return NextResponse.json(stats, {
            headers: { "Cache-Control": "private, max-age=3600" },
        });
    } catch (error) {
        console.error("Failed to fetch match stats:", error);
        return NextResponse.json({ error: "Failed to fetch match stats" }, { status: 500 });
    }
}
