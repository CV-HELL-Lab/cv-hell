"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function DisclaimerModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = sessionStorage.getItem("cvhell_disclaimer_accepted");
    if (!accepted) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    sessionStorage.setItem("cvhell_disclaimer_accepted", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1410] border border-[#4f3c32] max-w-lg w-full rounded-sm shadow-2xl shadow-amber-900/20 overflow-hidden">
        <div className="bg-amber-950/40 border-b border-amber-900/50 px-6 py-4 flex items-center space-x-3">
          <AlertTriangle size={24} className="text-amber-500 shrink-0" />
          <h2 className="text-lg font-black text-white uppercase tracking-widest">Disclaimer</h2>
        </div>

        <div className="px-6 py-6 space-y-4 text-sm text-gray-300 leading-relaxed font-mono">
          <p>
            <span className="text-amber-500 font-bold">CV HELL</span> is a <span className="text-white font-bold">game-style resume feedback tool</span>. The AI-generated responses are intentionally exaggerated, dramatic, and provocative in tone.
          </p>
          <p>
            All criticism is directed <span className="text-white font-bold">exclusively at the document</span> (formatting, layout, structure, hierarchy), <span className="text-red-400 font-bold">never at you as a person</span>.
          </p>
          <p>
            The AI&apos;s harsh language is part of the game experience and does not reflect a genuine assessment of your abilities, intelligence, or worth.
          </p>
          <p className="text-gray-500 text-xs border-t border-[#333] pt-4">
            By continuing, you acknowledge that this is an entertainment product using AI-generated content, and the feedback should not be taken as professional career advice.
          </p>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleAccept}
            className="w-full bg-white text-black font-bold uppercase tracking-widest py-3 hover:bg-gray-200 transition-colors text-sm"
          >
            I Understand — Enter Hell
          </button>
        </div>
      </div>
    </div>
  );
}
