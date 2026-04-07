"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { dict } from "@/lib/dictionary";

type Language = "en" | "zh";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (category: string, key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("zh"); // default to Chinese as requested
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cvhell_lang") as Language;
    if (saved && (saved === "en" || saved === "zh")) {
      setLangState(saved);
    }
    setMounted(true);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("cvhell_lang", newLang);
  };

  const t = (category: string, key: string, replacements?: Record<string, string | number>) => {
    let res = dict[lang]?.[category]?.[key];
    if (res === undefined) {
      // fallback to english
      res = dict["en"]?.[category]?.[key] || key;
    }
    if (typeof res === "string" && replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        res = res.replace(`{${k}}`, v.toString());
      });
    }
    return res as string;
  };

  // Avoid hydration mismatch by waiting for mount
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // fallback for SSR or unmounted state
    return {
      lang: "zh" as Language,
      setLang: () => {},
      t: (category: string, key: string) => dict["zh"]?.[category]?.[key] || key,
    };
  }
  return context;
}
