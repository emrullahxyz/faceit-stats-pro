---
name: new-component
description: Faceit Stats Pro için yeni React bileşeni oluşturur (shadcn/ui new-york stili, Tailwind 4, CVA kalıbı). /new-component <isim> ile çağrılır.
disable-model-invocation: true
---

# Yeni Bileşen Oluşturma

Kullanıcının verdiği isim ve tarife göre proje konvansiyonlarına uygun bir bileşen oluştur.

## Konum kuralları

- **`src/components/ui/`** — genel, domain'siz yapı taşları (button, card, badge...). Dosya adı kebab-case (`dropdown-menu.tsx`). Önce `npx shadcn@latest add <bileşen>` ile resmi registry'den eklenebiliyor mu bak; ancak registry'de yoksa elle yaz.
- **`src/components/features/`** — domain bileşenleri (maç, oyuncu, istatistik). Dosya adı PascalCase (`AIPrediction.tsx`). Maça özel olanlar `features/match/`, oyuncuya özel olanlar `features/player/` altına.
- **`src/components/layout/`** — navbar, footer gibi sayfa iskeleti.

## Kod konvansiyonları

- shadcn/ui **new-york** stili, baseColor **neutral**, CSS variables aktif (`components.json`).
- Class birleştirme her zaman `cn()` ile (`@/lib/utils` — clsx + tailwind-merge).
- Varyantlı bileşenlerde `class-variance-authority` (CVA) kalıbı kullan — örnek: `src/components/ui/button.tsx`.
- İkonlar sadece `lucide-react`'ten.
- Animasyon: öncelik `tw-animate-css` / Tailwind utility'leri; karmaşık geçişlerde `framer-motion`.
- Server Component varsayılandır; sadece state/etkileşim/hook gerekiyorsa `"use client"` ekle.
- Veri çekme client bileşenlerinde `@tanstack/react-query`, global UI state'te `zustand` ile yapılır — bileşen içinde elle `fetch` + `useEffect` yazma.
- Tema: `next-themes` ile dark/light destekleniyor; renkleri hardcode etme, globals.css'teki CSS değişkenlerini kullan.

## Çıktı

1. Bileşen dosyasını doğru klasöre yaz.
2. Gerekliyse kısa bir kullanım örneği göster (nereye import edilecek).
3. Yeni bağımlılık EKLEME — mevcut stack her ihtiyacı karşılıyor.
