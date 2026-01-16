import { fetchPlayerData } from "@/app/actions";
import { PlayerHeader } from "@/components/features/player/PlayerHeader";
import { StatsGrid } from "@/components/features/player/StatsGrid";
import { EloChart } from "@/components/features/player/EloChart";
import { MapAnalysis } from "@/components/features/player/MapAnalysis";
import { RadarStatsChart } from "@/components/features/player/RadarStatsChart";
import { MatchList } from "@/components/features/match/MatchList";
import { LiveMatch } from "@/components/features/match/LiveMatch";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PlayerPageProps {
    params: Promise<{ nickname: string }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
    const { nickname } = await params;
    const decodedNickname = decodeURIComponent(nickname);

    const { player, stats, matches, error } = await fetchPlayerData(decodedNickname);

    if (error) {
        return (
            <div className="container mx-auto px-4 py-16">
                <Card className="max-w-lg mx-auto border-border/50 bg-card/50">
                    <CardContent className="flex flex-col items-center py-12 text-center">
                        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">
                            Unable to Load Player
                        </h2>
                        <p className="text-muted-foreground mb-6">{error}</p>
                        <Link href="/">
                            <Button variant="outline" className="gap-2">
                                <Search className="h-4 w-4" />
                                Search Again
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!player) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Live Match (if in game) */}
            <LiveMatch playerId={player.player_id} playerNickname={player.nickname} />

            {/* Player Header */}
            <PlayerHeader player={player} />

            {/* Stats Grid */}
            {stats && <StatsGrid stats={stats} />}

            {/* Three Column Layout for Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ELO History Chart */}
                <EloChart playerId={player.player_id} playerNickname={player.nickname} />

                {/* Radar Stats Chart */}
                <RadarStatsChart playerId={player.player_id} stats={stats?.lifetime} />

                {/* Map Analysis */}
                <MapAnalysis playerId={player.player_id} />
            </div>

            {/* Match History */}
            {matches && (
                <MatchList
                    matches={matches.items}
                    currentPlayerId={player.player_id}
                    playerElo={player.games?.cs2?.faceit_elo || player.games?.csgo?.faceit_elo || 0}
                    playerLevel={player.games?.cs2?.skill_level || player.games?.csgo?.skill_level || 1}
                    playerNickname={player.nickname}
                />
            )}
        </div>
    );
}

export async function generateMetadata({ params }: PlayerPageProps) {
    const { nickname } = await params;
    const decodedNickname = decodeURIComponent(nickname);

    return {
        title: `${decodedNickname} - Faceit Stats Pro`,
        description: `View ${decodedNickname}'s Faceit statistics, ELO history, and recent matches.`,
    };
}
