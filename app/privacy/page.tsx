"use client"

import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/i18n"
import Footer from "@/components/ui/Footer"

// プライバシーポリシーページ
export default function PrivacyPage() {
  const router = useRouter()
  const { t } = useTranslation()

  // 条項の見出し、本文をまとめて描画
  const sections = ["collection", "usage", "external", "images", "thirdparty", "management", "disclosure", "changes"]

  // 導入文中の運営者名をGitHubリンクに置き換えて描画
  const [introBefore, introAfter] = t("privacy.intro").split("{{operator}}")

  return (
    <div className="min-h-screen bg-white dark:bg-background flex flex-col">
      <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground transition-colors mb-8"
        >
          <span className="font-bold text-xs">{t("privacy.back")}</span>
        </button>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">{t("privacy.title")}</h1>
        <p className="text-xs text-slate-400 dark:text-muted-foreground mt-2">
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
