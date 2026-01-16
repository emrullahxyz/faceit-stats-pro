import { NextRequest, NextResponse } from "next/server";

const STEAM_API_BASE = "https://api.steampowered.com";

// CS2 App ID
const CS2_APP_ID = 730;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ steamid: string }> }
) {
    const STEAM_API_KEY = process.env.STEAM_API_KEY || "";

    if (!STEAM_API_KEY) {
        return NextResponse.json({
            error: "Steam API key not configured",
            steamData: null
        });
    }

    try {
        const { steamid } = await params;

        // Fetch player summary
        const summaryResponse = await fetch(
            `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamid}`
        );

        if (!summaryResponse.ok) {
            return NextResponse.json({
                error: "Failed to fetch Steam profile",
                steamData: null
            });
        }

        const summaryData = await summaryResponse.json();
        const player = summaryData.response?.players?.[0];

        if (!player) {
            return NextResponse.json({
                error: "Steam profile not found",
                steamData: null
            });
        }

        // Fetch owned games for CS2 playtime
        const gamesResponse = await fetch(
            `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamid}&include_appinfo=1&include_played_free_games=1`
        );

        let cs2Playtime = 0;
        let totalPlaytime = 0;

        if (gamesResponse.ok) {
            const gamesData = await gamesResponse.json();
            const games = gamesData.response?.games || [];

            // Find CS2/CSGO
            const cs2Game = games.find((g: { appid: number }) => g.appid === CS2_APP_ID);
            if (cs2Game) {
                cs2Playtime = cs2Game.playtime_forever || 0; // in minutes
            }

            // Total playtime across all games
            totalPlaytime = games.reduce((sum: number, g: { playtime_forever: number }) =>
                sum + (g.playtime_forever || 0), 0
            );
        }

        // Calculate account age
        const accountCreated = player.timecreated ? new Date(player.timecreated * 1000) : null;
        const accountAgeYears = accountCreated
            ? Math.floor((Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24 * 365))
            : null;

        return NextResponse.json({
            steamData: {
                steamId: steamid,
                personaName: player.personaname,
                avatarUrl: player.avatarfull || player.avatar,
                profileUrl: player.profileurl,
                accountCreated: accountCreated?.toISOString(),
                accountAgeYears,
                cs2PlaytimeHours: Math.round(cs2Playtime / 60),
                totalPlaytimeHours: Math.round(totalPlaytime / 60),
                countryCode: player.loccountrycode,
                isOnline: player.personastate > 0,
                lastLogoff: player.lastlogoff ? new Date(player.lastlogoff * 1000).toISOString() : null,
            },
            error: null
        });
    } catch (error) {
        console.error("Steam API error:", error);
        return NextResponse.json({
            error: "Failed to fetch Steam data",
            steamData: null
        });
    }
}
