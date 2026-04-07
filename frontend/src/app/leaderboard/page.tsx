"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Trophy, Clock, Target, Loader2 } from "lucide-react";

interface LeaderboardEntry {
  user_handle: string;
  boss_name: string;
  metric_value: number;
  metric_label: string;
  achieved_at: string;
}

type BoardType = "first_defeaters" | "fastest_clears" | "fewest_attempts";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [type, setType] = useState<BoardType>("first_defeaters");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBoard = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/leaderboard?type=${type}&limit=20`);
        setEntries(res.data.entries);
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBoard();
  }, [type]);

  const tabs: { id: BoardType; label: string; icon: any }[] = [
    { id: "first_defeaters", label: "World Firsts", icon: Trophy },
    { id: "fastest_clears", label: "Fastest Clears", icon: Clock },
    { id: "fewest_attempts", label: "Fewest Attempts", icon: Target },
  ];

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 flex flex-col h-full">
      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-wider mb-4">Hall of Winners</h1>
        <p className="text-gray-400 font-mono">The few who survived the judgment.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = type === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setType(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 font-bold uppercase tracking-widest text-sm transition-colors ${
                isActive 
                  ? "bg-white text-black" 
                  : "bg-[#241b17] border border-[#4f3c32] text-gray-400 hover:text-white hover:bg-[#3d2e26]"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-[#241b17] border border-[#4f3c32] rounded-sm overflow-hidden flex-1 min-h-[400px] relative">
        {loading ? (
          <div className="absolute inset-0 flex justify-center items-center bg-[#241b17]/50 backdrop-blur-sm z-10">
            <Loader2 className="animate-spin text-gray-500" size={32} />
          </div>
        ) : entries.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-8">
            <Trophy size={48} className="text-gray-600 mb-4" />
            <p className="text-gray-400 font-mono text-lg">No records found for this category yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto h-full custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#30241e] border-b border-[#4f3c32] text-gray-500 font-mono text-xs uppercase tracking-widest">
                  <th className="p-4 font-normal">Rank</th>
                  <th className="p-4 font-normal">Challenger</th>
                  <th className="p-4 font-normal">Boss Defeated</th>
                  <th className="p-4 font-normal">Metric</th>
                  <th className="p-4 font-normal text-right">Date Achieved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d2e26]">
                {entries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-[#161616] transition-colors group">
                    <td className="p-4 font-mono text-gray-500">
                      {idx === 0 ? <span className="text-[#fbbf24]">#1</span> : `#${idx + 1}`}
                    </td>
                    <td className="p-4 font-bold text-white text-lg tracking-wide">
                      {entry.user_handle}
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2 py-1 bg-amber-950/30 text-[var(--color-boss-accent)] font-mono text-xs uppercase border border-amber-900/30">
                        {entry.boss_name}
                      </span>
                    </td>
                    <td className="p-4 font-mono">
                      <span className="text-white font-bold">{entry.metric_value}</span>{" "}
                      <span className="text-gray-500 text-xs">{entry.metric_label}</span>
                    </td>
                    <td className="p-4 text-right font-mono text-xs text-gray-500">
                      {new Date(entry.achieved_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
