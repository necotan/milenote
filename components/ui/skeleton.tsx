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

export { Skeleton }
