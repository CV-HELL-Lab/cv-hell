"use client";

import { AlertTriangle, ShieldCheck, Lock } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-gray-500 hover:text-white text-xs font-mono transition">← {t("nav", "title")}</Link>
      </div>

      {/* Disclaimer */}
      <div className="bg-[#1a1410] border border-[#4f3c32] rounded-sm overflow-hidden mb-6">
        <div className="bg-amber-950/40 border-b border-amber-900/50 px-6 py-4 flex items-center space-x-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">{t("disclaimer", "title")}</h2>
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

      {/* Privacy */}
      <div className="bg-[#1a1410] border border-[#3d2e26] rounded-sm overflow-hidden">
        <div className="bg-green-950/20 border-b border-green-900/30 px-6 py-4 flex items-center space-x-3">
          <ShieldCheck size={20} className="text-[var(--color-terminal-green)] shrink-0" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">{t("disclaimer", "privacy_title")}</h2>
        </div>
        <div className="px-6 py-6 space-y-4 text-sm text-gray-300 leading-relaxed font-mono">
          <p>{t("disclaimer", "privacy_p1")}</p>
          <div className="bg-[#17110e] border border-[#3d2e26] rounded-sm p-4 space-y-3 text-sm">
            <p className="text-[var(--color-terminal-green)]">✓ {t("disclaimer", "privacy_b1")}</p>
            <p className="text-[var(--color-terminal-green)]">✓ {t("disclaimer", "privacy_b2")}</p>
            <p className="text-[var(--color-terminal-green)]">✓ {t("disclaimer", "privacy_b3")}</p>
          </div>
          <div className="flex items-start space-x-3 bg-[#17110e] border border-amber-900/30 rounded-sm p-4 text-xs text-gray-400">
            <Lock size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p>{t("disclaimer", "privacy_p2")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
