"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Zap, Trophy, Activity, Target, Skull } from "lucide-react";
import api from "@/lib/api";

export default function NavBar() {
  const { user, logout } = useAuth();
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
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 text-[var(--color-boss-accent)] hover:opacity-80 transition">
              <Target size={24} strokeWidth={2.5} />
              <span className="font-bold text-xl tracking-wider">CV HELL</span>
            </Link>

            <div className="hidden md:flex space-x-6 text-sm font-medium items-center">
              <Link href="/progress" className="text-gray-400 hover:text-white flex items-center space-x-1 transition">
                <Activity size={16} />
                <span>WORLD PROGRESS</span>
              </Link>
              <Link href="/leaderboard" className="text-gray-400 hover:text-white flex items-center space-x-1 transition">
                <Trophy size={16} />
                <span>HALL OF WINNERS</span>
              </Link>
              
              {/* Global Prize Pool Display */}
              {globalPrizePool !== null && (
                <div className="flex items-center space-x-2 bg-amber-950/40 border border-amber-900/50 px-3 py-1 rounded-sm shadow-[0_0_10px_rgba(251,191,36,0.1)] ml-4">
                  <Skull size={14} className="text-amber-500" />
                  <span className="text-gray-400 text-xs tracking-wider">PRIZE POOL:</span>
                  <span className="text-amber-400 font-bold font-mono">{globalPrizePool} PTS</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-gray-200">
                    {user.display_name}
                  </span>
                  <div className="flex items-center space-x-1 text-[var(--color-terminal-green)]">
                    <Zap size={14} className="fill-current" />
                    <span className="text-xs font-bold tracking-widest">{user.points} PTS</span>
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
                  LOGIN
                </Link>
                <Link href="/register" className="text-[var(--color-boss-accent)] hover:text-amber-400 transition">
                  REGISTER
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile nav links */}
      <div className="md:hidden border-t border-[#3d2e26] bg-[#241b17] px-4 py-2 flex justify-between items-center text-xs font-mono">
        <div className="flex space-x-4">
          <Link href="/progress" className="text-gray-400 hover:text-white flex items-center space-x-1">
            <Activity size={14} />
            <span>PROGRESS</span>
          </Link>
          <Link href="/leaderboard" className="text-gray-400 hover:text-white flex items-center space-x-1">
            <Trophy size={14} />
            <span>WINNERS</span>
          </Link>
        </div>
        {/* Mobile Prize Pool Display */}
        {globalPrizePool !== null && (
          <div className="flex items-center space-x-1 text-amber-400">
            <Skull size={12} />
            <span className="font-bold">{globalPrizePool} PTS</span>
          </div>
        )}
      </div>
    </nav>
  );
}
