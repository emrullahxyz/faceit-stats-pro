"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Search } from "lucide-react";
import Link from "next/link";

export default function PlayerError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[PlayerPage Error]", error);
    }, [error]);

    return (
        <div className="container mx-auto px-4 py-16">
            <Card className="max-w-lg mx-auto border-destructive/30 bg-card/50">
                <CardContent className="flex flex-col items-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        Failed to Load Player
                    </h2>
                    <p className="text-muted-foreground mb-6 text-sm">
                        {error.message || "An unexpected error occurred while loading this player's stats."}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                            onClick={reset}
                            className="gap-2 bg-[#ff5500] hover:bg-[#ff5500]/90"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                        <Link href="/">
                            <Button variant="outline" className="gap-2 w-full sm:w-auto">
                                <Search className="h-4 w-4" />
                                Search Players
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
