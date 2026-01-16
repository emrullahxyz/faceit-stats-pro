"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Users, History, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/player/${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const features = [
    {
      icon: TrendingUp,
      title: "ELO Tracking",
      description: "Track your ELO progression with interactive charts and detailed match-by-match analysis.",
    },
    {
      icon: Users,
      title: "Player Comparison",
      description: "Compare stats side-by-side with friends or rivals. See who dominates on which maps.",
    },
    {
      icon: History,
      title: "Match History",
      description: "Browse through your recent matches, view detailed scoreboards and performance stats.",
    },
    {
      icon: Download,
      title: "Demo Downloads",
      description: "Quick access to download match demos for review and analysis.",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#ff5500]/10 via-transparent to-transparent" />

        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              Your <span className="text-[#ff5500]">Faceit</span> Stats,{" "}
              <span className="text-[#ff5500]">Elevated</span>
            </h1>
            <p className="mb-10 text-lg text-muted-foreground md:text-xl">
              Deep dive into CS2 player statistics. Track ELO, analyze matches, compare with friends,
              and discover insights that help you improve.
            </p>

            {/* Search Box */}
            <form onSubmit={handleSearch} className="mx-auto max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter a Faceit nickname..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 pl-12 pr-32 text-lg bg-secondary/50 border-border/50 focus:bg-secondary focus:border-[#ff5500]/50"
                />
                <Button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#ff5500] hover:bg-[#ff5500]/90"
                >
                  Search
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border/40 bg-secondary/20">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Everything You Need
            </h2>
            <p className="text-muted-foreground">
              Powerful tools to analyze and improve your competitive gameplay.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group border-border/50 bg-card/50 transition-all hover:border-[#ff5500]/30 hover:bg-card"
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-[#ff5500]/10 text-[#ff5500] transition-colors group-hover:bg-[#ff5500]/20">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/40">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Ready to analyze your gameplay?
          </h2>
          <p className="mb-8 text-muted-foreground">
            Search for any player to get started. No login required.
          </p>
          <Button
            size="lg"
            className="bg-[#ff5500] hover:bg-[#ff5500]/90"
            onClick={() => document.querySelector("input")?.focus()}
          >
            Get Started
          </Button>
        </div>
      </section>
    </div>
  );
}
