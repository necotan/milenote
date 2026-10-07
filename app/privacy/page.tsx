"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import Footer from "@/components/ui/Footer"

export default function PrivacyPage() {
  const router = useRouter()
  const { t } = useTranslation()

  // 条項の見出し、本文をまとめて描画する
  const sections = ["collection", "usage", "external", "images", "thirdparty", "management", "disclosure", "changes"]

  // 導入文中の運営者名をGitHubリンクに置き換え
  const [introBefore, introAfter] = t("privacy.intro").split("{{operator}}")

  return (
    <div className="min-h-screen bg-white dark:bg-background flex flex-col">
      <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-10">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t("privacy.back")}
          title={t("privacy.back")}
          className="relative size-10 flex items-center justify-center rounded-full after:absolute after:-inset-1.5 after:rounded-full after:content-[''] bg-slate-100 text-slate-600 hover:text-slate-800 dark:bg-card dark:text-muted-foreground dark:hover:text-foreground transition-all active:scale-90 mb-8"
        >
          <ChevronLeft size={22} className="-translate-x-px" />
        </button>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">{t("privacy.title")}</h1>
        <p className="text-xs text-slate-500 dark:text-muted-foreground mt-2">
          {t("privacy.last_updated")}：{t("privacy.updated_date")}
        </p>

        <p className="mt-6 text-sm text-slate-600 dark:text-muted-foreground leading-relaxed">
          {introBefore}
          <a
            href="https://github.com/necotan"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-slate-700 dark:text-foreground underline underline-offset-2 hover:text-slate-900 dark:hover:text-foreground"
          >
            {t("privacy.operator")}
          </a>
          {introAfter}
        </p>

        <div className="mt-8 space-y-7">
          {sections.map((key, index) => (
            <section key={key} className="space-y-2">
              <h2 className="text-base font-bold text-slate-800 dark:text-foreground">
                {t("privacy.article", { n: index + 1 })}　{t(`privacy.sections.${key}.heading`)}
              </h2>
              <p className="text-sm text-slate-600 dark:text-muted-foreground leading-relaxed whitespace-pre-line">
                {t(`privacy.sections.${key}.body`)}
              </p>
            </section>
          ))}
        </div>
      </div>

      <Footer className="pb-8 pt-6" replaceNav />
    </div>
  )
}
