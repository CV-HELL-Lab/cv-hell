"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Users, Mail, Activity, Target } from "lucide-react";

interface UserRecord {
  user_id: string;
  display_name: string;
  email: string;
  points: number;
  total_submissions: number;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const router = useRouter();

  const fetchUsers = async (p: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("cvhell_admin_token");
      const res = await api.get(`/admin/users?page=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.items);
      setTotal(res.data.total);
      setPage(p);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/admin/login");
      } else {
        setError("Failed to fetch users.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, []);

  if (error) return <div className="p-8 font-mono text-red-500">{error}</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8 border-b border-[#333] pb-4">
        <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-widest flex items-center">
          <Users className="mr-3 text-cyan-500" /> User Directory
        </h1>
        <p className="text-gray-500 font-mono text-sm">Total: {total}</p>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-sm overflow-hidden flex flex-col min-h-[500px]">
        <table className="w-full text-left">
          <thead className="bg-[#1a1a1a] border-b border-[#333]">
            <tr>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">ID / Joined</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Display Name</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Email</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Points</th>
              <th className="p-4 font-mono text-xs text-gray-500 uppercase tracking-widest">Submissions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-mono">Loading records...</td></tr>
            ) : users.map((user) => (
              <tr key={user.user_id} className="hover:bg-[#161616] transition-colors">
                <td className="p-4 font-mono text-xs">
                  <div className="text-gray-400 mb-1">{user.user_id.substring(0, 8)}...</div>
                  <div className="text-gray-600">{new Date(user.created_at).toLocaleDateString()}</div>
                </td>
                <td className="p-4 font-bold text-white tracking-wider">{user.display_name}</td>
                <td className="p-4 font-mono text-gray-400 flex items-center space-x-2">
                  <Mail size={14} className="text-gray-600" />
                  <span>{user.email}</span>
                </td>
                <td className="p-4 font-mono">
                  <span className="text-[var(--color-boss-accent)] font-bold">{user.points}</span>
                </td>
                <td className="p-4 font-mono text-gray-300">
                  <span className="bg-[#222] px-2 py-1 rounded-sm border border-[#333] flex items-center w-max space-x-2">
                    <Activity size={14} className="text-purple-500" />
                    <span>{user.total_submissions}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination controls */}
        <div className="mt-auto p-4 border-t border-[#333] bg-[#0a0a0a] flex justify-between items-center">
          <button 
            disabled={page <= 1 || loading}
            onClick={() => fetchUsers(page - 1)}
            className="px-4 py-2 border border-[#333] text-gray-400 font-mono text-xs uppercase hover:bg-[#222] disabled:opacity-50"
          >
            Previous
          </button>
          <span className="font-mono text-xs text-gray-500">Page {page} of {Math.ceil(total / 20) || 1}</span>
          <button 
            disabled={page * 20 >= total || loading}
            onClick={() => fetchUsers(page + 1)}
            className="px-4 py-2 border border-[#333] text-gray-400 font-mono text-xs uppercase hover:bg-[#222] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
