"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Share2, Download, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapAnalysisData {
    map: string;
    myTeamScore: number;
    enemyTeamScore: number;
    recommendation: "PICK" | "SAFE" | "RISKY" | "BAN";
    reliabilityScore: number;
}

interface ShareCardProps {
    matchId: string;
    myTeamName: string;
    enemyTeamName: string;
    mapAnalysis: MapAnalysisData[];
    onClose: () => void;
}

export default function ShareCard({ matchId, myTeamName, enemyTeamName, mapAnalysis, onClose }: ShareCardProps) {
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const generateImage = async (): Promise<string> => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas not found");

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Context not found");

        const width = 600;
        const height = 400;
        canvas.width = width;
        canvas.height = height;

        // Background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#1a1a2e");
        gradient.addColorStop(1, "#16213e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Border
        ctx.strokeStyle = "#ff5500";
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        // Title
        ctx.fillStyle = "#ff5500";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Match Analysis", width / 2, 50);

        // Team names
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "left";
        ctx.fillText(myTeamName, 30, 90);

        ctx.fillStyle = "#f43f5e";
        ctx.textAlign = "right";
        ctx.fillText(enemyTeamName, width - 30, 90);

        ctx.fillStyle = "#888";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText("vs", width / 2, 90);

        // Map analysis
        const startY = 120;
        const rowHeight = 40;

        mapAnalysis.slice(0, 6).forEach((ma, i) => {
            const y = startY + i * rowHeight;

            // Map name
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "left";
            ctx.fillText(ma.map, 30, y + 25);

            // Recommendation badge
            const badgeColors: Record<string, string> = {
                PICK: "#10b981",
                SAFE: "#0ea5e9",
                RISKY: "#f59e0b",
                BAN: "#ef4444"
            };
            ctx.fillStyle = badgeColors[ma.recommendation] || "#888";
            ctx.fillRect(120, y + 10, 50, 20);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 10px Arial";
            ctx.textAlign = "center";
            ctx.fillText(ma.recommendation, 145, y + 24);

            // Score bar
            const barWidth = 300;
            const barX = 190;
            ctx.fillStyle = "#333";
            ctx.fillRect(barX, y + 15, barWidth, 10);

            const scoreDiff = ma.myTeamScore - ma.enemyTeamScore;
            if (scoreDiff > 0) {
                ctx.fillStyle = "#4ade80";
                ctx.fillRect(barX + barWidth / 2, y + 15, Math.min(barWidth / 2, scoreDiff * 3), 10);
            } else {
                ctx.fillStyle = "#f43f5e";
                ctx.fillRect(barX + barWidth / 2 + Math.max(-barWidth / 2, scoreDiff * 3), y + 15, Math.min(barWidth / 2, Math.abs(scoreDiff * 3)), 10);
            }

            // Scores
            ctx.font = "12px Arial";
            ctx.fillStyle = "#4ade80";
            ctx.textAlign = "right";
            ctx.fillText(ma.myTeamScore.toFixed(0), barX - 10, y + 25);

            ctx.fillStyle = "#f43f5e";
            ctx.textAlign = "left";
            ctx.fillText(ma.enemyTeamScore.toFixed(0), barX + barWidth + 10, y + 25);
        });

        // Footer
        ctx.fillStyle = "#666";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Faceit Stats Pro • faceit-stats.pro", width / 2, height - 25);

        return canvas.toDataURL("image/png");
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const imageUrl = await generateImage();
            const link = document.createElement("a");
            link.download = `match-analysis-${matchId}.png`;
            link.href = imageUrl;
            link.click();
        } catch (error) {
            console.error("Failed to generate image:", error);
        }
        setDownloading(false);
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/match-analyzer?matchId=${matchId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-[#ff5500]" />
                        Share Analysis
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Hidden canvas for image generation */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Preview */}
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-lg p-4 mb-4 border border-[#ff5500]/30">
                    <div className="text-center mb-3">
                        <span className="text-[#ff5500] font-bold">Match Analysis</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-emerald-400">{myTeamName}</span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="text-rose-400">{enemyTeamName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                        {mapAnalysis.length} maps analyzed
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex-1 bg-[#ff5500] hover:bg-[#cc4400]"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        {downloading ? "Generating..." : "Download Image"}
                    </Button>
                    <Button
                        onClick={handleCopyLink}
                        variant="outline"
                        className="flex-1"
                    >
                        {copied ? (
                            <><Check className="h-4 w-4 mr-2 text-emerald-400" />Copied!</>
                        ) : (
                            <><Copy className="h-4 w-4 mr-2" />Copy Link</>
                        )}
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
}
