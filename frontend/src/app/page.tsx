"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowRight, Trophy, Skull, ShieldCheck } from "lucide-react";

interface BossData {
  id: string;
  name: string;
  slug: string;
  order_index: number;
  status: string;
  specialty: string;
  defeated_at: string | null;
  world_first_defeater: string | null;
  prize_pool: number;
}

export default function HomePage() {
  const { t } = useLanguage();
  const [boss, setBoss] = useState<BossData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentBoss = async () => {
      try {
        const res = await api.get("/boss/current");
        setBoss(res.data);
      } catch (err) {
        console.error("Failed to fetch current boss", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCurrentBoss();
    const intervalId = setInterval(fetchCurrentBoss, 3000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="animate-pulse text-[var(--color-boss-accent)] font-mono font-bold tracking-widest">
          {t("home", "summoning")}
        </div>
      </div>
    );
  }

  if (!boss) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center px-4">
        <Skull size={64} className="text-gray-600 mb-6" />
        <h1 className="text-4xl font-bold text-white mb-4">{t("home", "empty_title")}</h1>
        <p className="text-gray-400 font-mono">{t("home", "empty_desc")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-boss-accent)]/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="max-w-3xl w-full text-center space-y-10 z-10">
        <div className="space-y-4">
          <p className="text-[var(--color-boss-accent)] font-mono font-bold tracking-[0.2em] text-sm uppercase">
            {t("home", "active_target")}
          </p>
          <h1 className="text-6xl sm:text-8xl font-black text-white uppercase tracking-tighter drop-shadow-lg">
            {boss.name}
          </h1>
          <p className="text-xl text-gray-300 font-mono max-w-2xl mx-auto border-l-2 border-[var(--color-boss-accent)] pl-4 text-left">
            {boss.specialty}
          </p>
        </div>

        <div className="inline-flex flex-col items-center bg-[#241b17] border border-[#4f3c32] px-10 py-6 rounded-sm shadow-xl">
          <Trophy size={32} className="text-[#fbbf24] mb-3" />
          <p className="text-gray-400 text-sm font-mono uppercase tracking-widest mb-1">{t("home", "prize_pool")}</p>
          <p className="text-4xl font-bold text-white tracking-wider font-mono">
            {boss.prize_pool} <span className="text-xl text-[var(--color-terminal-green)]">{t("nav", "pts")}</span>
          </p>
        </div>

        <div className="pt-8">
          <Link
            href={`/boss/${boss.slug}`}
            className="inline-flex items-center space-x-3 bg-white text-black font-black uppercase tracking-widest text-xl px-12 py-5 hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            <span>{t("home", "face_boss")}</span>
            <ArrowRight strokeWidth={3} />
          </Link>
          <p className="mt-4 text-sm text-gray-500 font-mono">
            {t("home", "upload_desc")}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <Link
          href="/terms"
          className="flex items-center space-x-1.5 text-gray-600 hover:text-gray-400 text-xs font-mono transition"
        >
          <ShieldCheck size={12} />
          <span>{t("disclaimer", "terms_link")}</span>
        </Link>
      </div>
    </div>
  );
}
