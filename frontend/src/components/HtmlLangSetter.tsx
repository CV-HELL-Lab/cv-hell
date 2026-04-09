"use client";

import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function HtmlLangSetter() {
  const { lang } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
