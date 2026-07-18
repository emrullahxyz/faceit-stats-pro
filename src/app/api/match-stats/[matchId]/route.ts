import { NextRequest, NextResponse } from "next/server";
import { getMatchStatsCachedRaw } from "@/lib/match-stats-cache";
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

        // Raw string variant: a cache hit streams the stored JSON without a
        // ~100KB parse + re-stringify round trip per request.
        const payload = await getMatchStatsCachedRaw(matchId);
        return new NextResponse(payload, {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "private, max-age=3600",
            },
        });
    } catch (error) {
        console.error("Failed to fetch match stats:", error);
        return NextResponse.json({ error: "Failed to fetch match stats" }, { status: 500 });
    }
}
