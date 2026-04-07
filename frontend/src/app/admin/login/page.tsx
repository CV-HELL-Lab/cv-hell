"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { AlertCircle, Terminal } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/admin/login", { username, password });
      localStorage.setItem("cvhell_admin_token", res.data.token);
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Admin authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 bg-black">
      <div className="w-full max-w-sm border border-[#4f3c32] p-8 rounded-sm bg-[#17110e]">
        <div className="flex items-center space-x-3 mb-6 border-b border-[#4f3c32] pb-4">
          <Terminal size={24} className="text-gray-400" />
          <h2 className="text-xl font-mono font-bold text-white uppercase tracking-widest">
            Operator Auth
          </h2>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-950/20 border border-amber-900/50 text-amber-500 flex items-start space-x-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="text-xs font-mono">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Identifier</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#241b17] border border-[#4f3c32] px-4 py-2 text-white focus:outline-none focus:border-white transition-colors font-mono text-sm"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Passkey</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#241b17] border border-[#4f3c32] px-4 py-2 text-white focus:outline-none focus:border-white transition-colors font-mono text-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-mono font-bold uppercase tracking-widest py-3 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Initialize Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
