# Faceit Stats Pro

CS2 oyuncuları için Faceit istatistik/analiz uygulaması. Next.js 16 (App Router) + React 19 + TypeScript, Prisma 7 + SQLite (better-sqlite3 adapter), Tailwind 4 + shadcn/ui (new-york), next-auth, react-query + zustand.

## Komutlar

- `npm run dev` — geliştirme sunucusu
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type check (test suite yok; ana güvenlik ağı budur, her düzenleme sonrası hook otomatik çalıştırır)

## Mimari

- `src/app/api/*/route.ts` — tüm Faceit API erişimi buradan geçer; client doğrudan dış API çağırmaz. Yeni endpoint yazarken **api-route skill'ini** izle (key rotasyonu, validation, cache, 429 kalıbı).
- `src/lib/api-keys.ts` — Faceit key rotasyonu + per-key cooldown. Key'leri asla doğrudan `process.env`'den okuma, asla client'a/loga sızdırma.
- `src/lib/validation.ts` — tüm dinamik route paramları buradaki validatorlardan geçer.
- `src/lib/error-handling.ts` — Türkçe `ERROR_MESSAGES` + `getUserFriendlyMessage` (axios hatası → kullanıcı mesajı); action'lar ham hata mesajı döndürmez.
- `src/lib/match-stats-cache.ts` — biten maç istatistikleri Prisma üzerinden kalıcı cache'lenir.
- `src/components/{ui,features,layout}` — ui: shadcn yapı taşları (kebab-case), features: domain bileşenleri (PascalCase). Yeni bileşen için **new-component skill'i** var.

## Kurallar

- Dış HTTP çağrılarında timeout zorunlu (timeout'suz axios geçmişte deadlock yarattı).
- `.env*` dosyaları düzenlenmez (hook engeller); yeni env değişkenini `.env.example`'a belgele.
- `prisma/dev.db` git'e girmez (sunucudaki canlı kopyayı ezme riski).
- Kullanıcıya görünen metinler Türkçe.
- Yeni bağımlılık eklemeden önce mevcut stack'le çözülemediğinden emin ol.
