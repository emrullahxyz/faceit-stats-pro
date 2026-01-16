import { NextRequest, NextResponse } from "next/server";

const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

interface FaceitPlayer {
    player_id: string;
    nickname: string;
    skill_level?: number;
    game_skill_level?: number;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    const FACEIT_API_KEY = process.env.FACEIT_API_KEY || "";

    if (!FACEIT_API_KEY) {
        return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    try {
        const { matchId } = await params;

        const response = await fetch(
            `${FACEIT_API_BASE}/matches/${matchId}`,
            {
                headers: { Authorization: `Bearer ${FACEIT_API_KEY}` },
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Match API] Error ${response.status} for ${matchId}:`, errorText);

            // Check if it's rate limiting
            if (response.status === 429) {
                return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment and try again." }, { status: 429 });
            }

            return NextResponse.json({ error: "Match not found or not yet available" }, { status: 404 });
        }

        const matchData = await response.json();

        // Normalize players - Faceit API sometimes uses 'roster' instead of 'players'
        const normalizeTeam = (faction: {
            nickname?: string;
            name?: string;
            players?: FaceitPlayer[];
            roster?: FaceitPlayer[];
        }) => {
            const players = faction.players || faction.roster || [];
            return {
                nickname: faction.nickname || faction.name || "Unknown",
                players: Array.isArray(players) ? players.map((p: FaceitPlayer) => ({
                    player_id: p.player_id,
                    nickname: p.nickname,
                    skill_level: p.skill_level || p.game_skill_level
                })) : []
            };
        };

        return NextResponse.json({
            match_id: matchData.match_id,
            status: matchData.status,
            teams: {
                faction1: normalizeTeam(matchData.teams?.faction1 || {}),
                faction2: normalizeTeam(matchData.teams?.faction2 || {})
            },
            voting: matchData.voting,
            faceit_url: matchData.faceit_url,
            started_at: matchData.started_at,
            finished_at: matchData.finished_at
        });
    } catch (error) {
        console.error("Match API error:", error);
        return NextResponse.json({ error: "Failed to fetch match" }, { status: 500 });
    }
}
