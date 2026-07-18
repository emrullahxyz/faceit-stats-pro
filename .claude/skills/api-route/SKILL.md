---
name: api-route
description: Faceit Stats Pro'da yeni bir API route handler eklerken veya mevcut birini düzenlerken uygulanacak proje konvansiyonları (key rotasyonu, validation, cache, hata yönetimi). Yeni endpoint yazarken veya src/app/api altında çalışırken kullan.
---

# Faceit API Route Konvansiyonları

Tüm route handler'lar `src/app/api/<name>/[param]/route.ts` altında yaşar ve aynı kalıbı izler. Referans örnek: `src/app/api/match-stats/[matchId]/route.ts`.

## Zorunlu kalıp (sırasıyla)

1. **API key**: Faceit API key'ini ASLA doğrudan `process.env`'den okuma. Her zaman `getActiveApiKey()` kullan (`@/lib/api-keys`). Key yoksa 500 döndür:
   ```ts
   let FACEIT_API_KEY: string;
   try {
       FACEIT_API_KEY = getActiveApiKey();
   } catch {
       return NextResponse.json({ error: "API key not configured" }, { status: 500 });
   }
   ```
2. **Params**: Next.js 16'da `params` bir Promise'tir — `const { matchId } = await params;` şeklinde await et.
3. **Validation**: Her dinamik param `@/lib/validation` ile doğrulanır (`isValidMatchId`, `isValidPlayerId`, `isValidNickname`). Geçersizse 400 döndür. Yeni bir param tipi gerekiyorsa önce validation.ts'e validator ekle.
4. **Rate limit (429)**: Faceit'ten 429 gelirse `handleRateLimitError()` çağır (`@/lib/api-keys`). `true` dönerse (başka key müsait) isteği BİR kez yeni key'le tekrarla; `false` dönerse 429'u client'a yansıt. Bir key'in 429'u diğer key'in cooldown'ını asla sıfırlamaz — bu davranışı bozma.
5. **Timeout**: Dış HTTP çağrılarında her zaman timeout olmalı. `fetchWithTimeout` (`@/lib/error-handling`) kullan; axios kullanılıyorsa `timeout` opsiyonunu mutlaka ver (timeout'suz axios çağrısı geçmişte deadlock'a yol açtı).
6. **Cache**: Pahalı/değişmez veri (biten maç istatistikleri gibi) `match-stats-cache.ts` kalıbıyla Prisma üzerinden kalıcı cache'lenir. Response'a uygun `Cache-Control` header'ı ekle (ör. `private, max-age=3600`).
7. **Hata yönetimi**: Route gövdesi tek bir `try/catch` ile sarılır; hata `console.error` ile loglanır ve client'a jenerik `{ error: "..." }` JSON'ı döner. Stack trace veya iç detay asla client'a sızmaz. Kullanıcıya gösterilecek mesajlar için `ERROR_MESSAGES` (`@/lib/error-handling`) Türkçe sözlüğü kullanılır.

## Yapma

- Response içinde API key, env değişkeni veya iç URL döndürme.
- `src/app/api/proxy/route.ts` benzeri açık proxy davranışı ekleme; hedef URL'ler her zaman allowlist'ten doğrulanmalı (`isValidFaceitUrl`).
- Client tarafında Faceit API'yi doğrudan çağırma — her dış çağrı bir route handler'dan geçer.
