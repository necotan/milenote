"use client"

import { useTheme } from "next-themes";
import { useHydrated } from "@/lib/hooks/useHydrated";

// bodyの背景色と合わせる
const LIGHT_COLOR = "#f2f2f2";
const DARK_COLOR = "#000000";

// theme-color未指定だとステータスバーの色がページ上端のコンテンツからサンプリングされてしまうため、アプリの背景色に固定するmetaタグを出力
export default function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();
  const mounted = useHydrated();

  // マウント前（SSR含む）はOSのカラースキームに追従し、マウント後はnext-themesの設定に同期する
  if (!mounted || !resolvedTheme) {
    return (
      <>
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={LIGHT_COLOR} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={DARK_COLOR} />
      </>
    );
  }

  return <meta name="theme-color" content={resolvedTheme === "dark" ? DARK_COLOR : LIGHT_COLOR} />;
}
