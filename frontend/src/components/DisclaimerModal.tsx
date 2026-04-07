"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function DisclaimerModal() {
  const [show, setShow] = useState(true);
  const { t } = useLanguage();

  const handleAccept = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1410] border border-[#4f3c32] max-w-lg w-full rounded-sm shadow-2xl shadow-amber-900/20 overflow-hidden">
        <div className="bg-amber-950/40 border-b border-amber-900/50 px-6 py-4 flex items-center space-x-3">
          <AlertTriangle size={24} className="text-amber-500 shrink-0" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">{t("disclaimer", "title")}</h2>
        </div>

        <div className="px-6 py-6 space-y-4 text-sm text-gray-300 leading-relaxed font-mono">
          <p>
            <span className="text-amber-500 font-bold">{t("disclaimer", "p1_1")}</span>{t("disclaimer", "p1_2")}<span className="text-white font-bold">{t("disclaimer", "p1_3")}</span>{t("disclaimer", "p1_4")}
          </p>
          <p>
            {t("disclaimer", "p2_1")}<span className="text-white font-bold">{t("disclaimer", "p2_2")}</span>{t("disclaimer", "p2_3")}<span className="text-red-400 font-bold">{t("disclaimer", "p2_4")}</span>{t("disclaimer", "p2_5")}
          </p>
          <p>
            {t("disclaimer", "p3")}
          </p>
          <p className="text-gray-500 text-xs border-t border-[#333] pt-4">
            {t("disclaimer", "p4")}
          </p>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleAccept}
            className="w-full bg-white text-black font-bold uppercase tracking-widest py-3 hover:bg-gray-200 transition-colors text-sm"
          >
            {t("disclaimer", "btn")}
          </button>
        </div>
      </div>
    </div>
  );
}
