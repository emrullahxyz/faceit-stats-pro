/**
 * Centralized Error Handling & Rate Limiting Utilities
 * Designed for 1000+ concurrent users
 */

// Error types for better categorization
export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
        public isOperational: boolean = true
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class RateLimitError extends AppError {
    constructor(retryAfter?: number) {
        super(
            retryAfter
                ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
                : 'Rate limit exceeded. Please try again later.',
            'RATE_LIMIT_EXCEEDED',
            429
        );
        this.name = 'RateLimitError';
    }
}

export class ApiError extends AppError {
    constructor(message: string, statusCode: number = 500) {
        super(message, 'API_ERROR', statusCode);
        this.name = 'ApiError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR', 400);
        this.name = 'ValidationError';
    }
}

// User-friendly error messages (Turkish)
export const ERROR_MESSAGES: Record<string, string> = {
    RATE_LIMIT_EXCEEDED: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.',
    API_ERROR: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    NETWORK_ERROR: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
    PLAYER_NOT_FOUND: 'Oyuncu bulunamadı.',
    MATCH_NOT_FOUND: 'Maç bulunamadı.',
    VALIDATION_ERROR: 'Geçersiz giriş.',
    TIMEOUT: 'İstek zaman aşımına uğradı.',
    SERVER_ERROR: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
};

// Get user-friendly message
export function getUserFriendlyMessage(error: unknown): string {
    if (error instanceof AppError) {
        return ERROR_MESSAGES[error.code] || error.message;
    }
    if (error instanceof Error) {
        if (error.message.includes('fetch')) return ERROR_MESSAGES.NETWORK_ERROR;
        if (error.message.includes('timeout')) return ERROR_MESSAGES.TIMEOUT;
        return error.message;
    }
    return ERROR_MESSAGES.API_ERROR;
}

// Safe JSON parse
export function safeJsonParse<T>(json: string, fallback: T): T {
    try {
        return JSON.parse(json) as T;
    } catch {
        return fallback;
    }
}

// Retry with exponential backoff (for 1000+ users)
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on validation errors
            if (error instanceof ValidationError) {
                throw error;
            }

            // Calculate delay with jitter to prevent thundering herd
            const delay = Math.min(
                baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
                maxDelay
            );

            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('Max retries exceeded');
}

// Request queue for rate limiting (client-side)
class RequestQueue {
    private queue: Array<() => Promise<void>> = [];
    private processing = false;
    private requestsPerSecond: number;
    private lastRequestTime = 0;

    constructor(requestsPerSecond: number = 5) {
        this.requestsPerSecond = requestsPerSecond;
    }

    async add<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            this.process();
        });
    }

    private async process(): Promise<void> {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const now = Date.now();
            const minInterval = 1000 / this.requestsPerSecond;
            const timeSinceLastRequest = now - this.lastRequestTime;

            if (timeSinceLastRequest < minInterval) {
                await new Promise(resolve =>
                    setTimeout(resolve, minInterval - timeSinceLastRequest)
                );
            }

            const fn = this.queue.shift();
            if (fn) {
                this.lastRequestTime = Date.now();
                await fn();
            }
        }

        this.processing = false;
    }
}

// Global request queue (5 requests per second for 1000 users)
export const globalRequestQueue = new RequestQueue(5);

// Fetch with timeout and error handling
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = 10000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });

        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new RateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
        }

        if (!response.ok) {
            throw new ApiError(
                `HTTP ${response.status}: ${response.statusText}`,
                response.status
            );
        }

        return response;
    } catch (error) {
        if (error instanceof AppError) throw error;
        if (error instanceof Error && error.name === 'AbortError') {
            throw new AppError('Request timed out', 'TIMEOUT', 408);
        }
        throw new ApiError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
        clearTimeout(timeoutId);
    }
}

// Log error (could be extended to send to monitoring service)
export function logError(error: unknown, context?: string): void {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[${timestamp}]${context ? ` [${context}]` : ''} Error:`, errorMessage);
    if (errorStack) {
        console.error('Stack:', errorStack);
    }

    // TODO: In production, send to error monitoring service (Sentry, etc.)
}

// Rate limit status tracker (for UI feedback)
export const rateLimitStatus = {
    isLimited: false,
    retryAfter: 0,

    setLimited(seconds: number): void {
        this.isLimited = true;
        this.retryAfter = seconds;
        setTimeout(() => {
            this.isLimited = false;
            this.retryAfter = 0;
        }, seconds * 1000);
    },

    check(): { limited: boolean; retryAfter: number } {
        return { limited: this.isLimited, retryAfter: this.retryAfter };
    }
};
