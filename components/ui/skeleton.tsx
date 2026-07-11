import * as React from "react"

import { cn } from "@/lib/utils"

// 背景色、シマーアニメーションは globals.css の .skeleton（--skeleton / --skeleton-shimmer 変数）で一元管理
// ここでは形状のみ className で指定する
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

export { Skeleton, SkeletonTabs }
