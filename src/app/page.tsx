"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, BarChart3, Crosshair, ArrowLeftRight, Activity } from "lucide-react";
import { GlowCard } from "@/components/ui/glow-card";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Player Stats",
    description: "Elo, K/D, ADR and 40+ metrics tracked across every queue you play.",
    href: undefined as string | undefined,
  },
  {
    icon: Crosshair,
    title: "Match Analysis",
    description: "Full scoreboards with per-player breakdowns for every map.",
    href: "/match-analyzer" as string | undefined,
  },
  {
    icon: ArrowLeftRight,
    title: "PvP Compare",
    description: "Head-to-head stat duels. Settle the argument with data.",
    href: "/compare" as string | undefined,
  },
  {
    icon: Activity,
    title: "Live Match",
    description: "Scout the lobby while the knife round is still loading.",
    href: undefined as string | undefined,
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("EarlyDomDom");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/player/${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[220px] left-1/2 h-[640px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(0,229,255,0.09),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[180px] top-[120px] h-[640px] w-[640px] bg-[radial-gradient(closest-side,rgba(139,92,246,0.10),transparent_70%)]"
      />

      {/* Hero */}
      <section className="relative flex min-h-[78vh] flex-col items-center justify-center gap-[26px] px-6 pb-[70px] pt-[90px] text-center">
        <div className="font-mono text-xs tracking-[0.32em] text-cyan glow-text-cyan">
          CS2 · FACEIT · REAL-TIME ANALYTICS
        </div>
        <h1 className="gradient-headline m-0 max-w-[860px] text-[clamp(32px,6vw,68px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
          Your stats, weaponized.
        </h1>
        <p className="m-0 max-w-[520px] text-lg font-light text-muted-foreground">
          Deep Faceit analytics for players who queue to win.
        </p>

        {/* Glowing hero search */}
        <form
          onSubmit={handleSearch}
          className="relative mt-[10px] w-[min(680px,92vw)]"
        >
          <Search className="pointer-events-none absolute left-[22px] top-1/2 h-5 w-5 -translate-y-1/2 text-cyan drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]" />
          <input
            type="text"
            placeholder="Enter Faceit nickname..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            className="h-[66px] w-full rounded-2xl border border-cyan/25 bg-[rgba(12,14,17,0.72)] pl-[58px] pr-[110px] text-lg text-foreground outline-none backdrop-blur-[14px] transition-[border-color] duration-300 [box-shadow:0_0_30px_rgba(0,229,255,0.07),0_14px_40px_rgba(0,0,0,0.5)] focus:border-cyan/85 focus:animate-pulse-glow"
          />
          <button
            type="submit"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-white/10 px-2 py-1 font-mono text-[11px] text-text-faint transition-colors hover:border-cyan/60 hover:text-cyan"
          >
            ⏎ SEARCH
          </button>
        </form>
      </section>

      {/* Bento strip */}
      <section className="relative mx-auto max-w-[1280px] px-6 pb-10 sm:px-10">
        <h2 className="m-0 mb-5 text-[15px] font-semibold tracking-[0.22em] text-muted-foreground">
          WHAT&apos;S INSIDE
        </h2>
        <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <GlowCard
              key={f.title}
              href={f.href}
              className="flex flex-col gap-3.5 px-6 pb-[22px] pt-[26px] text-foreground"
            >
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] border border-cyan/25 bg-cyan/[0.08] shadow-[inset_0_0_14px_rgba(0,229,255,0.12)]">
                <f.icon className="h-[22px] w-[22px] text-cyan" />
              </div>
              <div className="text-[19px] font-bold">{f.title}</div>
              <div className="text-[13.5px] font-light leading-[1.55] text-muted-foreground">
                {f.description}
              </div>
              <div className="mt-auto font-mono text-[11px] tracking-[0.14em] text-cyan">
                EXPLORE →
              </div>
            </GlowCard>
          ))}
        </div>
      </section>
    </div>
  );
}
