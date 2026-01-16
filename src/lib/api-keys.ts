/**
 * Faceit API Key Rotation System
 * Automatically switches between primary and backup keys on rate limit errors
 */

interface KeyState {
    currentKeyIndex: number;
    primaryBlockedUntil: number | null;
    lastSwitchTime: number;
}

// In-memory state (resets on server restart)
const state: KeyState = {
    currentKeyIndex: 0,
    primaryBlockedUntil: null,
    lastSwitchTime: Date.now(),
};

// API Keys from environment
const API_KEYS = [
    process.env.FACEIT_API_KEY,           // Primary key
    process.env.FACEIT_API_KEY_BACKUP,    // Backup key
].filter(Boolean) as string[];

// How long to wait before trying primary key again (5 minutes)
const PRIMARY_RETRY_INTERVAL = 5 * 60 * 1000;

/**
 * Get the current active API key
 */
export function getActiveApiKey(): string {
    // If we have a primary blocked time and it has passed, try primary again
    if (state.primaryBlockedUntil && Date.now() > state.primaryBlockedUntil) {
        console.log("[API Key] Primary key cooldown expired, switching back to primary");
        state.currentKeyIndex = 0;
        state.primaryBlockedUntil = null;
    }

    const key = API_KEYS[state.currentKeyIndex];
    if (!key) {
        throw new Error("No Faceit API key configured");
    }
    return key;
}

/**
 * Call this when a rate limit error (429) is received
 * Switches to backup key if available
 */
export function handleRateLimitError(): boolean {
    if (API_KEYS.length <= 1) {
        console.warn("[API Key] No backup key available, cannot switch");
        return false;
    }

    if (state.currentKeyIndex === 0) {
        // Primary key hit rate limit, switch to backup
        state.currentKeyIndex = 1;
        state.primaryBlockedUntil = Date.now() + PRIMARY_RETRY_INTERVAL;
        state.lastSwitchTime = Date.now();
        console.log("[API Key] Primary key rate limited, switched to backup. Will retry primary in 5 minutes.");
        return true;
    } else {
        // Backup key also hit rate limit, back to primary
        state.currentKeyIndex = 0;
        state.primaryBlockedUntil = null;
        console.warn("[API Key] Backup key also rate limited, switching back to primary");
        return false;
    }
}

/**
 * Check if we should retry with another key
 */
export function hasBackupKey(): boolean {
    return API_KEYS.length > 1;
}

/**
 * Get current key status (for debugging)
 */
export function getKeyStatus(): {
    activeKey: "primary" | "backup";
    backupAvailable: boolean;
    primaryBlockedFor?: number;
} {
    return {
        activeKey: state.currentKeyIndex === 0 ? "primary" : "backup",
        backupAvailable: API_KEYS.length > 1,
        primaryBlockedFor: state.primaryBlockedUntil
            ? Math.max(0, Math.round((state.primaryBlockedUntil - Date.now()) / 1000))
            : undefined,
    };
}

/**
 * Wrapper for fetch with automatic key rotation on 429 errors
 */
export async function faceitFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const apiKey = getActiveApiKey();

    const response = await fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            ...options.headers,
        },
    });

    // Handle rate limit
    if (response.status === 429) {
        const switched = handleRateLimitError();
        if (switched) {
            // Retry with new key immediately
            const newApiKey = getActiveApiKey();
            console.log("[API Key] Retrying request with backup key...");
            return fetch(url, {
                ...options,
                headers: {
                    "Authorization": `Bearer ${newApiKey}`,
                    ...options.headers,
                },
            });
        }
    }

    return response;
}
