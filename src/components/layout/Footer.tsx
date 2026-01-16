import { Github } from "lucide-react";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-border/40 bg-background/95">
            <div className="container mx-auto flex flex-col items-center justify-between gap-4 py-6 px-4 md:flex-row">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>© 2026 Faceit Stats Pro</span>
                    <span className="hidden md:inline">•</span>
                    <span className="hidden md:inline">Not affiliated with Faceit</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Github className="h-5 w-5" />
                    </Link>
                </div>
            </div>
        </footer>
    );
}
