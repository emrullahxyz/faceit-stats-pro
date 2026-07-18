import { NextRequest, NextResponse } from "next/server";
import { isValidPlayerId } from "@/lib/validation";
import { getMatchDetails, getPlayerMatchHistory } from "@/lib/api";

// All possible ongoing/active statuses
const ACTIVE_STATUSES = [
    "VOTING",
    "CONFIGURING",
    "READY",
    "ONGOING",
    "PLAYING",
    "CAPTAIN_PICK",
    "SCHEDULED",
    "LIVE",
    "STARTED",
    "CHECK_IN",
];

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ playerId: string }> }
) {
    try {
        const { playerId } = await params;

        if (!isValidPlayerId(playerId)) {
            return NextResponse.json(
                { match: null, error: "Invalid player ID format" },
                { status: 400 }
            );
        }

        // Check recent matches - sometimes the ongoing match appears as the most recent.
        // Central faceitApi client handles throttle, key rotation and retries.
        let matches;
        try {
            const history = await getPlayerMatchHistory(playerId, "cs2", 5);
            matches = history?.items || [];
        } catch {
            return NextResponse.json({ match: null, error: "Failed to fetch history" });
        }

        // Check each recent match for ongoing status. Remember the first
        // match's status so it isn't refetched for the lastMatchStatus field.
        let lastMatchStatus: string | null = null;
        for (const historyMatch of matches) {
            let matchData;
            try {
                matchData = await getMatchDetails(historyMatch.match_id);
            } catch {
                continue;
            }

            if (lastMatchStatus === null) {
                lastMatchStatus = matchData.status ?? null;
            }

            if (ACTIVE_STATUSES.includes(matchData.status?.toUpperCase() ?? "")) {
                return NextResponse.json({ match: matchData });
            }

            // Also check if match was created recently (within last hour) and not finished
            const createdAt = matchData.created_at || matchData.started_at;
            const now = Math.floor(Date.now() / 1000);
            const oneHourAgo = now - 3600;

            if (createdAt && createdAt > oneHourAgo &&
                matchData.status !== "FINISHED" &&
                matchData.status !== "CANCELLED" &&
                matchData.status !== "ABORTED") {
                return NextResponse.json({ match: matchData });
            }
        }

        // No ongoing match found
        return NextResponse.json({ match: null, lastMatchStatus });
    } catch (error) {
        console.error("Live match API error:", error);
        return NextResponse.json({ match: null, error: String(error) });
    }
}
