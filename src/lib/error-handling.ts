import { isAxiosError } from "axios";

/**
 * Kullanıcıya gösterilecek Türkçe hata mesajları.
 * Server action'lar ham axios/Error mesajı yerine getUserFriendlyMessage
 * çıktısını döndürür; UI bu metinleri hata kartlarında gösterir.
 */
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

/**
 * Herhangi bir hatayı kullanıcıya gösterilebilir Türkçe mesaja çevirir.
 * `notFoundMessage` 404 durumunda bağlama özel metin vermek için kullanılır
 * (ör. "X adlı oyuncu bulunamadı").
 */
export function getUserFriendlyMessage(error: unknown, notFoundMessage?: string): string {
    if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 429) return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
        if (status === 404) return notFoundMessage ?? ERROR_MESSAGES.API_ERROR;
        if (error.code === "ECONNABORTED") return ERROR_MESSAGES.TIMEOUT;
        if (!error.response) return ERROR_MESSAGES.NETWORK_ERROR;
        if (status && status >= 500) return ERROR_MESSAGES.SERVER_ERROR;
        return ERROR_MESSAGES.API_ERROR;
    }
    return ERROR_MESSAGES.API_ERROR;
}
