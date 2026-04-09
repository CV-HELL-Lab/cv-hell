import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import NavBar from "@/components/NavBar";
import DisclaimerModal from "@/components/DisclaimerModal";
import HtmlLangSetter from "@/components/HtmlLangSetter";

export const metadata: Metadata = {
  title: "CV HELL | Face the Boss",
  description: "Upload your CV. Face the boss. Make it shut up.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#17110e] text-[#ededed]">
        <LanguageProvider>
          <HtmlLangSetter />
          <AuthProvider>
            <DisclaimerModal />
            <NavBar />
            <main className="flex-1 flex flex-col">
              {children}
            </main>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
