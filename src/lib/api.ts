import axios, { AxiosError } from "axios";
import { getActiveApiKey, handleRateLimitError } from "./api-keys";

const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

// Create axios instance with base configuration
const faceitApi = axios.create({
    baseURL: FACEIT_API_BASE,
    headers: {
        Accept: "application/json",
    },
});

// Axios interceptor for automatic key rotation on 429 errors
faceitApi.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 429) {
            const switched = handleRateLimitError();
            if (switched && error.config) {
                // Retry with new key
                const newKey = getActiveApiKey();
                error.config.headers.Authorization = `Bearer ${newKey}`;
                return axios(error.config);
            }
        }
        return Promise.reject(error);
    }
);

// Types for Faceit API responses
export interface FaceitPlayer {
    player_id: string;
    nickname: string;
    avatar: string;
    country: string;
    cover_image: string;
    games: {
        cs2?: {
            faceit_elo: number;
            skill_level: number;
            region: string;
        };
        csgo?: {
            faceit_elo: number;
            skill_level: number;
            region: string;
        };
    };
    faceit_url: string;
}

export interface FaceitPlayerStats {
    player_id: string;
    lifetime: Record<string, string>;
}

export interface FaceitMatchPlayer {
    player_id: string;
    nickname: string;
    avatar: string;
    skill_level?: number;
    game_player_id?: string;
    game_skill_level?: number;
    faceit_url?: string;
}

export interface FaceitMatch {
    match_id: string;
    game_id: string;
    region: string;
    match_type: string;
    teams: {
        faction1: {
            team_id?: string;
            faction_id?: string;
            name?: string;
            nickname?: string;
            avatar?: string;
            type?: string;
            players?: FaceitMatchPlayer[];
            roster?: FaceitMatchPlayer[];
        };
        faction2: {
            team_id?: string;
            faction_id?: string;
            name?: string;
            nickname?: string;
            avatar?: string;
            type?: string;
            players?: FaceitMatchPlayer[];
            roster?: FaceitMatchPlayer[];
        };
    };
    results?: {
        winner?: string;
        score?: {
            faction1: number;
            faction2: number;
        };
    };
    finished_at: number;
    started_at: number;
    demo_url?: string[];
    faceit_url: string;
}

export interface FaceitMatchHistory {
    items: FaceitMatch[];
    start: number;
    end: number;
}

export interface FaceitEloHistory {
    items: Array<{
        elo: number;
        date: string;
        match_id: string;
    }>;
}

// Search players - case insensitive
export interface FaceitSearchResult {
    items: Array<{
        player_id: string;
        nickname: string;
        avatar: string;
        country: string;
        verified: boolean;
        games: Array<{
            name: string;
            skill_level: number;
        }>;
    }>;
}

export async function searchPlayers(nickname: string, apiKey: string): Promise<FaceitSearchResult> {
    const response = await faceitApi.get(`/search/players`, {
        params: { nickname, limit: 5 },
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    return response.data;
}

// API Functions
export async function getPlayerByNickname(nickname: string, apiKey: string): Promise<FaceitPlayer> {
    try {
        // First try exact match
        const response = await faceitApi.get(`/players`, {
            params: { nickname },
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        return response.data;
    } catch (error) {
        // If exact match fails, try case-insensitive search
        const searchResults = await searchPlayers(nickname, apiKey);

        if (searchResults.items && searchResults.items.length > 0) {
            // Find exact case-insensitive match
            const exactMatch = searchResults.items.find(
                (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
            );

            if (exactMatch) {
                // Fetch full player data with correct nickname
                const response = await faceitApi.get(`/players`, {
                    params: { nickname: exactMatch.nickname },
                    headers: { Authorization: `Bearer ${apiKey}` },
                });
                return response.data;
            }
        }

        // If no match found, throw original error
        throw error;
    }
}

export async function getPlayerStats(playerId: string, gameId: string, apiKey: string): Promise<FaceitPlayerStats> {
    const response = await faceitApi.get(`/players/${playerId}/stats/${gameId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    return response.data;
}

export async function getPlayerEloHistory(
    playerId: string,
    gameId: string,
    apiKey: string,
    limit: number = 100
): Promise<FaceitEloHistory> {
    const response = await faceitApi.get(`/players/${playerId}/history`, {
        params: { game: gameId, limit },
        headers: { Authorization: `Bearer ${apiKey}` },
    });

    // Extract ELO from match history and format as elo history
    const items = response.data.items.map((match: { match_id: string; finished_at: number; elo?: number }) => ({
        match_id: match.match_id,
        date: new Date(match.finished_at * 1000).toISOString().split('T')[0],
        elo: match.elo || 0,
    })).filter((item: { elo: number }) => item.elo > 0);

    return { items: items.reverse() }; // Reverse to show oldest first
}

export async function getPlayerMatchHistory(
    playerId: string,
    gameId: string,
    apiKey: string,
    limit: number = 20
): Promise<FaceitMatchHistory> {
    const response = await faceitApi.get(`/players/${playerId}/history`, {
        params: { game: gameId, limit },
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    return response.data;
}

export async function getMatchDetails(matchId: string, apiKey: string): Promise<FaceitMatch> {
    const response = await faceitApi.get(`/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    return response.data;
}

// Match stats interface
export interface FaceitMatchStats {
    rounds: Array<{
        round_stats: {
            Map: string;
            Winner: string;
            Score: string;
        };
        teams: Array<{
            team_id: string;
            team_stats: Record<string, string>;
            players: Array<{
                player_id: string;
                nickname: string;
                player_stats: {
                    Kills: string;
                    Deaths: string;
                    Assists: string;
                    "K/D Ratio": string;
                    "K/R Ratio": string;
                    ADR?: string;
                    Headshots?: string;
                    "Headshots %"?: string;
                    MVPs?: string;
                    "Triple Kills"?: string;
                    "Quadro Kills"?: string;
                    "Penta Kills"?: string;
                };
            }>;
        }>;
    }>;
}

export async function getMatchStats(matchId: string, apiKey: string): Promise<FaceitMatchStats> {
    const response = await faceitApi.get(`/matches/${matchId}/stats`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    return response.data;
}

// Check if player is currently in a match
export interface FaceitOngoingMatch {
    match_id: string;
    game_id: string;
    status: string;
    teams: {
        faction1: {
            team_id: string;
            nickname: string;
            avatar: string;
            type: string;
            players: FaceitMatchPlayer[];
        };
        faction2: {
            team_id: string;
            nickname: string;
            avatar: string;
            type: string;
            players: FaceitMatchPlayer[];
        };
    };
    voting?: {
        map?: {
            pick: string[];
        };
    };
    faceit_url: string;
}

export async function getPlayerOngoingMatch(playerId: string, apiKey: string): Promise<FaceitOngoingMatch | null> {
    try {
        // Check player's recent matches to find ongoing one
        const response = await faceitApi.get(`/players/${playerId}/history`, {
            params: { game: "cs2", limit: 1, offset: 0 },
            headers: { Authorization: `Bearer ${apiKey}` },
        });

        if (response.data.items && response.data.items.length > 0) {
            const latestMatch = response.data.items[0];
            // Check if match is ongoing (no finished_at or status is not finished)
            if (!latestMatch.finished_at || latestMatch.status === "ONGOING" || latestMatch.status === "READY" || latestMatch.status === "VOTING" || latestMatch.status === "CONFIGURING") {
                // Fetch full match details
                const matchDetails = await faceitApi.get(`/matches/${latestMatch.match_id}`, {
                    headers: { Authorization: `Bearer ${apiKey}` },
                });
                if (matchDetails.data.status !== "FINISHED" && matchDetails.data.status !== "CANCELLED") {
                    return matchDetails.data;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Error checking ongoing match:", error);
        return null;
    }
}

// Get player's map statistics
export interface PlayerMapStats {
    map: string;
    matches: number;
    wins: number;
    winRate: number;
    avgKills: number;
    avgDeaths: number;
    avgKD: number;
}

export async function getPlayerMapStats(playerId: string, apiKey: string, limit: number = 50): Promise<PlayerMapStats[]> {
    try {
        // Fetch match history
        const response = await faceitApi.get(`/players/${playerId}/history`, {
            params: { game: "cs2", limit },
            headers: { Authorization: `Bearer ${apiKey}` },
        });

        const matches = response.data?.items || [];
        console.log("Match history count:", matches.length);
        if (matches.length > 0) {
            console.log("First match keys:", Object.keys(matches[0]));
            console.log("First match voting:", matches[0].voting);
            console.log("First match competition_name:", matches[0].competition_name);
        }

        const mapData: Record<string, { wins: number; total: number; kills: number; deaths: number }> = {};

        for (const match of matches) {
            // Try multiple possible map field names
            let mapName = "Unknown";

            // Try voting.map.pick (array)
            if (match.voting?.map?.pick && Array.isArray(match.voting.map.pick) && match.voting.map.pick.length > 0) {
                mapName = match.voting.map.pick[0];
            }
            // Try voting.map (string)
            else if (typeof match.voting?.map === 'string') {
                mapName = match.voting.map;
            }
            // Try match_map_id or similar
            else if (match.map) {
                mapName = match.map;
            }
            // Try competition_name (sometimes contains map)
            else if (match.competition_name && match.competition_name.includes("de_")) {
                mapName = match.competition_name;
            }

            if (mapName === "Unknown") continue;

            // Determine if player won
            const inFaction1 = match.teams?.faction1?.players?.some(
                (p: { player_id: string }) => p.player_id === playerId
            );
            const playerTeam = inFaction1 ? "faction1" : "faction2";
            const won = match.results?.winner === playerTeam;

            if (!mapData[mapName]) {
                mapData[mapName] = { wins: 0, total: 0, kills: 0, deaths: 0 };
            }

            mapData[mapName].total++;
            if (won) mapData[mapName].wins++;
        }

        console.log("Map data collected:", mapData);

        // Convert to array and calculate stats
        const mapStats: PlayerMapStats[] = Object.entries(mapData).map(([map, data]) => ({
            map,
            matches: data.total,
            wins: data.wins,
            winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
            avgKills: 0, // Would need match stats API for this
            avgDeaths: 0,
            avgKD: 0,
        }));

        return mapStats.sort((a, b) => b.matches - a.matches);
    } catch (error) {
        console.error("Error fetching player map stats:", error);
        return [];
    }
}

// Get team map statistics (for opponent analysis)
export async function getTeamMapStats(players: FaceitMatchPlayer[], apiKey: string): Promise<{
    playerId: string;
    nickname: string;
    mapStats: PlayerMapStats[];
}[]> {
    const results = await Promise.all(
        players.map(async (player) => {
            const mapStats = await getPlayerMapStats(player.player_id, apiKey, 30);
            return {
                playerId: player.player_id,
                nickname: player.nickname,
                mapStats,
            };
        })
    );
    return results;
}

