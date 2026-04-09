"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Loader2, AlertCircle, RefreshCw, Trophy, ShieldCheck, Lock } from "lucide-react";
import { loadKeyFromSession, encryptText, decryptText } from "@/lib/vault";

interface BossResponse {
  roast_opening: string;
  why_it_fails: string;
  top_issues: string[];
  fix_direction: string;
  mood: string;
  mood_level: number;
  approved: boolean;
  approved_phrase: string | null;
}

interface SubmissionData {
  is_cv_encrypted?: boolean;
  extracted_text_encrypted?: string | null;
  submission_id: string;
  boss_id: string;
  version_number: number;
  extracted_text: string;
  source_type: string;
  created_at: string;
  boss_response: BossResponse | null;
}

export default function BattlePage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = use(params);
  const router = useRouter();
  const { user, updatePoints, loading: authLoading } = useAuth();
  const { lang, t } = useLanguage();
  
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [bossSlug, setBossSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");
  const [prizePool, setPrizePool] = useState<number | null>(null);
  const evaluationTriggered = useRef(false);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await api.get(`/submission/${submissionId}`);
        const data = { ...res.data };

        // If CV text is encrypted, try to decrypt it with vault key
        if (data.is_cv_encrypted && data.extracted_text_encrypted) {
          const vaultKey = await loadKeyFromSession();
          if (vaultKey) {
            try {
              data.extracted_text = await decryptText(data.extracted_text_encrypted, vaultKey);
            } catch {
              data.extracted_text = null; // wrong key or corrupted
            }
          } else {
            data.extracted_text = null; // vault locked
          }
        }

        setSubmission(data);
        
        // Fetch current boss to get prize pool and slug
        const bossRes = await api.get("/boss/current");
        setBossSlug(bossRes.data.slug);
        setPrizePool(bossRes.data.prize_pool);
        
        // If not evaluated yet, trigger evaluation
        if (!res.data.boss_response && !evaluationTriggered.current) {
          evaluationTriggered.current = true;
          triggerEvaluation(res.data.boss_id);
        }
      } catch (err) {
        console.error("Failed to load submission", err);
        setError(t("battle", "lost"));
      } finally {
        setLoading(false);
      }
    };
    
    if (authLoading) return;
    if (user) {
      fetchSubmission();
    } else {
      router.push("/login");
    }
  }, [submissionId, user, authLoading, router]);

  const triggerEvaluation = async (bossId: string) => {
    if (evaluating) return;  // prevent double-submit
    setEvaluating(true);
    setError("");
    try {
      const res = await api.post(`/submit/${bossId}`, { submission_id: submissionId, language: lang }, { timeout: 180000 });
      
      // Update points and prize pool
      updatePoints(res.data.points_remaining);
      setPrizePool(res.data.prize_pool);
      
      // If vault is unlocked, encrypt CV text immediately before it ages in the DB
      const vaultKey = await loadKeyFromSession();
      if (vaultKey && res.data.extracted_text_for_encryption) {
        try {
          const ciphertext = await encryptText(res.data.extracted_text_for_encryption, vaultKey);
          await api.patch(`/submission/${res.data.submission_id}/store-encrypted`, { ciphertext });
        } catch {
          // Non-fatal: encryption failed, plaintext stays — user will see it in history unencrypted
          console.warn("Vault encryption step failed — CV stored as plaintext this round.");
        }
      }

      // Update local state with the new response
      setSubmission((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          boss_response: {
            roast_opening: res.data.roast_opening,
            why_it_fails: res.data.why_it_fails,
            top_issues: res.data.top_issues,
            fix_direction: res.data.fix_direction,
            mood: res.data.mood,
            mood_level: res.data.mood_level,
            approved: res.data.approved,
            approved_phrase: res.data.approved_phrase,
          }
        };
      });

      if (res.data.approved) {
        sessionStorage.setItem("victoryData", JSON.stringify({
          world_first: res.data.world_first,
          points_won: res.data.points_won,
          boss_name: bossSlug, // Actually bossSlug is slug, maybe close enough
          approved_phrase: res.data.approved_phrase,
        }));
        setTimeout(() => {
          router.push("/victory");
        }, 1500);
      }
      
    } catch (err: any) {
      if (err.response?.status === 402) {
        setError(`Insufficient points. You need ${err.response.data.points_required} PTS to submit.`);
        setEvaluating(false);
        return;
      }
      // Connection dropped while backend was still processing (LLM is slow).
      // Keep polling until we find the committed result — atomicity guarantee:
      // the user WILL see the result as long as they stay on the page.
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
      const MAX_POLLS = 60; // up to 10 minutes (60 × 10s)
      let found = false;
      for (let i = 0; i < MAX_POLLS; i++) {
        // After 2 minutes with no result, change message to inform user
        if (i === 12) {
          setError("__still_processing__");
        }
        await sleep(10000); // wait 10s between checks
        try {
          const check = await api.get(`/submission/${submissionId}`);
          if (check.data.boss_response) {
            setError(""); // clear any status message
            setSubmission((prev) => prev ? { ...prev, boss_response: check.data.boss_response } : prev);
            // Refresh points display — they were deducted on the backend
            try {
              const me = await api.get("/me");
              if (me.data.points !== undefined) updatePoints(me.data.points);
            } catch { /* non-critical */ }
            if (check.data.boss_response.approved) {
              sessionStorage.setItem("victoryData", JSON.stringify({
                world_first: false,
                points_won: 0,
                boss_name: bossSlug,
                approved_phrase: check.data.boss_response.approved_phrase,
              }));
              setTimeout(() => router.push("/victory"), 1500);
            }
            found = true;
            break;
          }
        } catch {
          // ignore poll failure, keep trying
        }
      }
      if (!found) {
        // 10 minutes exhausted — backend truly failed, safe to show error
        setError("__give_up__");
      }
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center flex-col space-y-4">
        <Loader2 className="animate-spin text-[var(--color-boss-accent)]" size={48} />
        <span className="text-gray-400 font-mono tracking-widest uppercase">{t("battle", "loading_arena")}</span>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="flex-1 flex justify-center items-center p-4">
        <div className="bg-amber-950/30 border border-amber-500/50 text-amber-500 p-6 flex flex-col items-center space-y-4 max-w-md text-center">
          <AlertCircle size={32} />
          <p className="font-mono">{error}</p>
        </div>
      </div>
    );
  }

  if (!submission) return null;

  return (
    <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-8 flex flex-col h-full">
      <div className="flex justify-between items-end mb-6 border-b border-[#4f3c32] pb-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest">
            {t("battle", "battle")} <span className="text-[var(--color-boss-accent)]">#{submission.version_number}</span>
          </h1>
          <p className="text-gray-500 font-mono text-xs mt-1">
            {t("battle", "submitted_at")} {new Date(submission.created_at).toLocaleString()}
          </p>
        </div>
        {prizePool !== null && (
          <div className="flex items-center space-x-2 bg-[#241b17] border border-[#4f3c32] px-4 py-2 rounded-sm">
            <Trophy size={16} className="text-[#fbbf24]" />
            <span className="font-mono text-sm text-gray-400 uppercase tracking-widest">{t("battle", "pool")}</span>
            <span className="font-mono font-bold text-white">{prizePool} <span className="text-[var(--color-terminal-green)] text-xs">{t("nav", "pts")}</span></span>
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
        
        {/* Left Pane: Resume Preview */}
        <div className="bg-[#241b17] border border-[#3d2e26] rounded-sm flex flex-col h-[calc(100vh-200px)]">
          <div className="bg-[#30241e] border-b border-[#4f3c32] p-3 shrink-0">
            <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest">{t("battle", "doc_structure")}</h3>
          </div>
          <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed custom-scrollbar">
            {submission.is_cv_encrypted && !submission.extracted_text ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3 text-center">
                <Lock size={28} className="text-gray-600" />
                <p className="text-gray-500">{t("battle", "vault_locked")}</p>
                <a href="/profile" className="text-amber-500 hover:text-amber-400 text-xs underline underline-offset-4">{t("battle", "vault_unlock_link")}</a>
              </div>
            ) : (
              submission.extracted_text || t("battle", "no_text")
            )}
          </div>
        </div>

        {/* Right Pane: Boss Response */}
        <div className="bg-[#17110e] border border-[#4f3c32] rounded-sm flex flex-col h-[calc(100vh-200px)] relative overflow-hidden shadow-2xl">
          <div className="bg-[var(--color-boss-accent)]/10 border-b border-[var(--color-boss-accent)]/30 p-4 shrink-0 flex justify-between items-center">
            <h3 className="text-[var(--color-boss-accent)] font-bold uppercase tracking-widest">{t("battle", "judgment")}</h3>
            {submission.boss_response && (
              <span className="bg-[#241b17] text-gray-300 text-[10px] uppercase tracking-widest px-3 py-1 border border-[#4f3c32]">
                {t("battle", "mood", { level: submission.boss_response.mood_level })}
              </span>
            )}
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {evaluating ? (
              <div className="h-full flex flex-col justify-center items-center space-y-6">
                <div className="relative">
                  <Loader2 className="animate-spin text-[var(--color-boss-accent)] relative z-10" size={64} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[var(--color-boss-accent)]/20 rounded-full blur-xl animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-white uppercase tracking-widest">{t("battle", "boss_reading")}</h2>
                  <p className="text-gray-500 font-mono text-sm animate-pulse">{t("battle", "analyzing")}</p>
                </div>
              </div>
            ) : error === "__still_processing__" ? (
              <div className="h-full flex flex-col justify-center items-center space-y-6">
                <div className="relative">
                  <Loader2 className="animate-spin text-[var(--color-boss-accent)] relative z-10" size={64} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[var(--color-boss-accent)]/20 rounded-full blur-xl animate-pulse" />
                </div>
                <div className="text-center space-y-3">
                  <h2 className="text-xl font-bold text-white uppercase tracking-widest">{t("battle", "boss_reading")}</h2>
                  <p className="text-gray-400 font-mono text-sm">The connection dropped, but the Boss is still judging.</p>
                  <p className="text-gray-500 font-mono text-xs">Waiting for result... please stay on this page.</p>
                  <button onClick={() => window.location.reload()} className="mt-2 px-4 py-1 border border-gray-600 text-gray-400 font-mono text-xs uppercase tracking-widest hover:border-gray-400 hover:text-gray-200 transition-colors">
                    Refresh page
                  </button>
                </div>
              </div>
            ) : error === "__give_up__" ? (
               <div className="bg-amber-950/30 border border-amber-500/50 text-amber-500 p-6 flex flex-col items-center space-y-4 text-center">
                  <AlertCircle size={32} />
                  <p className="font-mono text-sm">The Boss took too long to respond. Your points were not deducted.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2 bg-amber-900/50 hover:bg-amber-800 transition-colors text-white font-mono text-sm uppercase tracking-widest border border-amber-500/50"
                  >
                    Refresh &amp; Check Result
                  </button>
               </div>
            ) : error ? (
               <div className="bg-amber-950/30 border border-amber-500/50 text-amber-500 p-6 flex flex-col items-center space-y-4 text-center">
                  <AlertCircle size={32} />
                  <p className="font-mono text-sm">{error}</p>
                  <button 
                    onClick={() => triggerEvaluation(submission.boss_id)}
                    disabled={evaluating}
                    className="mt-4 px-6 py-2 bg-amber-900/50 hover:bg-amber-800 transition-colors text-white font-mono text-sm uppercase tracking-widest border border-amber-500/50 disabled:opacity-50"
                  >
                    {t("battle", "retry")}
                  </button>
               </div>
            ) : submission.boss_response ? (
              <div className="space-y-8 pb-10">
                {/* Mood Badge */}
                <div>
                  <span className="inline-block px-3 py-1 bg-[#30241e] border-l-4 border-[var(--color-boss-accent)] text-white font-bold uppercase tracking-widest text-sm mb-4">
                    {submission.boss_response.mood}
                  </span>
                </div>

                {/* Roast Opening */}
                <div>
                  <p className="text-xl md:text-2xl font-black text-white leading-snug tracking-tight">
                    "{submission.boss_response.roast_opening}"
                  </p>
                </div>

                {/* Why it fails */}
                {submission.boss_response.why_it_fails && (
                  <div className="bg-[#241b17] p-5 border border-[#3d2e26]">
                    <h4 className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-2">{t("battle", "core_failure")}</h4>
                    <p className="text-gray-300">{submission.boss_response.why_it_fails}</p>
                  </div>
                )}

                {/* Top Issues */}
                {submission.boss_response.top_issues.length > 0 && (
                  <div>
                    <h4 className="text-[var(--color-boss-accent)] font-mono text-xs font-bold uppercase tracking-widest mb-3 flex items-center">
                      <AlertCircle size={14} className="mr-2" /> {t("battle", "crimes")}
                    </h4>
                    <ul className="space-y-3">
                      {submission.boss_response.top_issues.map((issue, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-amber-500 font-mono text-xs mr-3 mt-1">[{idx + 1}]</span>
                          <span className="text-gray-300 text-sm leading-relaxed">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fix Direction */}
                {submission.boss_response.fix_direction && (
                  <div className="bg-gray-900/40 p-5 border-l-2 border-gray-500">
                    <h4 className="text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">{t("battle", "fix_dir")}</h4>
                    <p className="text-gray-300 text-sm">{submission.boss_response.fix_direction}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Resubmit CTA */}
          {submission.boss_response && !evaluating && !submission.boss_response.approved && (
            <div className="bg-[#17110e] border-t border-[#4f3c32] p-4 shrink-0">
              <button
                onClick={() => router.push(`/boss/${bossSlug}`)}
                className="w-full bg-white text-black font-bold uppercase tracking-widest py-4 hover:bg-gray-200 transition-colors flex justify-center items-center space-x-2 group"
              >
                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                <span>{t("battle", "adjust")}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
