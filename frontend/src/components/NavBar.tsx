"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LogOut, Zap, Trophy, Activity, Target, Skull, Globe } from "lucide-react";
import api from "@/lib/api";

export default function NavBar() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [globalPrizePool, setGlobalPrizePool] = useState<number | null>(null);

  useEffect(() => {
    const fetchPrizePool = async () => {
      try {
        const res = await api.get("/boss/current");
        setGlobalPrizePool(res.data.prize_pool);
      } catch (err) {
        console.error("Failed to fetch current boss prize pool", err);
      }
    };

    fetchPrizePool();
    const intervalId = setInterval(fetchPrizePool, 3000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <nav className="border-b border-[#4f3c32] bg-[#17110e] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 relative">
          <div className="flex-1 flex items-center">
            <Link href="/" className="flex items-center space-x-2 text-[var(--color-boss-accent)] hover:opacity-80 transition">
              <Target size={24} strokeWidth={2.5} />
              <span className="font-bold text-xl tracking-wider">CV HELL</span>
            </Link>
          </div>

            <div className="hidden md:flex items-center space-x-6 absolute left-1/2 -translate-x-1/2">
              <Link href="/progress" className="text-gray-400 hover:text-white flex items-center space-x-1 transition text-sm font-medium">
                <Activity size={16} />
                <span>{t("nav", "progress")}</span>
              </Link>
              
              {/* Global Prize Pool Display Centered */}
              <div className="flex items-center space-x-2 bg-amber-950/40 border border-amber-900/50 px-4 py-1.5 rounded-sm shadow-[0_0_15px_rgba(251,191,36,0.15)] mx-4">
                <Skull size={16} className="text-amber-500" />
                <span className="text-gray-400 text-xs tracking-widest font-bold">{t("nav", "prize_pool")}</span>
                <span className="text-amber-400 font-black font-mono text-lg">{globalPrizePool !== null ? globalPrizePool : "---"} <span className="text-sm">{t("nav", "pts")}</span></span>
              </div>

              <Link href="/leaderboard" className="text-gray-400 hover:text-white flex items-center space-x-1 transition text-sm font-medium">
                <Trophy size={16} />
                <span>{t("nav", "winners")}</span>
              </Link>
            </div>

            <div className="flex-1 flex items-center justify-end space-x-4">
              <button 
                onClick={() => setLang(lang === "en" ? "zh" : "en")}
                className="flex items-center space-x-1 text-gray-500 hover:text-white border border-[#3d2e26] hover:bg-[#3d2e26] px-2 py-1.5 rounded-sm transition mr-2"
                title="Toggle Language"
              >
                <Globe size={16} />
                <span className="text-xs font-bold">{lang === "en" ? "ZH" : "EN"}</span>
              </button>

              {user ? (
                <>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-gray-200">
                      {user.display_name}
                    </span>
                    <div className="flex items-center space-x-1 text-[var(--color-terminal-green)]">
                      <Zap size={14} className="fill-current" />
                      <span className="text-xs font-bold tracking-widest">{user.points} {t("nav", "pts")}</span>
                    </div>
                  </div>
                <button
                  onClick={() => {
                    logout();
                    window.location.href = "/login";
                  }}
                  className="p-2 text-gray-500 hover:text-white hover:bg-[#3d2e26] rounded-md transition"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <div className="flex space-x-4 text-sm font-medium">
                <Link href="/login" className="text-gray-300 hover:text-white transition">
                  {t("nav", "login")}
                </Link>
                <Link href="/register" className="text-[var(--color-boss-accent)] hover:text-amber-400 transition">
                  {t("nav", "register")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile nav links */}
      <div className="md:hidden border-t border-[#3d2e26] bg-[#241b17] px-4 py-3 flex justify-between items-center text-xs font-mono relative">
        <Link href="/progress" className="text-gray-400 hover:text-white flex items-center space-x-1 z-10">
          <Activity size={14} />
          <span>{t("nav", "progress")}</span>
        </Link>
        
        {/* Mobile Prize Pool Display Centered */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-amber-950/60 border border-amber-900/50 px-3 py-1 rounded-sm shadow-[0_0_10px_rgba(251,191,36,0.15)]">
          <Skull size={12} className="text-amber-500" />
          <span className="text-amber-400 font-bold">{globalPrizePool !== null ? globalPrizePool : "---"} {t("nav", "pts")}</span>
        </div>

        <Link href="/leaderboard" className="text-gray-400 hover:text-white flex items-center space-x-1 z-10">
          <Trophy size={14} />
          <span>{t("nav", "winners")}</span>
        </Link>
      </div>
    </nav>
  );
}
