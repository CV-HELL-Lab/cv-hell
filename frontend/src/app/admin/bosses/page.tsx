"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Skull, AlertCircle, RefreshCw, Power, Settings2 } from "lucide-react";
import Link from "next/link";

interface Boss {
  id: string;
  name: string;
  slug: string;
  status: string;
  order_index: number;
  rudeness_level: number;
  defeat: {
    winner: string;
    defeated_at: string;
  } | null;
}

export default function BossesPage() {
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchBosses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      const res = await api.get("/admin/bosses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBosses(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/admin/login");
      } else {
        setError("Failed to fetch bosses.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBosses();
  }, []);

  const handleActivate = async (slug: string) => {
    if (!confirm(`Are you sure you want to activate ${slug}? This will demote the current boss.`)) return;
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      await api.post(`/admin/bosses/${slug}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchBosses();
    } catch (err) {
      alert("Failed to activate boss");
    }
  };

  const handleReset = async (slug: string) => {
    if (!confirm(`Are you sure you want to reset ${slug}? This will clear its defeat record and prize pool.`)) return;
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      await api.post(`/admin/bosses/${slug}/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchBosses();
    } catch (err) {
      alert("Failed to reset boss");
    }
  };

  if (loading) return <div className="p-8 font-mono text-gray-500">Loading bosses...</div>;
  if (error) return <div className="p-8 font-mono text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8 border-b border-[#333] pb-4">
        <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-widest flex items-center">
          <Skull className="mr-3 text-[var(--color-boss-accent)]" /> Boss Management
        </h1>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#1a1a1a] border-b border-[#333]">
            <tr>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest w-12">#</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Name / Slug</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Status</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Rudeness</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">World First</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {bosses.map((boss) => (
              <tr key={boss.id} className={boss.status === "current" ? "bg-[var(--color-boss-accent)]/5" : ""}>
                <td className="p-4 font-mono text-gray-500">{boss.order_index}</td>
                <td className="p-4">
                  <Link href={`/admin/bosses/${boss.slug}`} className="font-bold text-white hover:text-[var(--color-boss-accent)] hover:underline block">
                    {boss.name}
                  </Link>
                  <span className="text-xs text-gray-500 font-mono">{boss.slug}</span>
                </td>
                <td className="p-4">
                  <span className={`inline-block px-2 py-1 font-mono text-[10px] uppercase tracking-widest border ${
                    boss.status === "current" 
                      ? "bg-amber-950/30 text-amber-500 border-amber-900/50" 
                      : boss.status === "defeated"
                      ? "bg-green-950/30 text-green-500 border-green-900/50"
                      : "bg-[#222] text-gray-400 border-[#333]"
                  }`}>
                    {boss.status}
                  </span>
                </td>
                <td className="p-4 font-mono text-gray-300">Level {boss.rudeness_level}</td>
                <td className="p-4 font-mono text-xs">
                  {boss.defeat ? (
                    <div>
                      <div className="text-white">{boss.defeat.winner}</div>
                      <div className="text-gray-500">{new Date(boss.defeat.defeated_at).toLocaleDateString()}</div>
                    </div>
                  ) : (
                    <span className="text-gray-600">None</span>
                  )}
                </td>
                <td className="p-4 text-right space-x-2">
                  <Link
                    href={`/admin/bosses/${boss.slug}`}
                    className="inline-flex items-center px-3 py-1.5 bg-amber-950/30 hover:bg-amber-900/50 text-amber-500 border border-amber-900/30 font-mono text-xs uppercase transition-colors"
                    title="Configure Rudeness Level"
                  >
                    <Settings2 size={14} className="mr-1" /> Configure
                  </Link>
                  <button
                    onClick={() => handleActivate(boss.slug)}
                    disabled={boss.status === "current"}
                    className="inline-flex items-center px-3 py-1.5 bg-[#222] hover:bg-[#333] text-gray-300 font-mono text-xs uppercase transition-colors disabled:opacity-30"
                    title="Set as Current Boss"
                  >
                    <Power size={14} className="mr-1" /> Activate
                  </button>
                  <button
                    onClick={() => handleReset(boss.slug)}
                    className="inline-flex items-center px-3 py-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-500 border border-red-900/30 font-mono text-xs uppercase transition-colors"
                    title="Clear Defeat Record"
                  >
                    <RefreshCw size={14} className="mr-1" /> Reset
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
