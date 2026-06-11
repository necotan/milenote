"use client"

import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/i18n"
import Footer from "@/components/ui/Footer"

// 利用規約ページ
export default function TermsPage() {
  const router = useRouter()
  const { t } = useTranslation()

  // 条文の見出し・本文をまとめて描画
  const articles = ["applicability", "registration", "prohibited", "data", "suspension", "ip", "disclaimer", "changes"]

  // 導入文中の運営者名をGitHubリンクに置き換えて描画
  const [introBefore, introAfter] = t("terms.intro").split("{{operator}}")

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-8"
        >
          <span className="font-bold text-xs">{t("terms.back")}</span>
        </button>

        <h1 className="text-2xl font-bold text-slate-900">{t("terms.title")}</h1>
        <p className="text-xs text-slate-400 mt-2">
          {t("terms.last_updated")}：{t("terms.updated_date")}
        </p>

        <p className="mt-6 text-sm text-slate-600 leading-relaxed">
          {introBefore}
          <a
            href="https://github.com/necotan"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-slate-700 underline underline-offset-2 hover:text-slate-900"
          >
            {t("terms.operator")}
          </a>
          {introAfter}
        </p>

        <div className="mt-8 space-y-7">
          {articles.map((key, index) => (
            <section key={key} className="space-y-2">
              <h2 className="text-base font-bold text-slate-800">
                {t("terms.article", { n: index + 1 })}　{t(`terms.articles.${key}.heading`)}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {t(`terms.articles.${key}.body`)}
              </p>
            </section>
          ))}
        </div>
      </div>

      <Footer className="pb-8 pt-6" replaceNav />
    </div>
  )
}