"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, BarChart3 } from "lucide-react";
import Link from "next/link";

export function AuthButtons() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <Button variant="ghost" size="sm" disabled>
                Loading...
            </Button>
        );
    }

    if (session?.user) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 px-2">
                        <Avatar className="h-7 w-7">
                            {session.user.image ? (
                                <AvatarImage src={session.user.image} alt={session.user.name || ""} />
                            ) : null}
                            <AvatarFallback className="bg-[#ff5500] text-white text-xs">
                                {session.user.name?.slice(0, 2).toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium hidden sm:inline">
                            {session.user.name}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                        <Link href={`/player/${session.user.name}`} className="cursor-pointer">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            My Stats
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="cursor-pointer text-destructive"
                        onClick={() => signOut()}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2 border-[#ff5500]/50 hover:bg-[#ff5500]/10 hover:border-[#ff5500]"
            onClick={() => signIn("faceit")}
        >
            <User className="h-4 w-4" />
            Login
        </Button>
    );
}
