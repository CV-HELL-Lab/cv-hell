"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface BossData {
  id: string;
  name: string;
  slug: string;
  order_index: number;
  status: string;
  specialty: string;
  prize_pool: number;
}

export default function BossIntroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [boss, setBoss] = useState<BossData | null>(null);
  const [loadingBoss, setLoadingBoss] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBoss = async () => {
      try {
        const res = await api.get("/boss/current");
        if (res.data.slug !== slug) {
          router.push(`/boss/${res.data.slug}`);
          return;
        }
        setBoss(res.data);
      } catch (err) {
        console.error("Failed to fetch boss", err);
      } finally {
        setLoadingBoss(false);
      }
    };

    fetchBoss();
    const intervalId = setInterval(fetchBoss, 3000);
    return () => clearInterval(intervalId);
  }, [slug, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!validTypes.includes(selected.type)) {
        setError(t("boss", "only_pdf"));
        setFile(null);
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        setError(t("boss", "under_5mb"));
        setFile(null);
        return;
      }
      setError("");
      setFile(selected);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!file) {
      setError(t("boss", "select_file"));
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("source_type", file.name.endsWith(".pdf") ? "pdf" : "docx");

    try {
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Redirect to battle page
      router.push(`/battle/${res.data.submission_id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || t("boss", "upload_failed"));
      setUploading(false);
    }
  };

  if (loadingBoss) {
    return <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-[var(--color-boss-accent)]" size={32} /></div>;
  }

  if (!boss) return null;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Boss Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-2">
              {boss.name}
            </h1>
            <p className="text-xl text-[var(--color-boss-accent)] font-mono font-bold uppercase tracking-widest border-b border-[#4f3c32] pb-4">
              {t("boss", "current_target")}
            </p>
          </div>
          
          <div className="bg-[#241b17] border-l-4 border-gray-600 p-6 rounded-sm">
            <h3 className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-2">{t("boss", "specialty")}</h3>
            <p className="text-gray-300 font-mono text-sm">
              {boss.specialty}
            </p>
          </div>

          <div className="bg-[#241b17] border-l-4 border-[#fbbf24] p-6 rounded-sm">
            <h3 className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-2">{t("boss", "prize_pool")}</h3>
            <p className="text-3xl text-white font-bold tracking-wider font-mono">
              {boss.prize_pool} <span className="text-sm text-[var(--color-terminal-green)]">{t("nav", "pts")}</span>
            </p>
            <p className="text-gray-500 text-xs font-mono mt-2">{t("boss", "awarded_to")}</p>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-[#241b17] border border-[#4f3c32] p-8 rounded-sm shadow-2xl flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wide mb-2">{t("boss", "enter_arena")}</h2>
          <p className="text-gray-400 font-mono text-xs mb-8">
            {t("boss", "upload_desc1")} <br/>
            {t("boss", "upload_desc2")}<span className="text-[var(--color-boss-accent)] font-bold">10 {t("nav", "pts")}</span>{t("boss", "upload_desc3")}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-amber-950/30 border border-amber-500/50 text-amber-500 flex items-start space-x-3 rounded-sm">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <span className="text-xs font-mono leading-tight">{error}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-6">
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-sm cursor-pointer transition-colors ${
                  file ? "border-[var(--color-terminal-green)] bg-green-950/10" : "border-[#664e42] hover:border-[var(--color-boss-accent)] hover:bg-[#30241e]"
                }`}
              >
                {file ? (
                  <>
                    <FileText size={32} className="text-[var(--color-terminal-green)] mb-3" />
                    <span className="text-sm text-white font-mono font-bold truncate px-4 max-w-full">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500 font-mono mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-gray-500 mb-3" />
                    <span className="text-sm text-gray-400 font-mono">
                      {t("boss", "click_to_upload")}
                    </span>
                    <span className="text-xs text-gray-600 font-mono mt-1">{t("boss", "max_size")}</span>
                  </>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full bg-[var(--color-boss-accent)] text-white font-bold uppercase tracking-widest py-4 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#241b17] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t("boss", "preparing")}</span>
                </>
              ) : (
                <span>{t("boss", "upload_face")}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
