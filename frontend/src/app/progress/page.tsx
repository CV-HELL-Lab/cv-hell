"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Skull, CheckCircle2, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

interface BossProgress {
  id: string;
  name: string;
  slug: string;
  order_index: number;
  status: string; // "current" | "defeated" | "unlocked" | "locked"
  specialty: string;
  defeated_at: string | null;
  world_first_defeater: string | null;
  prize_pool: number;
}

export default function ProgressPage() {
  const [bosses, setBosses] = useState<BossProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get("/bosses/progress");
        setBosses(res.data.bosses);
      } catch (err) {
        console.error("Failed to fetch world progress", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
      <div className="mb-12 border-b border-[#4f3c32] pb-6">
        <h1 className="text-4xl font-black text-white uppercase tracking-wider mb-2">{t("progress", "title")}</h1>
        <p className="text-gray-400 font-mono">{t("progress", "desc")}</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[#241b17] border border-[#3d2e26] rounded-sm" />
          ))}
        </div>
      ) : (
        <div className="relative border-l-2 border-[#4f3c32] ml-4 space-y-12">
          {bosses.map((boss, idx) => {
            const isDefeated = boss.status === "defeated";
            const isCurrent = boss.status === "current";
            const isLocked = boss.status === "locked";
            const isUnlocked = boss.status === "unlocked";

            let Icon = Skull;
            let iconColor = "text-gray-500";
            let borderColor = "border-[#4f3c32]";
            let bgClass = "bg-[#241b17]";
            
            if (isDefeated) {
              Icon = CheckCircle2;
              iconColor = "text-[var(--color-terminal-green)]";
            } else if (isCurrent) {
              Icon = Skull;
              iconColor = "text-[var(--color-boss-accent)]";
              borderColor = "border-[var(--color-boss-accent)]";
              bgClass = "bg-[#1a0f0f]";
            } else if (isUnlocked) {
              Icon = Skull;
              iconColor = "text-amber-600";
            } else if (isLocked) {
              Icon = Lock;
            }

            return (
              <div key={boss.id} className="relative pl-10">
                {/* Timeline dot */}
                <div className={`absolute -left-[17px] top-4 w-8 h-8 rounded-full bg-[#17110e] border-2 ${borderColor} flex items-center justify-center`}>
                  <Icon size={14} className={iconColor} />
                </div>

                <div className={`border ${borderColor} ${bgClass} p-6 rounded-sm transition-all duration-300 ${isCurrent ? 'shadow-[0_0_15px_rgba(239,68,68,0.15)] -translate-x-1' : ''}`}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-gray-500 font-mono text-sm">#{idx + 1}</span>
                        <h2 className={`text-2xl font-bold uppercase tracking-wide ${isLocked ? 'text-gray-600' : 'text-white'}`}>
                          {boss.name}
                        </h2>
                        {isCurrent && (
                          <span className="bg-[var(--color-boss-accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest animate-pulse">
                            {t("progress", "active")}
                          </span>
                        )}
                      </div>
                      
                      {!isLocked && (
                        <p className="text-gray-400 font-mono text-sm mb-4 border-l border-gray-700 pl-3">
                          {boss.specialty}
                        </p>
                      )}

                      {isDefeated && boss.world_first_defeater && (
                        <div className="mt-4 p-3 bg-green-950/20 border border-green-900/30 rounded-sm">
                          <p className="text-[var(--color-terminal-green)] font-mono text-xs uppercase tracking-widest">
                            {t("progress", "first_blood")} <span className="font-bold text-white">{boss.world_first_defeater}</span>
                          </p>
                          <p className="text-gray-500 font-mono text-xs mt-1">
                            {new Date(boss.defeated_at!).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {isCurrent && (
                      <div className="shrink-0 flex flex-col items-end">
                        <Link
                          href={`/boss/${boss.slug}`}
                          className="bg-white text-black font-bold px-6 py-2 uppercase tracking-widest text-sm hover:bg-gray-200 transition-colors flex items-center space-x-2"
                        >
                          <span>{t("boss", "enter_arena")}</span>
                          <ArrowRight size={16} />
                        </Link>
                        <p className="text-gray-500 font-mono text-xs mt-3 uppercase tracking-wider">
                          {t("progress", "pool")} <span className="text-white font-bold">{boss.prize_pool} {t("nav", "pts")}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
