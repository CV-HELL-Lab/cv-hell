"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/register", {
        email,
        password,
        display_name: displayName,
      });
      
      login(res.data.token, {
        user_id: res.data.user_id,
        display_name: res.data.display_name,
        email,
        points: res.data.points,
      });
      
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-[#241b17] border border-amber-900/30 p-8 rounded-sm shadow-[0_0_40px_rgba(239,68,68,0.05)]">
        <h2 className="text-3xl font-bold mb-2 text-white uppercase tracking-wide">{t("auth", "reg_title")}</h2>
        <p className="text-gray-400 mb-8 font-mono text-sm">Create an account. Get 100 points. Lose them all.</p>

        {error && (
          <div className="mb-6 p-4 bg-amber-950/30 border border-amber-500/50 text-amber-500 flex items-start space-x-3 rounded-sm">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <span className="text-sm font-mono leading-tight">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">{t("auth", "name")}</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#17110e] border border-[#4f3c32] px-4 py-3 text-white focus:outline-none focus:border-[var(--color-boss-accent)] transition-colors font-mono text-sm"
              placeholder="Challenger_01"
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">{t("auth", "email")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#17110e] border border-[#4f3c32] px-4 py-3 text-white focus:outline-none focus:border-[var(--color-boss-accent)] transition-colors font-mono text-sm"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">{t("auth", "password")}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#17110e] border border-[#4f3c32] px-4 py-3 text-white focus:outline-none focus:border-[var(--color-boss-accent)] transition-colors font-mono text-sm"
              placeholder="Min 8 characters"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-boss-accent)] text-white font-bold uppercase tracking-widest py-4 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#241b17] disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? t("auth", "registering") : t("auth", "register")}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center border-t border-[#3d2e26] pt-6">
          <p className="text-gray-400 text-sm font-mono">
            {t("auth", "has_account")}{" "}
            <Link href="/login" className="text-white hover:text-[var(--color-boss-accent)] underline underline-offset-4 transition-colors">
              {t("auth", "login_link")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
