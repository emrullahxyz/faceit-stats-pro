"use server";

import {
    getPlayerByNickname,
    getPlayerStats,
    getPlayerMatchHistory,
    getMatchDetails,
    getPlayerOngoingMatch,
    getPlayerMapStats,
    type FaceitPlayer,
    type FaceitPlayerStats,
    type FaceitMatchHistory,
    type FaceitMatch,
    type FaceitMatchStats,
    type FaceitOngoingMatch,
    type PlayerMapStats,
} from "@/lib/api";
import { getMatchStatsCached } from "@/lib/match-stats-cache";
import { getUserFriendlyMessage, ERROR_MESSAGES } from "@/lib/error-handling";

// The central faceitApi client stamps the active key on every request, so
// actions don't fetch or forward API keys; a missing key surfaces as a thrown
// error caught by each action's catch block.
export async function fetchPlayerData(nickname: string): Promise<{
    player: FaceitPlayer | null;
    stats: FaceitPlayerStats | null;
    matches: FaceitMatchHistory | null;
    error: string | null;
}> {
    try {
        const player = await getPlayerByNickname(nickname);

        // Determine which game to fetch stats for (CS2 preferred, fallback to CSGO)
        const gameId = player.games?.cs2 ? "cs2" : player.games?.csgo ? "csgo" : null;

        if (!gameId) {
            return {
                player,
                stats: null,
                matches: null,
                error: "Oyuncunun Faceit'te CS2 veya CSGO verisi yok.",
            };
        }

        const [stats, matches] = await Promise.all([
            getPlayerStats(player.player_id, gameId).catch(() => null),
            getPlayerMatchHistory(player.player_id, gameId, 20).catch(() => null),
        ]);

        return {
            player,
            stats,
            matches,
            error: null,
        };
    } catch (error: unknown) {
        return {
            player: null,
            stats: null,
            matches: null,
            error: getUserFriendlyMessage(error, `"${nickname}" adlı oyuncu Faceit'te bulunamadı.`),
        };
    }
}

// Fetch match details with full scoreboard
export async function fetchMatchDetails(matchId: string): Promise<{
    match: FaceitMatch | null;
    error: string | null;
}> {
    try {
        const match = await getMatchDetails(matchId);
        return { match, error: null };
    } catch (error: unknown) {
        return { match: null, error: getUserFriendlyMessage(error, ERROR_MESSAGES.MATCH_NOT_FOUND) };
    }
}

// Fetch match with full stats (for detailed match page)
export async function fetchMatchWithStats(matchId: string): Promise<{
    match: FaceitMatch | null;
    stats: FaceitMatchStats | null;
    error: string | null;
}> {
    try {
        // Match first so the cache gets a reliable finished/ongoing hint and
        // doesn't need its own verification call on a miss.
        const match = await getMatchDetails(matchId);
        const stats = await getMatchStatsCached(
            matchId,
            match.status === "FINISHED"
        ).catch(() => null);
        return { match, stats, error: null };
    } catch (error: unknown) {
        return {
            match: null,
            stats: null,
            error: getUserFriendlyMessage(error, ERROR_MESSAGES.MATCH_NOT_FOUND),
        };
    }
}

// Compare two players
export async function comparePlayersAction(nickname1: string, nickname2: string): Promise<{
    player1: { player: FaceitPlayer; stats: FaceitPlayerStats | null } | null;
    player2: { player: FaceitPlayer; stats: FaceitPlayerStats | null } | null;
    error: string | null;
}> {
    try {
        const [data1, data2] = await Promise.all([
            fetchPlayerData(nickname1),
            fetchPlayerData(nickname2),
        ]);

        if (data1.error) {
            return { player1: null, player2: null, error: `1. oyuncu: ${data1.error}` };
        }
        if (data2.error) {
            return { player1: null, player2: null, error: `2. oyuncu: ${data2.error}` };
        }

        return {
            player1: data1.player ? { player: data1.player, stats: data1.stats } : null,
            player2: data2.player ? { player: data2.player, stats: data2.stats } : null,
            error: null,
        };
    } catch (error: unknown) {
        return { player1: null, player2: null, error: getUserFriendlyMessage(error) };
    }
}

// Find shared matches between two players
export async function findSharedMatches(
    nickname1: string,
    nickname2: string
): Promise<{
    sharedMatches: Array<{
        matchId: string;
        faceitUrl: string;
        date: number;
        result: string;
        sameTeam: boolean;
    }>;
    player1Nickname: string;
    player2Nickname: string;
    checkedCounts: { player1: number; player2: number };
    partial: boolean;
    error: string | null;
}> {
    try {
        // Fetch both players
        const [player1, player2] = await Promise.all([
            getPlayerByNickname(nickname1),
            getPlayerByNickname(nickname2),
        ]);

        // Determine game IDs
        const gameId1 = player1.games?.cs2 ? "cs2" : player1.games?.csgo ? "csgo" : null;
        const gameId2 = player2.games?.cs2 ? "cs2" : player2.games?.csgo ? "csgo" : null;

        if (!gameId1 || !gameId2) {
            return {
                sharedMatches: [],
                player1Nickname: player1.nickname,
                player2Nickname: player2.nickname,
                checkedCounts: { player1: 0, player2: 0 },
                partial: false,
                error: "Oyunculardan birinin (veya ikisinin) CS verisi yok.",
            };
        }

        // Paginate up to 500 matches per player (5 pages of 100), sequentially.
        // A failure on the first page is fatal for that player; a later-page
        // failure just truncates coverage and flags the result as partial.
        async function loadHistory(playerId: string, gameId: string) {
            const items: FaceitMatch[] = [];
            let partial = false;
            for (let page = 0; page < 5; page++) {
                try {
                    const res = await getPlayerMatchHistory(playerId, gameId, 100, page * 100);
                    const batch = res.items ?? [];
                    items.push(...batch);
                    if (batch.length < 100) break;
                } catch (err) {
                    if (page === 0) throw err;
                    partial = true;
                    break;
                }
            }
            return { items, partial };
        }

        const [history1, history2] = await Promise.all([
            loadHistory(player1.player_id, gameId1),
            loadHistory(player2.player_id, gameId2),
        ]);

        // Create a set of match IDs from player 2's history
        const player2MatchIds = new Set(history2.items.map((m) => m.match_id));

        // Find shared matches
        const sharedMatches: Array<{
            matchId: string;
            faceitUrl: string;
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
                    faceitUrl: match.faceit_url,
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
            checkedCounts: { player1: history1.items.length, player2: history2.items.length },
            partial: history1.partial || history2.partial,
            error: null,
        };
    } catch (error: unknown) {
        return {
            sharedMatches: [],
            player1Nickname: "",
            player2Nickname: "",
            checkedCounts: { player1: 0, player2: 0 },
            partial: false,
            error: getUserFriendlyMessage(error, ERROR_MESSAGES.PLAYER_NOT_FOUND),
        };
    }
}

// Check if player is in a live match
export async function checkPlayerLiveMatch(playerId: string): Promise<{
    match: FaceitOngoingMatch | null;
    error: string | null;
}> {
    try {
        const match = await getPlayerOngoingMatch(playerId);
        return { match, error: null };
    } catch (error: unknown) {
        return { match: null, error: getUserFriendlyMessage(error) };
    }
}

// Get player's map statistics
export async function fetchPlayerMapStats(playerId: string): Promise<{
    mapStats: PlayerMapStats[];
    error: string | null;
}> {
    try {
        const mapStats = await getPlayerMapStats(playerId, 50);
        return { mapStats, error: null };
    } catch (error: unknown) {
        return { mapStats: [], error: getUserFriendlyMessage(error) };
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
    try {
        const teamStats = await Promise.all(
            players.map(async (player) => {
                const mapStats = await getPlayerMapStats(player.player_id, 30);
                return {
                    playerId: player.player_id,
                    nickname: player.nickname,
                    mapStats,
                };
            })
        );
        return { teamStats, error: null };
    } catch (error: unknown) {
        return { teamStats: [], error: getUserFriendlyMessage(error) };
    }
}
