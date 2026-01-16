"use client";

import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    return (
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full border-border/50 bg-card/50">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Welcome to Faceit Stats Pro</CardTitle>
                    <CardDescription>
                        Sign in with your Faceit account to access personalized features
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={() => signIn("faceit", { callbackUrl: "/" })}
                        className="w-full bg-[#ff5500] hover:bg-[#ff5500]/90 text-white font-semibold"
                        size="lg"
                    >
                        <svg
                            className="mr-2 h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm-2 5v10l8-5-8-5z" />
                        </svg>
                        Sign in with Faceit
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                        By signing in, you can view your own stats instantly and compare with friends.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
