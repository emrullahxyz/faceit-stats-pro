"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);

    const handleFaceitLogin = async () => {
        setLoading(true);
        try {
            await signIn("faceit", { callbackUrl: "/" });
        } catch {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[70vh] items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        <span className="text-[#ff5500]">Faceit</span> Stats Pro
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Sign in to save favorites and access personalized stats
                    </p>
                </div>

                <Card className="border-border/50 bg-card/50">
                    <CardHeader className="text-center">
                        <CardTitle>Sign In</CardTitle>
                        <CardDescription>
                            Connect your Faceit account to unlock all features
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Faceit Login Button */}
                        <Button
                            className="w-full h-12 gap-3 bg-[#ff5500] hover:bg-[#ff5500]/90 text-white font-semibold"
                            onClick={handleFaceitLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    {/* Faceit logo SVG */}
                                    <svg
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                    </svg>
                                    Sign in with Faceit
                                </>
                            )}
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border/40" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">or</span>
                            </div>
                        </div>

                        {/* Browse without login */}
                        <Link href="/">
                            <Button variant="outline" className="w-full">
                                Browse without signing in
                            </Button>
                        </Link>

                        <p className="text-center text-xs text-muted-foreground">
                            Sign-in is optional. You can search any player without an account.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
