import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div className={`animate-pulse rounded-md bg-muted/50 ${className}`} />
    );
}

export default function PlayerLoading() {
    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Player Header Skeleton */}
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card">
                <Skeleton className="h-32 md:h-48 w-full rounded-none" />
                <div className="relative px-6 pb-6">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-16">
                        <Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-card" />
                        <div className="flex-1 space-y-3 pb-4">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex items-center gap-4 pb-4">
                            <Skeleton className="h-16 w-16 rounded-full" />
                            <Skeleton className="h-10 w-20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="border-border/50 bg-card/50">
                        <CardContent className="p-4">
                            <Skeleton className="h-3 w-16 mb-2" />
                            <Skeleton className="h-7 w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Row Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border-border/50 bg-card/50">
                        <CardHeader>
                            <Skeleton className="h-5 w-28" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Match List Skeleton */}
            <Card className="border-border/50 bg-card/50">
                <CardHeader>
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border/20">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="flex gap-4 px-4 py-3 items-center">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-5 w-12" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-10" />
                                <Skeleton className="h-4 w-10" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
