"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeft, Save, Settings2, Skull } from "lucide-react";
import Link from "next/link";

interface BossDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  order_index: number;
  rudeness_level: number;
  specialty?: string;
}

export default function BossDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [boss, setBoss] = useState<BossDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rudeness, setRudeness] = useState<number>(2);

  const fetchBoss = async () => {
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      const res = await api.get("/admin/bosses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const found = res.data.find((b: BossDetail) => b.slug === slug);
      if (!found) {
        setError("Boss not found.");
      } else {
        setBoss(found);
        setRudeness(found.rudeness_level);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/admin/login");
      } else {
        setError("Failed to fetch boss details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoss();
  }, [slug]);

  const handleSave = async () => {
    if (!boss) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      await api.patch(`/admin/bosses/${slug}`, { rudeness_level: rudeness }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBoss({ ...boss, rudeness_level: rudeness });
      alert("Configuration saved successfully.");
    } catch (err) {
      alert("Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 font-mono text-gray-500">Loading boss config...</div>;
  if (error) return <div className="p-8 font-mono text-red-500">{error}</div>;
  if (!boss) return null;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/bosses" className="inline-flex items-center text-gray-500 hover:text-[var(--color-boss-accent)] font-mono text-sm uppercase tracking-widest transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Bosses
        </Link>
      </div>

      <div className="flex justify-between items-end mb-8 border-b border-[#333] pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-widest flex items-center mb-2">
            <Settings2 className="mr-3 text-[var(--color-boss-accent)]" size={32} /> {boss.name}
          </h1>
          <p className="text-gray-500 font-mono text-sm">Slug: {boss.slug} | Status: {boss.status}</p>
        </div>
      </div>

      <div className="bg-[#111] border border-[#222] p-8 rounded-sm">
        <h2 className="text-lg font-mono font-bold text-white uppercase tracking-widest mb-6 flex items-center">
          <Skull size={20} className="mr-2 text-gray-500" /> Rudeness Level Control
        </h2>
        
        <p className="text-gray-400 font-mono text-sm mb-8 leading-relaxed max-w-2xl">
          Adjusting the rudeness level alters the system prompt fed to the LLM evaluator for this specific boss. Changes take effect on the next submitted evaluation.
        </p>

        <div className="space-y-4 mb-8">
          <label className={`flex items-start space-x-4 p-4 border rounded-sm cursor-pointer transition-colors ${rudeness === 1 ? "bg-amber-950/10 border-amber-900/50" : "bg-[#0a0a0a] border-[#333] hover:border-gray-500"}`}>
            <input 
              type="radio" 
              name="rudeness" 
              value={1} 
              checked={rudeness === 1}
              onChange={() => setRudeness(1)}
              className="mt-1 accent-[var(--color-boss-accent)]" 
            />
            <div>
              <h3 className="font-bold text-white uppercase tracking-widest text-sm">Level 1: Harsh</h3>
              <p className="text-gray-500 font-mono text-xs mt-1">Sharp, critical, professional-savage tone.</p>
            </div>
          </label>

          <label className={`flex items-start space-x-4 p-4 border rounded-sm cursor-pointer transition-colors ${rudeness === 2 ? "bg-amber-950/10 border-amber-900/50" : "bg-[#0a0a0a] border-[#333] hover:border-gray-500"}`}>
            <input 
              type="radio" 
              name="rudeness" 
              value={2} 
              checked={rudeness === 2}
              onChange={() => setRudeness(2)}
              className="mt-1 accent-[var(--color-boss-accent)]" 
            />
            <div>
              <h3 className="font-bold text-white uppercase tracking-widest text-sm">Level 2: Brutal (Default)</h3>
              <p className="text-gray-500 font-mono text-xs mt-1">Cruder language, stronger insults directed toward the document structure.</p>
            </div>
          </label>

          <label className={`flex items-start space-x-4 p-4 border rounded-sm cursor-pointer transition-colors ${rudeness === 3 ? "bg-amber-950/10 border-amber-900/50" : "bg-[#0a0a0a] border-[#333] hover:border-gray-500"}`}>
            <input 
              type="radio" 
              name="rudeness" 
              value={3} 
              checked={rudeness === 3}
              onChange={() => setRudeness(3)}
              className="mt-1 accent-[var(--color-boss-accent)]" 
            />
            <div>
              <h3 className="font-bold text-white uppercase tracking-widest text-sm">Level 3: No Mercy</h3>
              <p className="text-gray-500 font-mono text-xs mt-1">Vulgar, profane, and lowbrow. Unfiltered hostility toward formatting and layout.</p>
            </div>
          </label>
        </div>

        <div className="pt-6 border-t border-[#333] flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || rudeness === boss.rudeness_level}
            className="flex items-center space-x-2 bg-white text-black px-6 py-3 font-bold uppercase tracking-widest text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? "Saving..." : "Save Configuration"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
