"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token, {
        user_id: res.data.user_id,
        display_name: res.data.display_name,
        email,
        points: res.data.points || 100, // Fallback if points not returned in login
      });
      // Fetch me to get fresh points
      try {
        const meRes = await api.get("/me", {
          headers: { Authorization: `Bearer ${res.data.token}` }
        });
        login(res.data.token, meRes.data);
      } catch (err) {
        console.error("Failed to fetch fresh user data after login", err);
      }
      
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to login. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-[#241b17] border border-[#4f3c32] p-8 rounded-sm shadow-2xl">
        <h2 className="text-3xl font-bold mb-2 text-white uppercase tracking-wide">{t("auth", "login_title")}</h2>
        <p className="text-gray-400 mb-8 font-mono text-sm">Log in to face the current boss.</p>

        {error && (
          <div className="mb-6 p-4 bg-amber-950/30 border border-amber-500/50 text-amber-500 flex items-start space-x-3 rounded-sm">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <span className="text-sm font-mono leading-tight">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold uppercase tracking-widest py-4 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#241b17] disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? t("auth", "signing_in") : t("auth", "login")}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#3d2e26] pt-6">
          <p className="text-gray-400 text-sm font-mono">
            {t("auth", "no_account")}{" "}
            <Link href="/register" className="text-white hover:text-[var(--color-boss-accent)] underline underline-offset-4 transition-colors">
              {t("auth", "register_link")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
