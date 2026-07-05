"use client"

import Link from "next/link"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// ログイン、新規登録、設定画面の下部に表示する共通フッター
// 規約、プライバシーページ自身に置く場合は replaceNav を true にし、
// ページ間の移動で履歴を積まない（戻るボタンで元の画面に一度で戻れる）ようにする
export default function Footer({ className, replaceNav = false }: { className?: string; replaceNav?: boolean }) {
  const { t } = useTranslation()

  return (
    <footer className={cn("w-full flex flex-col items-center gap-1 text-center", className)}>
      <div className="flex items-center gap-3">
        <Link
          href="/terms"
          replace={replaceNav}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-muted-foreground dark:hover:text-foreground transition-colors"
        >
          {t("footer.terms")}
        </Link>
        <span className="text-slate-300 dark:text-muted-foreground/50" aria-hidden="true">|</span>
        <Link
          href="/privacy"
          replace={replaceNav}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-muted-foreground dark:hover:text-foreground transition-colors"
        >
          {t("footer.privacy")}
        </Link>
      </div>
      <p className="text-[11px] text-slate-400 dark:text-muted-foreground">{t("footer.copyright")}</p>
    </footer>
  )
}