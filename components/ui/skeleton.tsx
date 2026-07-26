import * as React from "react"

import { cn } from "@/lib/utils"

// 背景色、シマーアニメーションは globals.css の .skeleton（--skeleton / --skeleton-shimmer 変数）で一元管理する（ここでは形状のみ className で指定）
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton rounded", className)}
      {...props}
    />
  )
}

// タブ切り替え（TabsList）と同寸のプレースホルダ
// タブはロード完了まで実表示しない方針のため、タブ付きページのスケルトンではTabsListと同じ位置にこれを表示
function SkeletonTabs({ className, ...props }: React.ComponentProps<"div">) {
  return <Skeleton className={cn("h-8 w-full rounded-full", className)} {...props} />
}

// 実要素のフォントサイズ指定に対応するトークン
// xs 〜 2xl はTailwindの名前付きトークン、9px 〜 12px は text-[11px] のような任意サイズに対応する
type SkeletonTextSize = "9px" | "10px" | "11px" | "12px" | "xs" | "sm" | "base" | "lg" | "xl" | "2xl"
type SkeletonTextLeading = "none" | "tight" | "snug" | "normal" | "relaxed" | "loose"

// クラス名は文字列リテラルで指定
// Tailwindはソースを走査して使用クラスを判定するため、ここで動的に組み立てると（`text-${size}` 等）CSSが生成されず高さが出なくなる
const TEXT_SIZE_CLASS: Record<SkeletonTextSize, string> = {
  "9px": "text-[9px]",
  "10px": "text-[10px]",
  "11px": "text-[11px]",
  "12px": "text-[12px]",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
}

const LEADING_CLASS: Record<SkeletonTextLeading, string> = {
  none: "leading-none",
  tight: "leading-tight",
  snug: "leading-snug",
  normal: "leading-normal",
  relaxed: "leading-relaxed",
  loose: "leading-loose",
}

// 文字1行分のプレースホルダ
// 実要素と同じ text-* / leading-* を当て、ゼロ幅スペースが作る行ボックスの高さをそのまま使用することで、フォントサイズや行間の指定を変えても、スケルトンの高さが自動的に追従
// 幅（w-*）や余白（mt-*）は内容次第で決まるため、従来どおり className で指定
// 行間を上書きしている場合（leading-tight のラッパー内など）は leading で明示する
function SkeletonText({
  size,
  leading,
  className,
  ...props
}: React.ComponentProps<"div"> & { size: SkeletonTextSize; leading?: SkeletonTextLeading }) {
  return (
    <Skeleton
      className={cn(
        TEXT_SIZE_CLASS[size],
        "rounded-md",
        leading && LEADING_CLASS[leading],
        className
      )}
      {...props}
    >
      {/* 行ボックスを作るためのゼロ幅スペース */}
      &#8203;
    </Skeleton>
  )
}

export { Skeleton, SkeletonTabs, SkeletonText }
