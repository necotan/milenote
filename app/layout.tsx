"use client"

import { useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/ui/BottomNav";
import Sidebar from "@/components/ui/Sidebar";
import { createClient } from "@/utils/supabase";
import { useRouter, usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider, useTranslation } from "@/lib/i18n";

import RecurringCostProcessor from "@/components/RecurringCostProcessor";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// 翻訳フックを使用するため、LanguageProviderの子となるコンポーネントを定義
function AppContent({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  const { t } = useTranslation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-400 font-bold tracking-widest">{t("common.loading")}</div>;
  }

  return (
    <div className="flex min-h-screen w-full relative">
      <RecurringCostProcessor />
      <Sidebar />

      {/* メインコンテンツエリア。ここに最大幅(max-w-6xl)を持たせ、中央寄せ(mx-auto)にする */}
      <div className="flex-1 pb-20 md:pb-8 w-full min-w-0 max-w-6xl mx-auto">
        {children}
      </div>

      <BottomNav />
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !pathname.startsWith("/login") && pathname !== "/terms" && pathname !== "/privacy") {
        router.push("/login");
      }
      setLoading(false);
    };
    checkUser();
  }, [pathname, router, supabase.auth]);

  if (pathname.startsWith("/login") || pathname === "/terms" || pathname === "/privacy") {
    return (
      <html lang="ja">
        <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-slate-50 tracking-wide`}>
          <LanguageProvider>
            {children}
            <Toaster position="top-center" richColors />
          </LanguageProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-slate-50 text-foreground tracking-wider`}>
        <LanguageProvider>
          <AppContent loading={loading}>
            {children}
          </AppContent>
          <Toaster position="top-center" richColors />
        </LanguageProvider>
      </body>
    </html>
  );
}