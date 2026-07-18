import { NextRequest, NextResponse } from "next/server";
import { isAxiosError } from "axios";
import { isValidMatchId } from "@/lib/validation";
import { getMatchDetails } from "@/lib/api";

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
    try {
        const { matchId } = await params;

        if (!isValidMatchId(matchId)) {
            return NextResponse.json(
                { error: "Invalid match ID format" },
                { status: 400 }
            );
        }

        // Central faceitApi client handles throttle, key rotation and retries.
        let matchData;
        try {
            matchData = await getMatchDetails(matchId);
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 429) {
                return NextResponse.json(
                    { error: "Rate limit exceeded. Please wait a moment and try again." },
                    { status: 429 }
                );
            }
            console.error(`[Match API] Error for ${matchId}:`, error);
            return NextResponse.json(
                { error: "Match not found or not yet available" },
                { status: 404 }
            );
        }

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
