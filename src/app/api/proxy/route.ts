import { NextRequest, NextResponse } from "next/server";
import { getActiveApiKey, handleRateLimitError } from "@/lib/api-keys";

const FACEIT_API_BASE = "https://open.faceit.com/data/v4";

// Token bucket rate limiter
class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private readonly maxTokens: number;
    private readonly refillRate: number; // tokens per second

    constructor(maxTokens: number = 10, refillRate: number = 2) {
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
    }

    private refill() {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
        this.lastRefill = now;
    }

    async acquire(): Promise<boolean> {
        this.refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        // Wait for token
        const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.refill();
        this.tokens -= 1;
        return true;
    }

    getStatus() {
        this.refill();
        return {
            tokens: Math.floor(this.tokens),
            maxTokens: this.maxTokens
        };
    }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter(10, 2);

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
        return NextResponse.json({ error: "Missing endpoint parameter" }, { status: 400 });
    }

    // Wait for rate limit token
    await rateLimiter.acquire();

    let apiKey: string;
    try {
        apiKey = getActiveApiKey();
    } catch {
        return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    try {
        let response = await fetch(`${FACEIT_API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${apiKey}` }
        });

        // Handle rate limit with automatic key rotation
        if (response.status === 429) {
            const switched = handleRateLimitError();
            if (switched) {
                apiKey = getActiveApiKey();
                // Retry with new key
                response = await fetch(`${FACEIT_API_BASE}${endpoint}`, {
                    headers: { Authorization: `Bearer ${apiKey}` }
                });
            }
        }

        if (!response.ok) {
            return NextResponse.json(
                { error: `Faceit API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
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
            rateLimiter: rateLimiter.getStatus(),
            timestamp: Date.now()
        });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
