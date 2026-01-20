"use client";

import { motion } from "framer-motion";
import { Brain, TrendingUp, Star, AlertTriangle, Shield, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PredictionData {
    myTeamWinProbability: number;
    enemyTeamWinProbability: number;
    confidence: "high" | "medium" | "low";
    keyFactor: string;
    mvpCandidate: {
        name: string;
        reason: string;
    } | null;
    myTeamName: string;
    enemyTeamName: string;
    selectedMap: string;
}

interface AIPredictionProps {
    prediction: PredictionData;
}

export default function AIPrediction({ prediction }: AIPredictionProps) {
    const {
        myTeamWinProbability,
        enemyTeamWinProbability,
        confidence,
        keyFactor,
        mvpCandidate,
        myTeamName,
        enemyTeamName,
        selectedMap
    } = prediction;

    const getConfidenceColor = () => {
        switch (confidence) {
            case "high": return "border-green-500 text-green-500";
            case "medium": return "border-yellow-500 text-yellow-500";
            case "low": return "border-red-500 text-red-500";
        }
    };

    const getConfidenceLabel = () => {
        switch (confidence) {
            case "high": return "Yüksek Güven";
            case "medium": return "Orta Güven";
            case "low": return "Düşük Güven";
        }
    };

    const myTeamWins = myTeamWinProbability > enemyTeamWinProbability;
    const probDiff = Math.abs(myTeamWinProbability - enemyTeamWinProbability);

    // Determine match assessment
    const getMatchAssessment = () => {
        if (probDiff < 5) return { label: "Dengeli Maç", color: "text-yellow-400", icon: Shield };
        if (myTeamWins && probDiff >= 15) return { label: "Favori Sizsiniz", color: "text-green-400", icon: TrendingUp };
        if (myTeamWins) return { label: "Hafif Avantaj", color: "text-green-300", icon: TrendingUp };
        if (probDiff >= 15) return { label: "Zor Maç", color: "text-red-400", icon: AlertTriangle };
        return { label: "Hafif Dezavantaj", color: "text-orange-400", icon: AlertTriangle };
    };

    const assessment = getMatchAssessment();
    const AssessmentIcon = assessment.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 via-card/80 to-blue-900/20 p-6"
        >
            {/* Glow effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                        <Brain className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-foreground">AI Match Prediction</h3>
                        <p className="text-xs text-muted-foreground">
                            {selectedMap} haritası için tahmin
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className={getConfidenceColor()}>
                    {getConfidenceLabel()}
                </Badge>
            </div>

            {/* Main Prediction Display */}
            <div className="relative mb-6">
                {/* Team Names and Probabilities */}
                <div className="flex items-center justify-between mb-4">
                    <div className="text-center flex-1">
                        <p className="text-sm text-muted-foreground mb-1">{myTeamName || "Senin Takımın"}</p>
                        <motion.p
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className={`text-4xl font-bold ${myTeamWins ? "text-green-400" : "text-foreground"}`}
                        >
                            {myTeamWinProbability.toFixed(0)}%
                        </motion.p>
                    </div>

                    <div className="px-4">
                        <div className="w-12 h-12 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                            <span className="text-sm font-bold text-muted-foreground">VS</span>
                        </div>
                    </div>

                    <div className="text-center flex-1">
                        <p className="text-sm text-muted-foreground mb-1">{enemyTeamName || "Rakip Takım"}</p>
                        <motion.p
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                            className={`text-4xl font-bold ${!myTeamWins ? "text-red-400" : "text-foreground"}`}
                        >
                            {enemyTeamWinProbability.toFixed(0)}%
                        </motion.p>
                    </div>
                </div>

                {/* Probability Bar */}
                <div className="relative h-4 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                        initial={{ width: "50%" }}
                        animate={{ width: `${myTeamWinProbability}%` }}
                        transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                        className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-green-500 to-green-400"
                    />
                    <motion.div
                        initial={{ width: "50%" }}
                        animate={{ width: `${enemyTeamWinProbability}%` }}
                        transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                        className="absolute right-0 top-0 h-full rounded-full bg-gradient-to-l from-red-500 to-red-400"
                    />
                </div>
            </div>

            {/* Assessment Badge */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex justify-center mb-6"
            >
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 ${assessment.color}`}>
                    <AssessmentIcon className="h-4 w-4" />
                    <span className="font-semibold text-sm">{assessment.label}</span>
                </div>
            </motion.div>

            {/* Key Insights */}
            <div className="space-y-3 relative">
                {/* Key Factor */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30"
                >
                    <Target className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Kritik Faktör</p>
                        <p className="text-sm text-foreground">{keyFactor}</p>
                    </div>
                </motion.div>

                {/* MVP Candidate */}
                {mvpCandidate && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20"
                    >
                        <Star className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground font-medium mb-0.5">MVP Adayı</p>
                            <p className="text-sm text-foreground">
                                <span className="font-semibold text-yellow-400">{mvpCandidate.name}</span>
                                {" - "}{mvpCandidate.reason}
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground/60 text-center mt-4">
                * Tahminler geçmiş performans verilerine dayanır, garantili sonuç değildir.
            </p>
        </motion.div>
    );
}
