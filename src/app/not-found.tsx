import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex min-h-[70vh] items-center justify-center px-4">
            <div className="w-full max-w-md text-center">
                {/* 404 Visual */}
                <div className="mb-8">
                    <p className="text-8xl font-black text-[#ff5500]/20 select-none">404</p>
                    <div className="-mt-6 text-4xl font-bold text-foreground">
                        Page Not Found
                    </div>
                </div>

                <p className="mb-8 text-muted-foreground">
                    The page you&apos;re looking for doesn&apos;t exist. Try searching for a player instead.
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link href="/">
                        <Button className="w-full gap-2 bg-[#ff5500] hover:bg-[#ff5500]/90 sm:w-auto">
                            <Home className="h-4 w-4" />
                            Go Home
                        </Button>
                    </Link>
                    <Link href="/">
                        <Button variant="outline" className="w-full gap-2 sm:w-auto">
                            <Search className="h-4 w-4" />
                            Search Players
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export const metadata = {
    title: "404 — Page Not Found | Faceit Stats Pro",
};
