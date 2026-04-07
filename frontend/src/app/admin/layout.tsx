"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Skull, FileText, Users, Trophy, LogOut, Cpu } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return <>{children}</>;
  }

  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "LLM Configs", href: "/admin/llm-configs", icon: Cpu },
    { label: "Bosses", href: "/admin/bosses", icon: Skull },
    { label: "Submissions", href: "/admin/submissions", icon: FileText },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Leaderboard", href: "/admin/leaderboard", icon: Trophy },
  ];

  const handleLogout = () => {
    localStorage.removeItem("cvhell_admin_token");
    router.push("/admin/login");
  };

  return (
    <div className="flex flex-1 min-h-screen bg-[#050505]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-[#333] flex flex-col hidden md:flex">
        <div className="p-6 border-b border-[#333]">
          <h1 className="text-xl font-black text-white tracking-widest uppercase">
            Hell <span className="text-[var(--color-boss-accent)]">Admin</span>
          </h1>
        </div>

        <nav className="flex-1 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-6 py-3 font-mono text-sm uppercase tracking-wider transition-colors ${
                  isActive
                    ? "bg-[#17110e] text-white border-l-4 border-[var(--color-boss-accent)]"
                    : "text-gray-500 hover:text-white hover:bg-[#111] border-l-4 border-transparent"
                }`}
              >
                <Icon size={18} className={isActive ? "text-[var(--color-boss-accent)]" : "text-gray-500"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#333]">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-red-500 hover:bg-red-950/30 rounded-sm font-mono text-sm uppercase tracking-wider transition-colors"
          >
            <LogOut size={18} />
            <span>Terminate</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-[#0a0a0a] border-b border-[#333] p-4 flex justify-between items-center">
          <h1 className="text-lg font-black text-white tracking-widest uppercase">
            Hell <span className="text-[var(--color-boss-accent)]">Admin</span>
          </h1>
          <button onClick={handleLogout} className="text-red-500">
            <LogOut size={20} />
          </button>
        </div>
        
        {/* Mobile Nav */}
        <div className="md:hidden bg-[#111] border-b border-[#333] overflow-x-auto flex">
           {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center shrink-0 space-y-1 px-4 py-3 font-mono text-[10px] uppercase tracking-wider ${
                  isActive
                    ? "text-[var(--color-boss-accent)] border-b-2 border-[var(--color-boss-accent)]"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <main className="flex-1 overflow-auto bg-[#050505]">
          {children}
        </main>
      </div>
    </div>
  );
}
