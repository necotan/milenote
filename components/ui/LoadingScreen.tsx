"use client"

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";

export default function LoadingScreen() {
  const { t } = useTranslation();
  const text = t("common.loading_text");

  // テキストを1文字ずつ表示する
  const [typedCount, setTypedCount] = useState(0);
  const typingDone = typedCount >= text.length;

  useEffect(() => {
    if (typingDone) return;
    const id = setTimeout(() => setTypedCount((c) => c + 1), 90);
    return () => clearTimeout(id);
  }, [typedCount, typingDone]);

  // アニメーション後にドットを循環させる
  const [dots, setDots] = useState(1);
  useEffect(() => {
    if (!typingDone) return;
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 320);
    return () => clearInterval(id);
  }, [typingDone]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-slate-50 dark:bg-background">
      {/* メーター */}
      <svg
        viewBox="0 0 100 100"
        className="h-24 w-24"
        role="img"
        aria-hidden="true"
      >
        {/* 背景の弧（中心(50,50)、半径38、約240°）常時表示の土台レイヤー */}
        <path
          className="text-neutral-200 dark:text-neutral-700"
          d="M 17.1 69 A 38 38 0 1 1 82.9 69"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* 同一パスを重ね、stroke-dashoffset(.meter-arc)で針の回転に同期して描画する前景レイヤー */}
        <path
          className="meter-arc text-neutral-800 dark:text-neutral-200"
          d="M 17.1 69 A 38 38 0 1 1 82.9 69"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* 針 */}
        <g className="meter-needle text-neutral-800 dark:text-neutral-200">
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
        {/* 中心のハブ */}
        <circle className="text-neutral-800 dark:text-neutral-200" cx="50" cy="50" r="3.5" fill="currentColor" />
      </svg>

      {/* 全文字ぶんの幅を最初から確保し、中央位置を固定する */}
      <div className="flex items-baseline justify-center font-bold tracking-widest text-slate-400 dark:text-muted-foreground">
        {text.split("").map((ch, i) => (
          <span key={i} style={{ opacity: i < typedCount ? 1 : 0 }}>{ch}</span>
        ))}
        <span className="inline-block w-[1.5em] text-left">{typingDone ? ".".repeat(dots) : ""}</span>
      </div>
    </div>
  );
}
