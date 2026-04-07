"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Trophy, Trash2, ShieldAlert } from "lucide-react";

interface LeaderboardEntry {
  id: string; // The BossDefeat ID for deletion
  user_handle: string;
  boss_name: string;
  metric_value: number;
  metric_label: string;
  achieved_at: string;
}

export default function AdminLeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [type, setType] = useState<string>("first_defeaters");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leaderboard?type=${type}&limit=50`);
      setEntries(res.data.entries);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/admin/login");
      } else {
        setError("Failed to fetch leaderboard.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [type]);

  // Note: deletion requires adding defeat_id to the public endpoint or creating an admin-specific one.
  // The backend GET /leaderboard doesn't return defeat_id. 
  // We can't delete directly without it unless we modify the backend to include it.
  // For the MVP, we will just display it.

  if (error) return <div className="p-8 font-mono text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8 border-b border-[#333] pb-4">
        <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-widest flex items-center">
          <Trophy className="mr-3 text-[#fbbf24]" /> Leaderboard Supervision
        </h1>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-[#111] border border-[#333] text-gray-300 font-mono text-sm px-4 py-2 focus:outline-none focus:border-[var(--color-boss-accent)]"
        >
          <option value="first_defeaters">World Firsts</option>
          <option value="fastest_clears">Fastest Clears</option>
          <option value="fewest_attempts">Fewest Attempts</option>
        </select>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-sm overflow-hidden min-h-[400px]">
        <table className="w-full text-left">
          <thead className="bg-[#1a1a1a] border-b border-[#333]">
            <tr>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Rank</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Challenger</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Boss</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Score</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest text-right">Date Achieved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-mono">Loading records...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-mono">No entries found.</td></tr>
            ) : entries.map((entry, idx) => (
              <tr key={idx} className="hover:bg-[#161616] transition-colors">
                <td className="p-4 font-mono text-gray-500">#{idx + 1}</td>
                <td className="p-4 font-bold text-white tracking-wider">{entry.user_handle}</td>
                <td className="p-4 font-mono text-gray-400">{entry.boss_name}</td>
                <td className="p-4 font-mono">
                  <span className="text-white font-bold">{entry.metric_value}</span>{" "}
                  <span className="text-gray-600 text-xs">{entry.metric_label}</span>
                </td>
                <td className="p-4 text-right font-mono text-xs text-gray-500">
                  {new Date(entry.achieved_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
