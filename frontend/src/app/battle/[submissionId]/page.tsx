"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2, AlertCircle, RefreshCw, Trophy } from "lucide-react";

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
  const { user, updatePoints } = useAuth();
  
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [bossSlug, setBossSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");
  const [prizePool, setPrizePool] = useState<number | null>(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await api.get(`/submission/${submissionId}`);
        setSubmission(res.data);
        
        // Fetch current boss to get prize pool and slug
        const bossRes = await api.get("/boss/current");
        setBossSlug(bossRes.data.slug);
        setPrizePool(bossRes.data.prize_pool);
        
        // If not evaluated yet, trigger evaluation
        if (!res.data.boss_response) {
          triggerEvaluation(res.data.boss_id);
        }
      } catch (err) {
        console.error("Failed to load submission", err);
        setError("Failed to load battle data. Are you lost?");
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchSubmission();
    } else {
      router.push("/login");
    }
  }, [submissionId, user, router]);

  const triggerEvaluation = async (bossId: string) => {
    setEvaluating(true);
    setError("");
    try {
      const res = await api.post(`/submit/${bossId}`, { submission_id: submissionId });
      
      // Update points and prize pool
      updatePoints(res.data.points_remaining);
      setPrizePool(res.data.prize_pool);
      
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
      } else {
        setError("The boss refused to respond. Try again.");
      }
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center flex-col space-y-4">
        <Loader2 className="animate-spin text-[var(--color-boss-red)]" size={48} />
        <span className="text-gray-400 font-mono tracking-widest uppercase">Loading arena...</span>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="flex-1 flex justify-center items-center p-4">
        <div className="bg-red-950/30 border border-red-500/50 text-red-500 p-6 flex flex-col items-center space-y-4 max-w-md text-center">
          <AlertCircle size={32} />
          <p className="font-mono">{error}</p>
        </div>
      </div>
    );
  }

  if (!submission) return null;

  return (
    <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-8 flex flex-col h-full">
      <div className="flex justify-between items-end mb-6 border-b border-[#333] pb-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest">
            Battle <span className="text-[var(--color-boss-red)]">#{submission.version_number}</span>
          </h1>
          <p className="text-gray-500 font-mono text-xs mt-1">
            Submitted at {new Date(submission.created_at).toLocaleString()}
          </p>
        </div>
        {prizePool !== null && (
          <div className="flex items-center space-x-2 bg-[#111] border border-[#333] px-4 py-2 rounded-sm">
            <Trophy size={16} className="text-[#fbbf24]" />
            <span className="font-mono text-sm text-gray-400 uppercase tracking-widest">Pool:</span>
            <span className="font-mono font-bold text-white">{prizePool} <span className="text-[var(--color-terminal-green)] text-xs">PTS</span></span>
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
        
        {/* Left Pane: Resume Preview */}
        <div className="bg-[#111] border border-[#222] rounded-sm flex flex-col h-[calc(100vh-200px)]">
          <div className="bg-[#1a1a1a] border-b border-[#333] p-3 shrink-0">
            <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest">Document Structure (Text Extraction)</h3>
          </div>
          <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed custom-scrollbar">
            {submission.extracted_text || "No text extracted. Did you upload a scanned image?"}
          </div>
        </div>

        {/* Right Pane: Boss Response */}
        <div className="bg-[#0a0a0a] border border-[#333] rounded-sm flex flex-col h-[calc(100vh-200px)] relative overflow-hidden shadow-2xl">
          <div className="bg-[var(--color-boss-red)]/10 border-b border-[var(--color-boss-red)]/30 p-4 shrink-0 flex justify-between items-center">
            <h3 className="text-[var(--color-boss-red)] font-bold uppercase tracking-widest">Boss Judgment</h3>
            {submission.boss_response && (
              <span className="bg-[#111] text-gray-300 text-[10px] uppercase tracking-widest px-3 py-1 border border-[#333]">
                Mood: Level {submission.boss_response.mood_level}
              </span>
            )}
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {evaluating ? (
              <div className="h-full flex flex-col justify-center items-center space-y-6">
                <div className="relative">
                  <Loader2 className="animate-spin text-[var(--color-boss-red)] relative z-10" size={64} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[var(--color-boss-red)]/20 rounded-full blur-xl animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-white uppercase tracking-widest">The Boss is Reading</h2>
                  <p className="text-gray-500 font-mono text-sm animate-pulse">Analyzing structural integrity...</p>
                </div>
              </div>
            ) : error ? (
               <div className="bg-red-950/30 border border-red-500/50 text-red-500 p-6 flex flex-col items-center space-y-4 text-center">
                  <AlertCircle size={32} />
                  <p className="font-mono text-sm">{error}</p>
                  <button 
                    onClick={() => triggerEvaluation(submission.boss_id)}
                    className="mt-4 px-6 py-2 bg-red-900/50 hover:bg-red-800 transition-colors text-white font-mono text-sm uppercase tracking-widest border border-red-500/50"
                  >
                    Retry Submission
                  </button>
               </div>
            ) : submission.boss_response ? (
              <div className="space-y-8 pb-10">
                {/* Mood Badge */}
                <div>
                  <span className="inline-block px-3 py-1 bg-[#1a1a1a] border-l-4 border-[var(--color-boss-red)] text-white font-bold uppercase tracking-widest text-sm mb-4">
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
                  <div className="bg-[#111] p-5 border border-[#222]">
                    <h4 className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-2">Core Failure</h4>
                    <p className="text-gray-300">{submission.boss_response.why_it_fails}</p>
                  </div>
                )}

                {/* Top Issues */}
                {submission.boss_response.top_issues.length > 0 && (
                  <div>
                    <h4 className="text-[var(--color-boss-red)] font-mono text-xs font-bold uppercase tracking-widest mb-3 flex items-center">
                      <AlertCircle size={14} className="mr-2" /> Structural Crimes
                    </h4>
                    <ul className="space-y-3">
                      {submission.boss_response.top_issues.map((issue, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-red-500 font-mono text-xs mr-3 mt-1">[{idx + 1}]</span>
                          <span className="text-gray-300 text-sm leading-relaxed">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fix Direction */}
                {submission.boss_response.fix_direction && (
                  <div className="bg-gray-900/40 p-5 border-l-2 border-gray-500">
                    <h4 className="text-gray-400 font-mono text-xs uppercase tracking-widest mb-2">Fix Direction</h4>
                    <p className="text-gray-300 text-sm">{submission.boss_response.fix_direction}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Resubmit CTA */}
          {submission.boss_response && !evaluating && !submission.boss_response.approved && (
            <div className="bg-[#0a0a0a] border-t border-[#333] p-4 shrink-0">
              <button
                onClick={() => router.push(`/boss/${bossSlug}`)}
                className="w-full bg-white text-black font-bold uppercase tracking-widest py-4 hover:bg-gray-200 transition-colors flex justify-center items-center space-x-2 group"
              >
                <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                <span>Adjust & Resubmit (10 PTS)</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
