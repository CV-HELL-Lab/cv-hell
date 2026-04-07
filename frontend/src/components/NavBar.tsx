"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Zap, Trophy, Activity, Target } from "lucide-react";

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-[#4f3c32] bg-[#17110e] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 text-[var(--color-boss-accent)] hover:opacity-80 transition">
              <Target size={24} strokeWidth={2.5} />
              <span className="font-bold text-xl tracking-wider">CV HELL</span>
            </Link>

            <div className="hidden md:flex space-x-6 text-sm font-medium">
              <Link href="/progress" className="text-gray-400 hover:text-white flex items-center space-x-1 transition">
                <Activity size={16} />
                <span>WORLD PROGRESS</span>
              </Link>
              <Link href="/leaderboard" className="text-gray-400 hover:text-white flex items-center space-x-1 transition">
                <Trophy size={16} />
                <span>HALL OF WINNERS</span>
              </Link>
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
      <div className="md:hidden border-t border-[#3d2e26] bg-[#241b17] px-4 py-2 flex justify-between text-xs font-mono">
        <Link href="/progress" className="text-gray-400 hover:text-white flex items-center space-x-1">
          <Activity size={14} />
          <span>PROGRESS</span>
        </Link>
        <Link href="/leaderboard" className="text-gray-400 hover:text-white flex items-center space-x-1">
          <Trophy size={14} />
          <span>WINNERS</span>
        </Link>
      </div>
    </nav>
  );
}
