"use server";

import {
    getPlayerByNickname,
    getPlayerStats,
    getPlayerMatchHistory,
    getMatchDetails,
    getMatchStats,
    getPlayerOngoingMatch,
    getPlayerMapStats,
    type FaceitPlayer,
    type FaceitPlayerStats,
    type FaceitMatchHistory,
    type FaceitMatch,
    type FaceitMatchStats,
    type FaceitOngoingMatch,
    type PlayerMapStats,
    type FaceitMatchPlayer,
} from "@/lib/api";

const FACEIT_API_KEY = process.env.FACEIT_API_KEY || "";

export async function fetchPlayerData(nickname: string): Promise<{
    player: FaceitPlayer | null;
    stats: FaceitPlayerStats | null;
    matches: FaceitMatchHistory | null;
    error: string | null;
}> {
    if (!FACEIT_API_KEY) {
        return {
            player: null,
            stats: null,
            matches: null,
            error: "API key not configured. Please set FACEIT_API_KEY environment variable.",
        };
    }

    try {
        const player = await getPlayerByNickname(nickname, FACEIT_API_KEY);

        // Determine which game to fetch stats for (CS2 preferred, fallback to CSGO)
        const gameId = player.games?.cs2 ? "cs2" : player.games?.csgo ? "csgo" : null;

        if (!gameId) {
            return {
                player,
                stats: null,
                matches: null,
                error: "Player has no CS2 or CSGO data on Faceit.",
            };
        }

        const [stats, matches] = await Promise.all([
            getPlayerStats(player.player_id, gameId, FACEIT_API_KEY).catch(() => null),
            getPlayerMatchHistory(player.player_id, gameId, FACEIT_API_KEY, 20).catch(() => null),
        ]);

        return {
            player,
            stats,
            matches,
            error: null,
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch player data";

        // Check for 404 (player not found)
        if (message.includes("404") || message.includes("not found")) {
            return {
                player: null,
                stats: null,
                matches: null,
                error: `Player "${nickname}" not found on Faceit.`,
            };
        }

        return {
            player: null,
            stats: null,
            matches: null,
            error: message,
        };
    }
}

// Fetch match details with full scoreboard
export async function fetchMatchDetails(matchId: string): Promise<{
    match: FaceitMatch | null;
    error: string | null;
}> {
    if (!FACEIT_API_KEY) {
        return { match: null, error: "API key not configured." };
    }

    try {
        const match = await getMatchDetails(matchId, FACEIT_API_KEY);

        // Log the response structure for debugging
        console.log("Match details response:", JSON.stringify(match, null, 2));
        console.log("Teams structure:", match.teams);
        console.log("Faction1 players:", match.teams?.faction1?.players);
        console.log("Faction2 players:", match.teams?.faction2?.players);

        return { match, error: null };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch match";
        console.error("Match fetch error:", message);
        return { match: null, error: message };
    }
}

// Fetch match with full stats (for detailed match page)
export async function fetchMatchWithStats(matchId: string): Promise<{
    match: FaceitMatch | null;
    stats: FaceitMatchStats | null;
    error: string | null;
}> {
    if (!FACEIT_API_KEY) {
        return { match: null, stats: null, error: "API key not configured." };
    }

    try {
        const [match, stats] = await Promise.all([
            getMatchDetails(matchId, FACEIT_API_KEY),
            getMatchStats(matchId, FACEIT_API_KEY).catch(() => null),
        ]);
        return { match, stats, error: null };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch match";
        console.error("Match with stats fetch error:", message);
        return { match: null, stats: null, error: message };
    }
}

// Compare two players
export async function comparePlayersAction(nickname1: string, nickname2: string): Promise<{
    player1: { player: FaceitPlayer; stats: FaceitPlayerStats | null } | null;
    player2: { player: FaceitPlayer; stats: FaceitPlayerStats | null } | null;
    error: string | null;
}> {
    if (!FACEIT_API_KEY) {
        return { player1: null, player2: null, error: "API key not configured." };
    }

    try {
        const [data1, data2] = await Promise.all([
            fetchPlayerData(nickname1),
            fetchPlayerData(nickname2),
        ]);

        if (data1.error) {
            return { player1: null, player2: null, error: `Player 1: ${data1.error}` };
        }
        if (data2.error) {
            return { player1: null, player2: null, error: `Player 2: ${data2.error}` };
        }

        return {
            player1: data1.player ? { player: data1.player, stats: data1.stats } : null,
            player2: data2.player ? { player: data2.player, stats: data2.stats } : null,
            error: null,
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Comparison failed";
        return { player1: null, player2: null, error: message };
    }
}

// Find shared matches between two players
export async function findSharedMatches(
    nickname1: string,
    nickname2: string
): Promise<{
    sharedMatches: Array<{
        matchId: string;
        date: number;
        result: string;
        sameTeam: boolean;
    }>;
    player1Nickname: string;
    player2Nickname: string;
    error: string | null;
}> {
    if (!FACEIT_API_KEY) {
        return { sharedMatches: [], player1Nickname: "", player2Nickname: "", error: "API key not configured." };
    }

    try {
        // Fetch both players
        const [player1, player2] = await Promise.all([
            getPlayerByNickname(nickname1, FACEIT_API_KEY),
            getPlayerByNickname(nickname2, FACEIT_API_KEY),
        ]);

        // Determine game IDs
        const gameId1 = player1.games?.cs2 ? "cs2" : player1.games?.csgo ? "csgo" : null;
        const gameId2 = player2.games?.cs2 ? "cs2" : player2.games?.csgo ? "csgo" : null;

        if (!gameId1 || !gameId2) {
            return {
                sharedMatches: [],
                player1Nickname: player1.nickname,
                player2Nickname: player2.nickname,
                error: "One or both players have no CS data.",
            };
        }

        // Fetch match histories (last 50 matches for better coverage)
        const [history1, history2] = await Promise.all([
            getPlayerMatchHistory(player1.player_id, gameId1, FACEIT_API_KEY, 50),
            getPlayerMatchHistory(player2.player_id, gameId2, FACEIT_API_KEY, 50),
        ]);

        // Create a set of match IDs from player 2's history
        const player2MatchIds = new Set(history2.items.map((m) => m.match_id));

        // Find shared matches
        const sharedMatches: Array<{
            matchId: string;
            date: number;
            result: string;
            sameTeam: boolean;
        }> = [];

        for (const match of history1.items) {
            if (player2MatchIds.has(match.match_id)) {
                // Get players arrays with null safety
                const faction1Players = match.teams?.faction1?.players || match.teams?.faction1?.roster || [];
                const faction2Players = match.teams?.faction2?.players || match.teams?.faction2?.roster || [];

                // Determine if they were on the same team
                const p1InFaction1 = faction1Players.some(
                    (p) => p.player_id === player1.player_id
                );
                const p2InFaction1 = faction1Players.some(
                    (p) => p.player_id === player2.player_id
                );

                // Check faction2
                const p1InFaction2 = faction2Players.some(
                    (p) => p.player_id === player1.player_id
                );
                const p2InFaction2 = faction2Players.some(
                    (p) => p.player_id === player2.player_id
                );

                const sameTeam = (p1InFaction1 && p2InFaction1) || (p1InFaction2 && p2InFaction2);

                // Determine result for player 1
                const p1Team = p1InFaction1 ? "faction1" : "faction2";
                const won = match.results?.winner === p1Team;

                sharedMatches.push({
                    matchId: match.match_id,
                    date: match.finished_at,
                    result: won ? "WIN" : "LOSS",
                    sameTeam,
                });
            }
        }

        return {
            sharedMatches,
            player1Nickname: player1.nickname,
            player2Nickname: player2.nickname,
            error: null,
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to find shared matches";
        return { sharedMatches: [], player1Nickname: "", player2Nickname: "", error: message };
    }
}

// Check if player is in a live match
export async function checkPlayerLiveMatch(playerId: string): Promise<{
    match: FaceitOngoingMatch | null;
    error: string | null;
}> {
    if (!FACEIT_API_KEY) {
        return { match: null, error: "API key not configured." };
    }

    try {
        const match = await getPlayerOngoingMatch(playerId, FACEIT_API_KEY);
        return { match, error: null };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to check live match";
        return { match: null, error: message };
    }
}

// Get player's map statistics
export async function fetchPlayerMapStats(playerId: string): Promise<{
    mapStats: PlayerMapStats[];
    error: string | null;
}> {
    if (!FACEIT_API_KEY) {
        return { mapStats: [], error: "API key not configured." };
    }

    try {
        const mapStats = await getPlayerMapStats(playerId, FACEIT_API_KEY, 50);
        return { mapStats, error: null };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch map stats";
        return { mapStats: [], error: message };
    }
}

// Get team analysis (all players' map stats)
export async function fetchTeamAnalysis(players: { player_id: string; nickname: string }[]): Promise<{
    teamStats: Array<{
        playerId: string;
        nickname: string;
        mapStats: PlayerMapStats[];
    }>;
    error: string | null;
}> {
    if (!FACEIT_API_KEY) {
        return { teamStats: [], error: "API key not configured." };
    }

    try {
        const teamStats = await Promise.all(
            players.map(async (player) => {
                const mapStats = await getPlayerMapStats(player.player_id, FACEIT_API_KEY, 30);
                return {
                    playerId: player.player_id,
                    nickname: player.nickname,
                    mapStats,
                };
            })
        );
        return { teamStats, error: null };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch team analysis";
        return { teamStats: [], error: message };
    }
}
