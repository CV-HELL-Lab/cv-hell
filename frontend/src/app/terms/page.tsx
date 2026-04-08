"use client";

import { AlertTriangle, ShieldCheck, Lock, Eye, Trash2, Server, Globe, KeyRound } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-gray-500 hover:text-white text-xs font-mono transition">← {t("nav", "title")}</Link>
      </div>

      <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-2">{t("terms", "page_title")}</h1>
      <p className="text-gray-500 font-mono text-xs mb-10">{t("terms", "page_desc")}</p>

      {/* Disclaimer */}
      <div className="bg-[#1a1410] border border-[#4f3c32] rounded-sm overflow-hidden mb-6">
        <div className="bg-amber-950/40 border-b border-amber-900/50 px-6 py-4 flex items-center space-x-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0" />
          <h2 className="text-base font-black text-white uppercase tracking-widest">{t("disclaimer", "title")}</h2>
        </div>
        <div className="px-6 py-6 space-y-4 text-sm text-gray-300 leading-relaxed font-mono">
          <p>
            <span className="text-amber-500 font-bold">{t("disclaimer", "p1_1")}</span>{t("disclaimer", "p1_2")}<span className="text-white font-bold">{t("disclaimer", "p1_3")}</span>{t("disclaimer", "p1_4")}
          </p>
          <p>
            {t("disclaimer", "p2_1")}<span className="text-white font-bold">{t("disclaimer", "p2_2")}</span>{t("disclaimer", "p2_3")}<span className="text-red-400 font-bold">{t("disclaimer", "p2_4")}</span>{t("disclaimer", "p2_5")}
          </p>
          <p>{t("disclaimer", "p3")}</p>
          <p className="text-gray-500 text-xs border-t border-[#333] pt-4">{t("disclaimer", "p4")}</p>
        </div>
      </div>

      {/* What we store */}
      <div className="bg-[#1a1410] border border-[#3d2e26] rounded-sm overflow-hidden mb-6">
        <div className="bg-green-950/20 border-b border-green-900/30 px-6 py-4 flex items-center space-x-3">
          <ShieldCheck size={20} className="text-[var(--color-terminal-green)] shrink-0" />
          <h2 className="text-base font-black text-white uppercase tracking-widest">{t("terms", "storage_title")}</h2>
        </div>
        <div className="px-6 py-6 space-y-3 text-sm font-mono">
          <div className="flex items-start space-x-3 p-3 bg-[#17110e] border border-[#3d2e26] rounded-sm">
            <Trash2 size={14} className="text-[var(--color-terminal-green)] shrink-0 mt-0.5" />
            <p className="text-gray-300">{t("terms", "storage_b1")}</p>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-[#17110e] border border-[#3d2e26] rounded-sm">
            <Trash2 size={14} className="text-[var(--color-terminal-green)] shrink-0 mt-0.5" />
            <p className="text-gray-300">{t("terms", "storage_b2")}</p>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-[#17110e] border border-[#3d2e26] rounded-sm">
            <KeyRound size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-gray-300">{t("terms", "storage_b3")}</p>
          </div>
          <div className="flex items-start space-x-3 p-3 bg-[#17110e] border border-[#3d2e26] rounded-sm">
            <Lock size={14} className="text-gray-500 shrink-0 mt-0.5" />
            <p className="text-gray-400">{t("terms", "storage_b4")}</p>
          </div>
        </div>
      </div>

      {/* Who can see what */}
      <div className="bg-[#1a1410] border border-[#3d2e26] rounded-sm overflow-hidden mb-6">
        <div className="border-b border-[#3d2e26] px-6 py-4 flex items-center space-x-3">
          <Eye size={20} className="text-gray-400 shrink-0" />
          <h2 className="text-base font-black text-white uppercase tracking-widest">{t("terms", "visibility_title")}</h2>
        </div>
        <div className="px-6 py-6 space-y-3 text-sm font-mono">
          {/* User */}
          <div className="flex items-start justify-between p-3 bg-[#17110e] border border-[#3d2e26] rounded-sm">
            <span className="text-white font-bold">{t("terms", "vis_user")}</span>
            <span className="text-[var(--color-terminal-green)] text-xs ml-4 text-right">{t("terms", "vis_user_val")}</span>
          </div>
          {/* Server at eval time */}
          <div className="flex items-start justify-between p-3 bg-[#17110e] border border-amber-900/30 rounded-sm">
            <span className="text-white font-bold">{t("terms", "vis_server")}</span>
            <span className="text-amber-400 text-xs ml-4 text-right">{t("terms", "vis_server_val")}</span>
          </div>
          {/* Server stored */}
          <div className="flex items-start justify-between p-3 bg-[#17110e] border border-[#3d2e26] rounded-sm">
            <span className="text-white font-bold">{t("terms", "vis_server_stored")}</span>
            <span className="text-[var(--color-terminal-green)] text-xs ml-4 text-right">{t("terms", "vis_server_stored_val")}</span>
          </div>
          {/* LLM API */}
          <div className="flex items-start justify-between p-3 bg-[#17110e] border border-amber-900/30 rounded-sm">
            <span className="text-white font-bold">{t("terms", "vis_llm")}</span>
            <span className="text-amber-400 text-xs ml-4 text-right">{t("terms", "vis_llm_val")}</span>
          </div>
          {/* Other users */}
          <div className="flex items-start justify-between p-3 bg-[#17110e] border border-[#3d2e26] rounded-sm">
            <span className="text-white font-bold">{t("terms", "vis_others")}</span>
            <span className="text-[var(--color-terminal-green)] text-xs ml-4 text-right">{t("terms", "vis_others_val")}</span>
          </div>
          {/* Database breach */}
          <div className="flex items-start justify-between p-3 bg-[#17110e] border border-[#3d2e26] rounded-sm">
            <span className="text-white font-bold">{t("terms", "vis_breach")}</span>
            <span className="text-[var(--color-terminal-green)] text-xs ml-4 text-right">{t("terms", "vis_breach_val")}</span>
          </div>
        </div>
      </div>

      {/* Third party */}
      <div className="bg-[#1a1410] border border-[#3d2e26] rounded-sm overflow-hidden mb-6">
        <div className="border-b border-[#3d2e26] px-6 py-4 flex items-center space-x-3">
          <Globe size={20} className="text-gray-400 shrink-0" />
          <h2 className="text-base font-black text-white uppercase tracking-widest">{t("terms", "third_party_title")}</h2>
        </div>
        <div className="px-6 py-6 text-sm text-gray-300 leading-relaxed font-mono space-y-3">
          <p>{t("terms", "third_party_p1")}</p>
          <p className="text-gray-500 text-xs">{t("terms", "third_party_p2")}</p>
        </div>
      </div>

      {/* Encryption */}
      <div className="bg-[#1a1410] border border-[#3d2e26] rounded-sm overflow-hidden">
        <div className="bg-green-950/10 border-b border-green-900/20 px-6 py-4 flex items-center space-x-3">
          <KeyRound size={20} className="text-amber-400 shrink-0" />
          <h2 className="text-base font-black text-white uppercase tracking-widest">{t("terms", "enc_title")}</h2>
        </div>
        <div className="px-6 py-6 text-sm text-gray-300 leading-relaxed font-mono space-y-3">
          <p>{t("terms", "enc_p1")}</p>
          <p>{t("terms", "enc_p2")}</p>
          <div className="flex items-start space-x-3 bg-[#17110e] border border-amber-900/30 rounded-sm p-3 text-xs text-gray-400">
            <Lock size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <p>{t("terms", "enc_warn")}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
