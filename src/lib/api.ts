import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getActiveApiKeyWithIndex, handleRateLimitError } from "./api-keys";

const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

// Create axios instance with base configuration.
// The timeout is mandatory: a hung request would otherwise hold one of the
// MAX_CONCURRENT throttle slots forever and eventually deadlock all traffic.
const faceitApi = axios.create({
    baseURL: FACEIT_API_BASE,
    timeout: 10_000,
    headers: {
        Accept: "application/json",
    },
});

// Custom per-request bookkeeping carried on the axios config.
interface ThrottledConfig extends InternalAxiosRequestConfig {
    __retryCount?: number;
    __slotHeld?: boolean;
    __keyIndex?: number;
}

// ---- Global outgoing throttle -------------------------------------------
// Faceit rate-limits per key aggressively, so cap how fast we hit it:
// at most MAX_CONCURRENT in flight and >= MIN_SPACING_MS between request starts.
const MAX_CONCURRENT = 4;
const MIN_SPACING_MS = 250;

let activeRequests = 0;
let lastStart = 0;
const slotQueue: Array<() => void> = [];

function pumpSlots(): void {
    if (slotQueue.length === 0 || activeRequests >= MAX_CONCURRENT) {
        return;
    }
    const wait = lastStart + MIN_SPACING_MS - Date.now();
    if (wait > 0) {
        setTimeout(pumpSlots, wait);
        return;
    }
    const grant = slotQueue.shift();
    if (!grant) return;
    activeRequests++;
    lastStart = Date.now();
    grant();
    // Space out the next grant.
    if (slotQueue.length > 0) {
        setTimeout(pumpSlots, MIN_SPACING_MS);
    }
}

function acquireSlot(): Promise<void> {
    return new Promise((resolve) => {
        slotQueue.push(resolve);
        pumpSlots();
    });
}

function releaseSlot(): void {
    if (activeRequests > 0) {
        activeRequests--;
    }
    pumpSlots();
}

// Acquire a throttle slot and stamp the freshest unblocked key at send time,
// so queued/retried requests always use a currently-valid key.
faceitApi.interceptors.request.use(async (config) => {
    await acquireSlot();
    try {
        const { key, index } = getActiveApiKeyWithIndex();
        config.headers.Authorization = `Bearer ${key}`;
        // Stamp which key this request goes out with, so a 429 blocks THIS
        // key — not whichever key happens to be active at response time.
        (config as ThrottledConfig).__keyIndex = index;
    } catch (err) {
        releaseSlot();
        throw err;
    }
    (config as ThrottledConfig).__slotHeld = true;
    return config;
});

// Release the slot on completion and retry (with backoff + key rotation) on 429.
faceitApi.interceptors.response.use(
    (response) => {
        const cfg = response.config as ThrottledConfig;
        if (cfg.__slotHeld) {
            cfg.__slotHeld = false;
            releaseSlot();
        }
        return response;
    },
    async (error: AxiosError) => {
        const cfg = error.config as ThrottledConfig | undefined;
        if (cfg?.__slotHeld) {
            cfg.__slotHeld = false;
            releaseSlot();
        }

        if (error.response?.status === 429 && cfg) {
            handleRateLimitError(cfg.__keyIndex);
            const count = cfg.__retryCount ?? 0;
            if (count < 2) {
                cfg.__retryCount = count + 1;
                const delay = 2000 + Math.random() * 500;
                await new Promise((r) => setTimeout(r, delay));
                // Re-enters the request interceptor: fresh slot + fresh key.
                return faceitApi(cfg);
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Generic GET against the Faceit API through the shared throttled client
 * (slot semaphore, key rotation, 429 retry, timeout). For callers like the
 * proxy route that forward arbitrary — but validated — endpoint paths.
 */
export async function faceitGet<T = unknown>(path: string): Promise<T> {
    const response = await faceitApi.get<T>(path);
    return response.data;
}

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
    // e.g. "FINISHED", "ONGOING", "CANCELLED" — present on /matches/{id}
    status?: string;
    created_at?: number;
    voting?: {
        map?: {
            pick: string[];
        };
    };
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

// The request interceptor stamps the freshest unblocked key on every request,
// so API functions do not take (or forward) an apiKey parameter.
export async function searchPlayers(nickname: string): Promise<FaceitSearchResult> {
    const response = await faceitApi.get(`/search/players`, {
        params: { nickname, limit: 5 },
    });
    return response.data;
}

// API Functions
export async function getPlayerByNickname(nickname: string): Promise<FaceitPlayer> {
    try {
        // First try exact match
        const response = await faceitApi.get(`/players`, { params: { nickname } });
        return response.data;
    } catch (error) {
        // If exact match fails, try case-insensitive search
        const searchResults = await searchPlayers(nickname);

        if (searchResults.items && searchResults.items.length > 0) {
            // Find exact case-insensitive match
            const exactMatch = searchResults.items.find(
                (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
            );

            if (exactMatch) {
                // Fetch full player data with correct nickname
                const response = await faceitApi.get(`/players`, {
                    params: { nickname: exactMatch.nickname },
                });
                return response.data;
            }
        }

        // If no match found, throw original error
        throw error;
    }
}

export async function getPlayerById(playerId: string): Promise<FaceitPlayer> {
    const response = await faceitApi.get(`/players/${playerId}`);
    return response.data;
}

export async function getPlayerStats(playerId: string, gameId: string): Promise<FaceitPlayerStats> {
    const response = await faceitApi.get(`/players/${playerId}/stats/${gameId}`);
    return response.data;
}

export async function getPlayerMatchHistory(
    playerId: string,
    gameId: string,
    limit: number = 20,
    offset: number = 0
): Promise<FaceitMatchHistory> {
    const response = await faceitApi.get(`/players/${playerId}/history`, {
        params: { game: gameId, limit, offset },
    });
    return response.data;
}

export async function getMatchDetails(matchId: string): Promise<FaceitMatch> {
    const response = await faceitApi.get(`/matches/${matchId}`);
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
                    // Faceit returns many more stat keys than declared above
                    // (e.g. "First Kills", "Entry Count") — allow lookups.
                    [key: string]: string | undefined;
                };
            }>;
        }>;
    }>;
}

export async function getMatchStats(matchId: string): Promise<FaceitMatchStats> {
    const response = await faceitApi.get(`/matches/${matchId}/stats`);
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

export async function getPlayerOngoingMatch(playerId: string): Promise<FaceitOngoingMatch | null> {
    try {
        // Check player's recent matches to find ongoing one
        const response = await faceitApi.get(`/players/${playerId}/history`, {
            params: { game: "cs2", limit: 1, offset: 0 },
        });

        if (response.data.items && response.data.items.length > 0) {
            const latestMatch = response.data.items[0];
            // Check if match is ongoing (no finished_at or status is not finished)
            if (!latestMatch.finished_at || latestMatch.status === "ONGOING" || latestMatch.status === "READY" || latestMatch.status === "VOTING" || latestMatch.status === "CONFIGURING") {
                // Fetch full match details
                const matchDetails = await faceitApi.get(`/matches/${latestMatch.match_id}`);
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

export async function getPlayerMapStats(playerId: string, limit: number = 50): Promise<PlayerMapStats[]> {
    try {
        // Fetch match history
        const response = await faceitApi.get(`/players/${playerId}/history`, {
            params: { game: "cs2", limit },
        });

        const matches = response.data?.items || [];

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

