/**
 * Faceit API Key Rotation System
 * Per-key cooldowns: when a key hits a rate limit it is blocked for a fixed
 * window. getActiveApiKey always returns a currently-unblocked key when one
 * exists, otherwise the key that recovers soonest. A 429 on one key never
 * resets another key's cooldown.
 */

interface KeyState {
    // blockedUntil[i] = epoch ms until which key i is rate-limited (0 = free)
    blockedUntil: number[];
}

// API Keys from environment
const API_KEYS = [
    process.env.FACEIT_API_KEY,           // Primary key
    process.env.FACEIT_API_KEY_BACKUP,    // Backup key
].filter(Boolean) as string[];

// How long a key stays blocked after a 429 (60 seconds)
const KEY_COOLDOWN = 60 * 1000;

// In-memory state (resets on server restart)
const state: KeyState = {
    blockedUntil: API_KEYS.map(() => 0),
};

/**
 * Index of the key getActiveApiKey would currently return:
 * the first unblocked key, or the one whose cooldown ends soonest.
 */
function activeKeyIndex(): number {
    const now = Date.now();
    for (let i = 0; i < API_KEYS.length; i++) {
        if (state.blockedUntil[i] <= now) {
            return i;
        }
    }
    let soonest = 0;
    for (let i = 1; i < API_KEYS.length; i++) {
        if (state.blockedUntil[i] < state.blockedUntil[soonest]) {
            soonest = i;
        }
    }
    return soonest;
}

/**
 * Get the current active API key. Never throws while at least one key is
 * configured; throws only when no keys are set at all.
 */
export function getActiveApiKey(): string {
    if (API_KEYS.length === 0) {
        throw new Error("No Faceit API key configured");
    }
    return API_KEYS[activeKeyIndex()];
}

/**
 * Call this when a rate limit error (429) is received.
 * Blocks the currently active key for the cooldown window and reports whether
 * another key is available to retry with immediately. A 429 on the backup
 * NEVER unblocks or resets the primary key's cooldown.
 */
export function handleRateLimitError(): boolean {
    if (API_KEYS.length === 0) {
        return false;
    }

    const idx = activeKeyIndex();
    const now = Date.now();
    const wasBlocked = state.blockedUntil[idx] > now;
    state.blockedUntil[idx] = now + KEY_COOLDOWN;

    // Log only on the block transition, never per-call, to avoid log spam.
    if (!wasBlocked) {
        console.warn(`[API Key] Key #${idx} rate limited, blocked for ${KEY_COOLDOWN / 1000}s`);
    }

    // Is there another key that is currently unblocked to retry with?
    for (let i = 0; i < API_KEYS.length; i++) {
        if (i !== idx && state.blockedUntil[i] <= now) {
            return true;
        }
    }
    return false;
}

/**
 * Check if we have more than one key to rotate between
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
    const idx = activeKeyIndex();
    const now = Date.now();
    return {
        activeKey: idx === 0 ? "primary" : "backup",
        backupAvailable: API_KEYS.length > 1,
        primaryBlockedFor: state.blockedUntil[0] > now
            ? Math.round((state.blockedUntil[0] - now) / 1000)
            : undefined,
    };
}
