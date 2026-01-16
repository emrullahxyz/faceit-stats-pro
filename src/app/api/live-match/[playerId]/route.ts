import { NextRequest, NextResponse } from "next/server";

const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ playerId: string }> }
) {
    const FACEIT_API_KEY = process.env.FACEIT_API_KEY || "";

    if (!FACEIT_API_KEY) {
        return NextResponse.json({ match: null, error: "API key not configured" });
    }

    try {
        const { playerId } = await params;

        // Check recent matches - sometimes the ongoing match appears as the most recent
        const historyResponse = await fetch(
            `${FACEIT_API_BASE}/players/${playerId}/history?game=cs2&limit=5`,
            {
                headers: { Authorization: `Bearer ${FACEIT_API_KEY}` },
                cache: 'no-store'  // No caching for live data
            }
        );

        if (!historyResponse.ok) {
            return NextResponse.json({ match: null, error: "Failed to fetch history" });
        }

        const historyData = await historyResponse.json();
        const matches = historyData?.items || [];

        // Check each recent match for ongoing status
        for (const historyMatch of matches) {
            // Get full match details to check status
            const matchResponse = await fetch(
                `${FACEIT_API_BASE}/matches/${historyMatch.match_id}`,
                {
                    headers: { Authorization: `Bearer ${FACEIT_API_KEY}` },
                    cache: 'no-store'
                }
            );

            if (!matchResponse.ok) continue;

            const matchData = await matchResponse.json();

            // All possible ongoing/active statuses
            const activeStatuses = [
                'VOTING',
                'CONFIGURING',
                'READY',
                'ONGOING',
                'PLAYING',
                'CAPTAIN_PICK',
                'SCHEDULED',
                'LIVE',
                'STARTED',
                'CHECK_IN'
            ];

            if (activeStatuses.includes(matchData.status?.toUpperCase())) {
                return NextResponse.json({ match: matchData });
            }

            // Also check if match was created recently (within last hour) and not finished
            const createdAt = matchData.created_at || matchData.started_at;
            const now = Math.floor(Date.now() / 1000);
            const oneHourAgo = now - 3600;

            if (createdAt && createdAt > oneHourAgo &&
                matchData.status !== 'FINISHED' &&
                matchData.status !== 'CANCELLED' &&
                matchData.status !== 'ABORTED') {
                return NextResponse.json({ match: matchData });
            }
        }

        // No ongoing match found
        const lastStatus = matches[0] ? await getMatchStatus(matches[0].match_id, FACEIT_API_KEY) : null;
        return NextResponse.json({ match: null, lastMatchStatus: lastStatus });
    } catch (error) {
        console.error("Live match API error:", error);
        return NextResponse.json({ match: null, error: String(error) });
    }
}

async function getMatchStatus(matchId: string, apiKey: string): Promise<string | null> {
    try {
        const response = await fetch(
            `${FACEIT_API_BASE}/matches/${matchId}`,
            {
                headers: { Authorization: `Bearer ${apiKey}` },
            }
        );
        const data = await response.json();
        return data.status || null;
    } catch {
        return null;
    }
}
