"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

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
      <div className="w-full max-w-md bg-[#111] border border-[#333] p-8 rounded-sm shadow-2xl">
        <h2 className="text-3xl font-bold mb-2 text-white uppercase tracking-wide">Enter the Hell</h2>
        <p className="text-gray-400 mb-8 font-mono text-sm">Log in to face the current boss.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-500/50 text-red-500 flex items-start space-x-3 rounded-sm">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <span className="text-sm font-mono leading-tight">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#333] px-4 py-3 text-white focus:outline-none focus:border-[var(--color-boss-red)] transition-colors font-mono text-sm"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#333] px-4 py-3 text-white focus:outline-none focus:border-[var(--color-boss-red)] transition-colors font-mono text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold uppercase tracking-widest py-4 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#111] disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? "Authenticating..." : "Submit"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[#222] pt-6">
          <p className="text-gray-400 text-sm font-mono">
            New victim?{" "}
            <Link href="/register" className="text-white hover:text-[var(--color-boss-red)] underline underline-offset-4 transition-colors">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
