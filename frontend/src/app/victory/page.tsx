"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ArrowRight, CheckCircle } from "lucide-react";
import ReactConfetti from "react-confetti";
import { useLanguage } from "@/context/LanguageContext";

interface VictoryData {
  world_first: boolean;
  points_won: number;
  boss_name: string;
  approved_phrase: string | null;
}

export default function VictoryPage() {
  const [data, setData] = useState<VictoryData | null>(null);
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
  const { t } = useLanguage();

  useEffect(() => {
    const stored = sessionStorage.getItem("victoryData");
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem("victoryData");
      }
    }
    
    // Set window dimensions for confetti
    setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  if (!data) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center">
        <h1 className="text-2xl text-gray-500 font-mono">No victory to claim.</h1>
        <Link href="/" className="mt-4 text-[var(--color-boss-accent)] underline underline-offset-4">Return to Reality</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden text-center">
      {data.world_first && (
        <ReactConfetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          colors={['#f59e0b', '#fbbf24', '#22c55e', '#ffffff']}
          recycle={false}
          numberOfPieces={800}
        />
      )}

      {/* Background glow for world first */}
      {data.world_first && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#fbbf24]/10 rounded-full blur-[100px] -z-10 pointer-events-none animate-pulse" />
      )}

      <div className="max-w-2xl w-full space-y-10 z-10">
        <div className="space-y-4">
          <CheckCircle size={64} className="mx-auto text-[var(--color-terminal-green)] mb-6" />
          <h1 className="text-6xl sm:text-8xl font-black text-white uppercase tracking-tighter drop-shadow-lg">
            {t("victory", "title")}
          </h1>
          <p className="text-xl text-gray-400 font-mono italic">
            "{data.approved_phrase || "I have no remaining objection."}"
          </p>
        </div>

        {data.world_first ? (
          <div className="bg-[#241b17] border border-[#fbbf24] p-8 rounded-sm shadow-[0_0_40px_rgba(251,191,36,0.15)] animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex justify-center mb-4">
              <Trophy size={48} className="text-[#fbbf24]" />
            </div>
            <h2 className="text-3xl font-bold text-[#fbbf24] uppercase tracking-widest mb-2">
              {t("leaderboard", "world_firsts")}
            </h2>
            <p className="text-gray-300 font-mono text-sm mb-6">
              {t("victory", "world_first")}
            </p>
            <div className="inline-block bg-[#17110e] border border-[#4f3c32] px-8 py-4">
              <span className="text-gray-500 font-mono text-xs uppercase tracking-widest block mb-1">{t("victory", "prize_won")}</span>
              <span className="text-4xl font-bold text-white tracking-wider font-mono">
                +{data.points_won} <span className="text-[var(--color-terminal-green)] text-xl">{t("nav", "pts")}</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-[#241b17] border border-[#4f3c32] p-8 rounded-sm">
            <h2 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">
              Reluctant Approval
            </h2>
            <p className="text-gray-400 font-mono text-sm">
              {t("victory", "not_first")}
            </p>
          </div>
        )}

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/progress"
            className="inline-flex items-center space-x-2 bg-white text-black font-bold uppercase tracking-widest px-8 py-4 hover:bg-gray-200 transition-colors w-full sm:w-auto justify-center"
          >
            <span>{t("progress", "title")}</span>
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/leaderboard"
            className="inline-flex items-center space-x-2 bg-[#241b17] border border-[#4f3c32] text-white font-bold uppercase tracking-widest px-8 py-4 hover:bg-[#3d2e26] transition-colors w-full sm:w-auto justify-center"
          >
            <Trophy size={18} />
            <span>{t("leaderboard", "title")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
