import { NextRequest, NextResponse } from "next/server";
import { getMatchStats } from "@/lib/api";

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
        const stats = await getMatchStats(matchId, FACEIT_API_KEY);
        return NextResponse.json(stats);
    } catch (error) {
        console.error("Failed to fetch match stats:", error);
        return NextResponse.json({ error: "Failed to fetch match stats" }, { status: 500 });
    }
}
