"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Cpu, Plus, Power, Trash2 } from "lucide-react";

interface LLMConfig {
  id: string;
  provider: "qwen" | "deepseek";
  base_url: string;
  model: string;
  is_active: boolean;
  api_key_masked: string;
  created_at: string;
}

export default function LLMConfigsPage() {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState<"qwen" | "deepseek">("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      const res = await api.get("/admin/llm-configs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfigs(res.data.items);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/admin/login");
      } else {
        setError("Failed to fetch LLM configs.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleActivate = async (id: string) => {
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      await api.post(`/admin/llm-configs/${id}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchConfigs();
    } catch (err) {
      alert("Failed to activate config.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this config?")) return;
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      await api.delete(`/admin/llm-configs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchConfigs();
    } catch (err) {
      alert("Failed to delete config.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      await api.post("/admin/llm-configs", {
        provider,
        api_key: apiKey,
        base_url: baseUrl || undefined,
        model: model || undefined,
        is_active: configs.length === 0 // Make active if it's the first one
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Reset form
      setShowForm(false);
      setApiKey("");
      setBaseUrl("");
      setModel("");
      
      fetchConfigs();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create config.");
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <div className="p-8 font-mono text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex justify-between items-center mb-8 border-b border-[#333] pb-4">
        <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-widest flex items-center">
          <Cpu className="mr-3 text-cyan-500" /> LLM Configuration
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 bg-white text-black px-4 py-2 font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors"
        >
          <Plus size={14} />
          <span>Add Key</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111] border border-[#333] p-6 mb-8 rounded-sm">
          <h2 className="text-lg font-bold text-white uppercase tracking-widest mb-4">New Connection</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="w-full bg-[#0a0a0a] border border-[#333] px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[var(--color-boss-accent)]"
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="qwen">Qwen (Aliyun)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">API Key</label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[var(--color-boss-accent)]"
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Base URL (Optional)</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[var(--color-boss-accent)]"
                  placeholder="Leave empty for default"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Model (Optional)</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[var(--color-boss-accent)]"
                  placeholder="Leave empty for default"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-[#333] text-gray-400 hover:text-white font-mono text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-[var(--color-boss-accent)] text-black font-bold uppercase tracking-widest text-xs hover:bg-amber-400 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Key"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[#111] border border-[#222] rounded-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#1a1a1a] border-b border-[#333]">
            <tr>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Provider</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Model</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">API Key</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Status</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-mono">Loading keys...</td></tr>
            ) : configs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-mono">No LLM configs found. Add one above.</td></tr>
            ) : configs.map((config) => (
              <tr key={config.id} className={config.is_active ? "bg-[var(--color-boss-accent)]/5" : ""}>
                <td className="p-4 font-bold text-white capitalize">{config.provider}</td>
                <td className="p-4 font-mono text-gray-300">{config.model}</td>
                <td className="p-4 font-mono text-gray-500">{config.api_key_masked}</td>
                <td className="p-4">
                  {config.is_active ? (
                    <span className="inline-block px-2 py-1 bg-green-950/30 text-[var(--color-terminal-green)] border border-green-900/50 font-mono text-[10px] uppercase tracking-widest">
                      Active
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-1 bg-[#222] text-gray-400 border border-[#333] font-mono text-[10px] uppercase tracking-widest">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="p-4 text-right space-x-2">
                  {!config.is_active && (
                    <button
                      onClick={() => handleActivate(config.id)}
                      className="inline-flex items-center px-3 py-1.5 bg-[#222] hover:bg-[#333] text-gray-300 font-mono text-xs uppercase transition-colors"
                      title="Set as Active Provider"
                    >
                      <Power size={14} className="mr-1" /> Activate
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="inline-flex items-center px-3 py-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-500 border border-red-900/30 font-mono text-xs uppercase transition-colors"
                    title="Delete Key"
                  >
                    <Trash2 size={14} className="mr-1" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
