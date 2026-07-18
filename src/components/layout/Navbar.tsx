"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Menu, X } from "lucide-react";
import Link from "next/link";
import { AuthButtons } from "@/components/auth/AuthButtons";

export function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/player/${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsMenuOpen(false);
    }
  };

  const navLink =
    "text-[13px] text-muted-foreground transition-colors hover:text-cyan";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[rgba(7,7,8,0.72)] backdrop-blur-[14px]">
      <div className="flex items-center justify-between gap-6 px-5 py-3.5 sm:px-10">
        {/* Brand: orange diamond mark + wordmark */}
        <Link href="/" className="flex items-center gap-3 text-foreground">
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rotate-45 rounded-[3px] bg-orange shadow-[0_0_14px_rgba(255,85,0,0.5)]"
          />
          <span className="text-sm font-bold tracking-[0.14em]">
            FACEIT STATS <span className="text-cyan">PRO</span>
          </span>
        </Link>

        {/* Desktop: links + compact search */}
        <div className="hidden items-center gap-[22px] md:flex">
          <Link href="/match-analyzer" className={navLink}>
            Analyze
          </Link>
          <Link href="/compare" className={navLink}>
            Compare
          </Link>
          <form onSubmit={handleSearch} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
            <input
              type="text"
              placeholder="Search player"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[34px] w-[210px] rounded-[10px] border border-white/10 bg-white/[0.04] pl-[34px] pr-3 text-[13px] text-foreground outline-none transition-[border-color,box-shadow] duration-200 focus:border-cyan/70 focus:shadow-[0_0_18px_rgba(0,229,255,0.25)]"
            />
          </form>
          <AuthButtons />
        </div>

        {/* Mobile menu button */}
        <button
          aria-label="Menu"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:border-cyan/60 md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="border-t border-white/[0.06] bg-background p-4 md:hidden">
          <form onSubmit={handleSearch} className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
            <input
              type="text"
              placeholder="Search player"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-[10px] border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-foreground outline-none focus:border-cyan/70"
            />
          </form>
          <div className="flex flex-col gap-3">
            <Link
              href="/match-analyzer"
              className={navLink}
              onClick={() => setIsMenuOpen(false)}
            >
              Analyze Match
            </Link>
            <Link
              href="/compare"
              className={navLink}
              onClick={() => setIsMenuOpen(false)}
            >
              Compare Players
            </Link>
            <div className="mt-1">
              <AuthButtons />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
