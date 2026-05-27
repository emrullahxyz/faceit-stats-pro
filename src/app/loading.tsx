import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-[#ff5500]/20" />
                    <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-[#ff5500]" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
            </div>
        </div>
    );
}
