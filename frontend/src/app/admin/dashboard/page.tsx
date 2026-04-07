"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Activity, Users, FileText, CheckCircle, ShieldAlert, RotateCcw, Bomb } from "lucide-react";

interface Stats {
  current_boss: { name: string; status: string } | null;
  total_users: number;
  total_submissions: number;
  total_approvals: number;
  world_first_defeats: { boss_name: string; winner: string; defeated_at: string }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const router = useRouter();

  const fetchStats = async () => {
    const token = localStorage.getItem("cvhell_admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    try {
      const res = await api.get("/admin/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("cvhell_admin_token");
        router.push("/admin/login");
      } else {
        setError("Failed to load platform stats.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleFactoryReset = async () => {
    const confirmed = prompt(
      'WARNING: This will DELETE all users, submissions, and records.\nType "RESET" to confirm:'
    );
    if (confirmed !== "RESET") return;

    setResetting(true);
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      await api.post("/admin/factory-reset", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Factory reset complete. All data wiped, bosses restored to initial state.");
      fetchStats();
    } catch (err) {
      alert("Factory reset failed.");
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="p-8 font-mono text-gray-500">Loading telemetry...</div>;
  if (error) return <div className="p-8 font-mono text-amber-500">{error}</div>;
  if (!stats) return null;

  return (
    <div className="flex-1 p-8 bg-[#050505]">
      <div className="flex justify-between items-center mb-8 border-b border-[#4f3c32] pb-4">
        <div>
          <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-widest flex items-center">
            <ShieldAlert className="mr-3 text-amber-500" /> Platform Telemetry
          </h1>
        </div>
        <div className="flex space-x-4">
          <button onClick={fetchStats} className="p-2 border border-[#4f3c32] text-gray-400 hover:text-white rounded-sm">
            <RotateCcw size={16} />
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem("cvhell_admin_token");
              router.push("/admin/login");
            }}
            className="px-4 py-2 border border-amber-900 text-amber-500 font-mono text-xs uppercase hover:bg-amber-950/30"
          >
            Terminate Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-[#241b17] border border-[#3d2e26] p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="text-blue-500" size={20} />
            <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest">Active Boss</h3>
          </div>
          <p className="text-xl font-bold text-white">{stats.current_boss ? stats.current_boss.name : "None"}</p>
        </div>

        <div className="bg-[#241b17] border border-[#3d2e26] p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="text-purple-500" size={20} />
            <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest">Total Souls</h3>
          </div>
          <p className="text-3xl font-mono font-bold text-white">{stats.total_users}</p>
        </div>

        <div className="bg-[#241b17] border border-[#3d2e26] p-6">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="text-yellow-500" size={20} />
            <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest">Submissions</h3>
          </div>
          <p className="text-3xl font-mono font-bold text-white">{stats.total_submissions}</p>
        </div>

        <div className="bg-[#241b17] border border-[#3d2e26] p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="text-green-500" size={20} />
            <h3 className="font-mono text-xs text-gray-500 uppercase tracking-widest">Approvals</h3>
          </div>
          <p className="text-3xl font-mono font-bold text-white">{stats.total_approvals}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-mono font-bold text-gray-300 uppercase tracking-widest mb-6">World First Kills</h2>
        {stats.world_first_defeats.length === 0 ? (
          <p className="text-gray-600 font-mono text-sm border border-[#3d2e26] p-6 bg-[#241b17]">No bosses defeated yet.</p>
        ) : (
          <div className="border border-[#3d2e26] bg-[#241b17] rounded-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#30241e] border-b border-[#4f3c32]">
                <tr>
                  <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Boss</th>
                  <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Victur</th>
                  <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d2e26]">
                {stats.world_first_defeats.map((defeat, idx) => (
                  <tr key={idx}>
                    <td className="p-4 font-bold text-white">{defeat.boss_name}</td>
                    <td className="p-4 font-mono text-gray-300">{defeat.winner}</td>
                    <td className="p-4 font-mono text-xs text-gray-500 text-right">
                      {new Date(defeat.defeated_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Factory Reset */}
      <div className="mt-12 border-t border-red-900/30 pt-8">
        <div className="bg-red-950/20 border border-red-900/40 p-6 rounded-sm flex justify-between items-center">
          <div>
            <h3 className="text-red-500 font-bold uppercase tracking-widest flex items-center">
              <Bomb size={18} className="mr-2" /> Danger Zone
            </h3>
            <p className="text-gray-500 font-mono text-xs mt-2 max-w-xl">
              Factory reset will permanently delete all users, submissions, boss defeat records, point transactions, and prize pools. Bosses will be restored to their initial order with the first boss set as current. LLM configs will be preserved.
            </p>
          </div>
          <button
            onClick={handleFactoryReset}
            disabled={resetting}
            className="shrink-0 px-6 py-3 bg-red-900 hover:bg-red-800 text-white font-bold uppercase tracking-widest text-sm transition-colors disabled:opacity-50 border border-red-700"
          >
            {resetting ? "Resetting..." : "Factory Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}
