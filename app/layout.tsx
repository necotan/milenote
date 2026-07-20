"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/ui/BottomNav";
import Sidebar from "@/components/ui/Sidebar";
import { createClient } from "@/utils/supabase";
import { useRouter, usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import ThemeColorMeta from "@/components/ui/ThemeColorMeta";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/lib/i18n";
import { LoadingGateProvider } from "@/lib/loadingGate";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { isPublicRoute } from "@/utils/publicRoutes";

import RecurringCostProcessor from "@/components/RecurringCostProcessor";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

function AppContent({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  return (
    <div className="flex min-h-screen w-full relative">
      <RecurringCostProcessor />
      <Sidebar />

      {/* メインコンテンツエリア。ここに最大幅(max-w-6xl)を持たせ、中央寄せ(mx-auto)にする */}
      <div className="flex-1 pb-20 md:pb-8 w-full min-w-0 max-w-6xl mx-auto">
        {children}
      </div>

      <BottomNav />

      {/* 初回ローディング画面。裏側でページをマウントし、データ取得を進める */}
      {loading && (
        <div className="fixed inset-0 z-[100]">
          <LoadingScreen />
        </div>
      )}
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 初回ローディング画面を消す条件を構成する状態
  const [revealed, setRevealed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [expectingPage, setExpectingPage] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [maxElapsed, setMaxElapsed] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // 認証チェック。未認証で保護ルートならログインへ。リダイレクト中はオーバーレイを維持する
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (!session && !isPublicRoute(pathname)) {
        router.push("/login");
        return;
      }
      setAuthChecked(true);
    });
    return () => { active = false; };
  }, [pathname, router, supabase.auth]);

  // 最低表示時間と最大待機時間
  useEffect(() => {
    const minId = setTimeout(() => setMinElapsed(true), 1800);
    const maxId = setTimeout(() => setMaxElapsed(true), 8000);
    return () => { clearTimeout(minId); clearTimeout(maxId); };
  }, []);

  // 表示条件がそろったら実画面を出す。expectingPage なページはデータ取得完了(pageReady)を待つ
  useEffect(() => {
    if (revealed) return;
    if (authChecked && minElapsed && (pageReady || !expectingPage || maxElapsed)) {
      setRevealed(true);
    }
  }, [revealed, authChecked, minElapsed, pageReady, expectingPage, maxElapsed]);

  const setExpecting = useCallback(() => setExpectingPage(true), []);
  const setReady = useCallback(() => setPageReady(true), []);
  const gateValue = useMemo(() => ({ setExpecting, setReady }), [setExpecting, setReady]);

  if (isPublicRoute(pathname)) {
    return (
      <html lang="ja" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-slate-50 dark:bg-background tracking-wide`}>
          <ThemeProvider attribute="class" themes={["light", "dark"]} defaultTheme="system" enableSystem>
            <ThemeColorMeta />
            <LanguageProvider>
              {children}
              <Toaster position="top-center" richColors />
            </LanguageProvider>
          </ThemeProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-slate-50 dark:bg-background text-foreground tracking-wider`}>
        <ThemeProvider attribute="class" themes={["light", "dark"]} defaultTheme="system" enableSystem>
          <ThemeColorMeta />
          <LanguageProvider>
            <LoadingGateProvider value={gateValue}>
              <AppContent loading={!revealed}>
                {children}
              </AppContent>
            </LoadingGateProvider>
            <Toaster position="top-center" richColors />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
