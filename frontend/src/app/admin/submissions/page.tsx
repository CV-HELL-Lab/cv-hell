"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { FileText, CheckCircle, XCircle } from "lucide-react";

interface Submission {
  submission_id: string;
  user_handle: string;
  boss_name: string;
  version_number: number;
  mood: string | null;
  approved: boolean;
  created_at: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const router = useRouter();

  const fetchSubmissions = async (p: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      const res = await api.get(`/admin/submissions?page=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissions(res.data.items);
      setTotal(res.data.total);
      setPage(p);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/admin/login");
      } else {
        setError("Failed to fetch submissions.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions(1);
  }, []);

  if (error) return <div className="p-8 font-mono text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8 border-b border-[#333] pb-4">
        <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-widest flex items-center">
          <FileText className="mr-3 text-purple-500" /> Submission Browser
        </h1>
        <p className="text-gray-500 font-mono text-sm">Total: {total}</p>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-sm overflow-hidden flex flex-col min-h-[500px]">
        <table className="w-full text-left">
          <thead className="bg-[#1a1a1a] border-b border-[#333]">
            <tr>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">ID / Date</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">User Handle</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Target Boss</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Ver</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Status / Mood</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-mono">Loading records...</td></tr>
            ) : submissions.map((sub) => (
              <tr key={sub.submission_id} className="hover:bg-[#161616] transition-colors">
                <td className="p-4 font-mono text-xs">
                  <div className="text-gray-400 mb-1">{sub.submission_id.substring(0, 8)}...</div>
                  <div className="text-gray-600">{new Date(sub.created_at).toLocaleString()}</div>
                </td>
                <td className="p-4 font-bold text-white tracking-wider">{sub.user_handle}</td>
                <td className="p-4 font-mono text-gray-300">{sub.boss_name}</td>
                <td className="p-4 font-mono text-white">v{sub.version_number}</td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    {sub.approved ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <XCircle size={16} className="text-red-500" />
                    )}
                    <span className="font-mono text-xs uppercase tracking-widest text-gray-400">
                      {sub.mood || "Pending"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination controls */}
        <div className="mt-auto p-4 border-t border-[#333] bg-[#0a0a0a] flex justify-between items-center">
          <button 
            disabled={page <= 1 || loading}
            onClick={() => fetchSubmissions(page - 1)}
            className="px-4 py-2 border border-[#333] text-gray-400 font-mono text-xs uppercase hover:bg-[#222] disabled:opacity-50"
          >
            Previous
          </button>
          <span className="font-mono text-xs text-gray-500">Page {page} of {Math.ceil(total / 20) || 1}</span>
          <button 
            disabled={page * 20 >= total || loading}
            onClick={() => fetchSubmissions(page + 1)}
            className="px-4 py-2 border border-[#333] text-gray-400 font-mono text-xs uppercase hover:bg-[#222] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
