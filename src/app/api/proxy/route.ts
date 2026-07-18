import { NextRequest, NextResponse } from "next/server";
import { isAxiosError } from "axios";
import { faceitGet } from "@/lib/api";
import { getKeyStatus } from "@/lib/api-keys";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
        return NextResponse.json({ error: "Missing endpoint parameter" }, { status: 400 });
    }

    // Only relative Faceit API paths: an absolute URL (or protocol-relative
    // "//host") would override the axios baseURL and turn this into an open
    // proxy that leaks the API key to arbitrary hosts.
    if (!endpoint.startsWith("/") || endpoint.startsWith("//") || endpoint.includes("://")) {
        return NextResponse.json({ error: "Invalid endpoint parameter" }, { status: 400 });
    }

    try {
        // Central faceitApi client: throttle, key rotation, 429 retry and
        // timeout are handled by the shared interceptors.
        const data = await faceitGet(endpoint);
        return NextResponse.json(data);
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            return NextResponse.json(
                { error: `Faceit API error: ${error.response.status}` },
                { status: error.response.status }
            );
        }
        console.error("Proxy error:", error);
        return NextResponse.json(
            { error: "Failed to fetch from Faceit API" },
            { status: 500 }
        );
    }
}

// Status endpoint
export async function POST(request: NextRequest) {
    const { action } = await request.json();

    if (action === "status") {
        return NextResponse.json({
            keys: getKeyStatus(),
            timestamp: Date.now(),
        });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
