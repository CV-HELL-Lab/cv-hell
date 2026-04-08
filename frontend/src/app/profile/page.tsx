"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Zap, Skull, CheckCircle2, Globe, User, Trophy, Swords, Clock, Lock, LockOpen, ShieldCheck } from "lucide-react";
import { deriveKey, saveKeyToSession, clearKeyFromSession, isVaultUnlocked } from "@/lib/vault";

interface HistoryEntry {
  submission_id: string;
  boss_name: string;
  boss_slug: string;
  version_number: number;
  created_at: string;
  mood: string | null;
  mood_level: number | null;
  approved: boolean;
  roast_opening: string | null;
}

interface Stats {
  total_submissions: number;
  bosses_defeated: number;
  points: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultError, setVaultError] = useState("");
  const [vaultLoading, setVaultLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    setVaultUnlocked(isVaultUnlocked());
    const fetch = async () => {
      try {
        const res = await api.get("/me/history");
        setStats(res.data.stats);
        setHistory(res.data.history);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, router]);

  const handleVaultUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !vaultPassword) return;
    setVaultLoading(true);
    setVaultError("");
    try {
      const key = await deriveKey(vaultPassword, user.user_id);
      await saveKeyToSession(key);
      setVaultUnlocked(true);
      setVaultPassword("");
    } catch (err) {
      console.error("Vault unlock error:", err);
      setVaultError(t("vault", "error"));
    } finally {
      setVaultLoading(false);
    }
  };

  const handleVaultLock = () => {
    clearKeyFromSession();
    setVaultUnlocked(false);
  };

  if (!user) return null;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
      {/* Header */}
      <div className="mb-10 border-b border-[#4f3c32] pb-6 flex items-center space-x-4">
        <div className="w-14 h-14 rounded-full bg-amber-900/40 border-2 border-amber-700/50 flex items-center justify-center">
          <User size={28} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider">{user.display_name}</h1>
          <p className="text-gray-500 font-mono text-sm mt-0.5">{user.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        <div className="bg-[#241b17] border border-[#3d2e26] p-5 rounded-sm text-center">
          <Zap size={20} className="text-amber-400 mx-auto mb-2" />
          <div className="text-2xl font-black text-white font-mono">{stats?.points ?? user.points}</div>
          <div className="text-gray-500 text-xs uppercase tracking-widest mt-1">{t("nav", "pts")}</div>
        </div>
        <div className="bg-[#241b17] border border-[#3d2e26] p-5 rounded-sm text-center">
          <Swords size={20} className="text-gray-400 mx-auto mb-2" />
          <div className="text-2xl font-black text-white font-mono">{stats?.total_submissions ?? "—"}</div>
          <div className="text-gray-500 text-xs uppercase tracking-widest mt-1">{t("profile", "submissions")}</div>
        </div>
        <div className="bg-[#241b17] border border-[#3d2e26] p-5 rounded-sm text-center">
          <Trophy size={20} className="text-[var(--color-terminal-green)] mx-auto mb-2" />
          <div className="text-2xl font-black text-white font-mono">{stats?.bosses_defeated ?? "—"}</div>
          <div className="text-gray-500 text-xs uppercase tracking-widest mt-1">{t("profile", "defeated")}</div>
        </div>
      </div>

      {/* Submission History */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-6 flex items-center space-x-2">
          <Clock size={20} className="text-gray-400" />
          <span>{t("profile", "history")}</span>
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-[#241b17] border border-[#3d2e26] rounded-sm animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="bg-[#241b17] border border-[#3d2e26] p-8 rounded-sm text-center">
            <Skull size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-mono text-sm">{t("profile", "no_history")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <Link
                key={entry.submission_id}
                href={`/battle/${entry.submission_id}`}
                className="block bg-[#241b17] border border-[#3d2e26] p-4 rounded-sm hover:border-amber-900/60 transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {entry.approved ? (
                        <CheckCircle2 size={14} className="text-[var(--color-terminal-green)] shrink-0" />
                      ) : (
                        <Skull size={14} className="text-gray-600 shrink-0" />
                      )}
                      <span className="text-white font-bold text-sm uppercase tracking-wide">{entry.boss_name}</span>
                      <span className="text-gray-600 text-xs font-mono">#{entry.version_number}</span>
                      {entry.approved && (
                        <span className="bg-green-900/40 border border-green-700/40 text-green-400 text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-widest">
                          {t("profile", "approved")}
                        </span>
                      )}
                    </div>
                    {entry.roast_opening && (
                      <p className="text-gray-500 text-xs font-mono truncate">{entry.roast_opening}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {entry.mood_level !== null && (
                      <div className={`text-xs font-bold font-mono mb-1 ${
                        entry.mood_level >= 5 ? "text-green-400" :
                        entry.mood_level >= 3 ? "text-amber-400" : "text-red-400"
                      }`}>
                        Lv.{entry.mood_level}
                      </div>
                    )}
                    <div className="text-gray-600 text-xs font-mono">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CV Vault */}
      <div className="mb-8 border-t border-[#4f3c32] pt-8">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
          {vaultUnlocked ? <LockOpen size={20} className="text-[var(--color-terminal-green)]" /> : <Lock size={20} className="text-gray-400" />}
          <span>{t("vault", "title")}</span>
          {vaultUnlocked && <span className="text-[10px] bg-green-900/40 border border-green-700/40 text-green-400 px-2 py-0.5 rounded-sm uppercase tracking-widest">{t("vault", "active")}</span>}
        </h2>
        <p className="text-gray-500 font-mono text-xs mb-5">{t("vault", "desc")}</p>

        <div className="bg-[#241b17] border border-[#3d2e26] p-6 rounded-sm">
          {vaultUnlocked ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShieldCheck size={20} className="text-[var(--color-terminal-green)]" />
                <div>
                  <p className="text-white font-bold text-sm">{t("vault", "unlocked_title")}</p>
                  <p className="text-gray-500 text-xs font-mono mt-0.5">{t("vault", "unlocked_desc")}</p>
                </div>
              </div>
              <button
                onClick={handleVaultLock}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#3d2e26] text-gray-500 hover:text-white hover:bg-[#3d2e26] transition"
              >
                {t("vault", "lock")}
              </button>
            </div>
          ) : (
            /* Session expired — re-enter login password to restore vault key */
            <form onSubmit={handleVaultUnlock} className="space-y-4">
              <p className="text-gray-400 text-xs font-mono">{t("vault", "session_expired")}</p>
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">{t("auth", "password")}</label>
                <input
                  type="password"
                  value={vaultPassword}
                  onChange={(e) => setVaultPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#17110e] border border-[#4f3c32] px-4 py-3 text-white focus:outline-none focus:border-[var(--color-boss-accent)] font-mono text-sm transition"
                />
              </div>
              {vaultError && <p className="text-red-400 text-xs font-mono">{vaultError}</p>}
              <button
                type="submit"
                disabled={vaultLoading || !vaultPassword}
                className="w-full bg-amber-900 hover:bg-amber-800 text-white font-bold uppercase tracking-widest py-3 text-sm transition disabled:opacity-40 flex items-center justify-center space-x-2"
              >
                <Lock size={14} />
                <span>{vaultLoading ? t("vault", "unlocking") : t("vault", "unlock")}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="border-t border-[#4f3c32] pt-8">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-6 flex items-center space-x-2">
          <Globe size={20} className="text-gray-400" />
          <span>{t("settings", "title")}</span>
        </h2>
        <div className="bg-[#241b17] border border-[#3d2e26] p-6 rounded-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-sm uppercase tracking-wider">{t("settings", "language")}</p>
              <p className="text-gray-500 text-xs mt-1 font-mono">{t("settings", "language_desc")}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setLang("zh")}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border transition ${
                  lang === "zh"
                    ? "bg-amber-900 border-amber-700 text-white"
                    : "border-[#3d2e26] text-gray-500 hover:text-white hover:bg-[#3d2e26]"
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wider border transition ${
                  lang === "en"
                    ? "bg-amber-900 border-amber-700 text-white"
                    : "border-[#3d2e26] text-gray-500 hover:text-white hover:bg-[#3d2e26]"
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
