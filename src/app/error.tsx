"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to monitoring service in production
        console.error("[GlobalError]", error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md text-center">
                {/* Icon */}
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>

                {/* Title */}
                <h1 className="mb-2 text-2xl font-bold text-foreground">
                    Something went wrong
                </h1>

                {/* Description */}
                <p className="mb-2 text-muted-foreground">
                    An unexpected error occurred. We&apos;re sorry for the inconvenience.
                </p>

                {/* Error digest for support */}
                {error.digest && (
                    <p className="mb-6 text-xs text-muted-foreground/60">
                        Error ID: <code className="font-mono">{error.digest}</code>
                    </p>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button
                        onClick={reset}
                        className="gap-2 bg-[#ff5500] hover:bg-[#ff5500]/90"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                    <Link href="/">
                        <Button variant="outline" className="w-full gap-2 sm:w-auto">
                            <Home className="h-4 w-4" />
                            Go Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
