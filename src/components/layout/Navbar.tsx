"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Menu, X, Gamepad2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff5500]">
            <span className="text-sm font-bold text-white">FS</span>
          </div>
          <span className="hidden text-lg font-semibold text-foreground sm:inline-block">
            Faceit Stats Pro
          </span>
        </Link>

        {/* Desktop Search */}
        <form onSubmit={handleSearch} className="hidden flex-1 max-w-md mx-8 md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search player nickname..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 bg-secondary/50 border-border/50 focus:bg-secondary"
            />
          </div>
        </form>

        {/* Desktop Nav Links */}
        <div className="hidden items-center gap-4 md:flex">
          <Link href="/match-analyzer">
            <Button variant="ghost" size="sm" className="gap-1">
              <Gamepad2 className="h-4 w-4" />
              Analyze Match
            </Button>
          </Link>
          <Link href="/compare">
            <Button variant="ghost" size="sm">
              Compare
            </Button>
          </Link>
          <AuthButtons />
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t border-border/40 bg-background p-4 md:hidden">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search player nickname..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 bg-secondary/50"
              />
            </div>
          </form>
          <div className="flex flex-col gap-2">
            <Link href="/match-analyzer" onClick={() => setIsMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Gamepad2 className="h-4 w-4" />
                Analyze Match
              </Button>
            </Link>
            <Link href="/compare" onClick={() => setIsMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Compare Players
              </Button>
            </Link>
            <div className="mt-2">
              <AuthButtons />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

