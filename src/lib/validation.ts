/**
 * Input validation & sanitization utilities
 * Security + Edge Cases
 */

// Validate Faceit player ID format
export function isValidPlayerId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    // Faceit player IDs are UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

// Validate Faceit match ID format
export function isValidMatchId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    // Match IDs start with "1-" followed by UUID
    const matchIdRegex = /^1-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return matchIdRegex.test(id);
}

// Validate nickname (prevent injection)
export function isValidNickname(nickname: string): boolean {
    if (!nickname || typeof nickname !== 'string') return false;
    if (nickname.length < 2 || nickname.length > 30) return false;
    // Only alphanumeric, underscore, hyphen
    const nicknameRegex = /^[a-zA-Z0-9_-]+$/;
    return nicknameRegex.test(nickname);
}

// Sanitize string input
export function sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
        .trim()
        .slice(0, 100) // Max length
        .replace(/[<>\"'&]/g, ''); // Remove potential XSS characters
}

// Validate URL (for Faceit URLs)
export function isValidFaceitUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        return parsed.hostname.includes('faceit.com');
    } catch {
        return false;
    }
}

// Extract match ID from URL safely
export function extractMatchIdFromUrl(url: string): string | null {
    if (!url) return null;
    const sanitized = sanitizeInput(url);
    const matchResult = sanitized.match(/room\/(1-[a-f0-9-]+)/i);
    if (matchResult && isValidMatchId(matchResult[1])) {
        return matchResult[1];
    }
    // Maybe it's just the ID
    if (isValidMatchId(sanitized)) {
        return sanitized;
    }
    return null;
}

// Rate limit check for client
export function canMakeRequest(
    lastRequestTime: number,
    minInterval: number = 200
): boolean {
    return Date.now() - lastRequestTime >= minInterval;
}

// Safe number parsing
export function safeParseInt(value: unknown, fallback: number = 0): number {
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
}

export function safeParseFloat(value: unknown, fallback: number = 0): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
}

// Clamp number to range
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

// Safe array access
export function safeArrayAccess<T>(arr: T[] | undefined | null, index: number, fallback: T): T {
    if (!arr || !Array.isArray(arr) || index < 0 || index >= arr.length) {
        return fallback;
    }
    return arr[index];
}

// Safe object property access
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
    if (!obj || typeof obj !== 'object') return fallback;
    const keys = path.split('.');
    let current: unknown = obj;
    for (const key of keys) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return fallback;
        }
        current = (current as Record<string, unknown>)[key];
    }
    return (current as T) ?? fallback;
}

// Debounce function for search inputs
export function debounce<T extends (...args: Parameters<T>) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

// Throttle function for API calls
export function throttle<T extends (...args: Parameters<T>) => void>(
    fn: T,
    limit: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            fn(...args);
        }
    };
}
