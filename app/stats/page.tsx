"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, ReactElement } from "react"
import { createClient } from "@/utils/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SegmentedToggle } from "@/components/ui/SegmentedToggle"
import { Skeleton, SkeletonTabs } from "@/components/ui/skeleton"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Label, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar
} from "recharts"
import type { TooltipContentProps } from "recharts"
import { Globe, Moon, PieChart as PieIcon, BarChart3, CalendarDays, ChevronDown, Info, LineChart as LineChartIcon, Fuel, BatteryCharging } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslation } from "@/lib/i18n"
import { usePageLoadingGate } from "@/lib/loadingGate"

const CATEGORY_MAP_COLORFUL: Record<string, { color: string }> = {
  fuel: { color: "#3b82f6" },
  maintenance: { color: "#f97316" },
  inspection: { color: "#14b8a6" },
  repair: { color: "#f43f5e" },
  custom: { color: "#a855f7" },
  carwash: { color: "#06b6d4" },
  highway: { color: "#6366f1" },
  tax: { color: "#ef4444" },
  insurance: { color: "#22c55e" },
  other: { color: "#64748b" },
}

const CATEGORY_MAP_BLUE: Record<string, { color: string }> = {
  fuel: { color: "#0ea5e9" },
  maintenance: { color: "#2563eb" },
  inspection: { color: "#0f766e" },
  repair: { color: "#0d9488" },
  custom: { color: "#6366f1" },
  carwash: { color: "#0891b2" },
  highway: { color: "#38bdf8" },
  tax: { color: "#1e3a8a" },
  insurance: { color: "#818cf8" },
  other: { color: "#cbd5e1" },
}

const CATEGORY_KEYS = ["fuel", "maintenance", "inspection", "repair", "custom", "carwash", "highway", "tax", "insurance", "other"] as const
type CategoryKey = typeof CATEGORY_KEYS[number]

const normalizeCategoryKey = (cat: string): CategoryKey =>
  (CATEGORY_KEYS as readonly string[]).includes(cat) ? (cat as CategoryKey) : "other"

const buildEmptyCategoryBuckets = (): Record<CategoryKey, number> => ({
  fuel: 0, maintenance: 0, inspection: 0, repair: 0, custom: 0, carwash: 0, highway: 0, tax: 0, insurance: 0, other: 0,
})

type Record_ = {
  category: string
  amount: number
  date: string
  fuel_amount: string | number | null
  car_id: string | null
}

// 燃料種別ごとのCO₂排出係数 (kg-CO₂/L)
// EVは走行時排出ゼロ、その他/未設定はガソリン相当として扱う
const CO2_COEFFICIENT: Record<string, number> = {
  "regular": 2.32,
  "premium": 2.32,
  "diesel": 2.62,
  "ev": 0,
  "other": 2.32,
}
const CO2_COEFFICIENT_DEFAULT = 2.32

// ラベルテキストの幅を概算
const estimateLabelWidth = (text: string): number => {
  let width = 0
  for (const ch of text) width += ch.charCodeAt(0) > 0xff ? 10 : 5.8
  return width
}

const createCustomizedLabel = (t: (key: string, params?: Record<string, string | number>) => string, locale: string, fillColor: string) => {
  // Recharts の PieLabel 型は省略可能フィールドを含む複雑な union のため any を許容
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PieCustomLabel = (props: any) => {
    const { x, y, cx, percent, value, textAnchor } = props;

    const formatValue = (val: number) => {
      const truncateToOneDecimal = (num: number, divisor: number) => {
        return (Math.floor(num / (divisor / 10)) / 10).toString();
      };

      if (locale === "en") {
        if (val >= 1000) {
          return `¥${truncateToOneDecimal(val, 1000)}${t("stats.unit_k")}`;
        }
        return `¥${val.toLocaleString()}`;
      }
      if (val >= 10000) {
        return `¥${truncateToOneDecimal(val, 10000)}${t("stats.unit_ten_thousand")}`;
      }
      return `¥${val.toLocaleString()}`;
    };

    if (percent < 0.01) return null;

    // 金額とパーセントを2行に分けて表示
    const amountText = formatValue(value);
    const percentText = `(${(percent * 100).toFixed(1)}%)`;

    // ラベルがカード（SVG）の端に張り付かないよう、テキスト幅を概算して左右に最低限の余白を確保
    const EDGE_PAD = 8;
    const svgWidth = Number(cx) * 2;
    const textWidth = Math.max(estimateLabelWidth(amountText), estimateLabelWidth(percentText));
    let clampedX = Number(x);
    if (textAnchor === "end") {
      clampedX = Math.max(clampedX, EDGE_PAD + textWidth);
    } else if (textAnchor === "start") {
      clampedX = Math.min(clampedX, svgWidth - EDGE_PAD - textWidth);
    } else {
      clampedX = Math.min(Math.max(clampedX, EDGE_PAD + textWidth / 2), svgWidth - EDGE_PAD - textWidth / 2);
    }

    return (
      <text
        x={clampedX}
        y={y}
        fill={fillColor}
        textAnchor={textAnchor as "start" | "middle" | "end"}
        dominantBaseline="central"
        fontSize={10}
        fontWeight="500"
        style={{ animation: "pieLabelFadeIn 0.75s ease-out forwards" }}
      >
        <tspan x={clampedX} dy="-0.55em">{amountText}</tspan>
        <tspan x={clampedX} dy="1.1em">{percentText}</tspan>
      </text>
    );
  };
  PieCustomLabel.displayName = "PieCustomLabel";
  return PieCustomLabel;
};

type PeriodPreset = "3m" | "1y" | "year" | "all" | "custom"

function PeriodDateRow({
  label, value, display, onChange,
}: {
  label: string
  value: string
  display: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">{label}</span>
      <div className="group relative">
        <span className="text-sm font-semibold text-slate-800 dark:text-foreground tabular-nums transition-opacity group-hover:opacity-70 group-active:opacity-50">
          {display}
        </span>
        <input
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          onClick={e => {
            try { e.currentTarget.showPicker() } catch { /* 非対応、非ジェスチャ時は無視 */ }
          }}
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          style={{ fontSize: 16 }}
        />
      </div>
    </div>
  )
}

// 期間フィルターUIコンポーネント
// 上段のタブでプリセットを選択し、下段のボタンに現在の期間を常に表示
// ボタンをタップすると開始日/終了日の編集行が開閉
function PeriodFilter({
  preset, onPresetChange,
  start, end, onStartChange, onEndChange,
}: {
  preset: PeriodPreset
  onPresetChange: (p: PeriodPreset) => void
  start: string; end: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
}) {
  const { t, locale } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const formatDisplayDate = (iso: string) => {
    if (!iso) return "—"
    const [y, m, d] = iso.split("-").map(Number)
    if (locale === "en") {
      const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return `${names[m - 1]} ${d}, ${y}`
    }
    return `${y}年${m}月${d}日`
  }

  const formatSummaryDate = (iso: string) => {
    if (!iso) return "—"
    const [y, m, d] = iso.split("-").map(Number)
    return locale === "en" ? `${m}/${d}/${y}` : `${y}/${m}/${d}`
  }

  const presets: { value: PeriodPreset; label: string }[] = [
    { value: "year", label: t("stats.period_this_year") },
    { value: "3m", label: t("stats.period_3m") },
    { value: "1y", label: t("stats.period_1y") },
    { value: "all", label: t("stats.period_all") },
  ]

  // 展開エリアのアニメーション
  const EASE_APPLE = "cubic-bezier(0.32, 0.72, 0, 1)"
  // translate3d と will-change を併用することで、Safari で transform のみのアニメーションがカクつく問題を回避
  const fadeItemStyle = (index: number): CSSProperties => ({
    opacity: expanded ? 1 : 0,
    transform: expanded ? "translate3d(0, 0, 0)" : "translate3d(0, -8px, 0)",
    willChange: "opacity, transform",
    transitionProperty: "opacity, transform",
    transitionDuration: expanded ? "320ms" : "200ms",
    transitionTimingFunction: EASE_APPLE,
    transitionDelay: expanded ? `${60 + index * 45}ms` : `${(2 - index) * 30}ms`,
  })

  return (
    <div className="px-4 pb-3 pt-2">
      <div className="mb-2.5">
        <SegmentedToggle value={preset} onChange={onPresetChange} options={presets} />
      </div>

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 rounded-lg bg-slate-100 dark:bg-muted px-3 py-2.5 text-left transition-colors hover:bg-slate-200/70 dark:hover:bg-muted/70"
      >
        <CalendarDays size={14} className="shrink-0 text-slate-500 dark:text-muted-foreground" />
        <span className="text-sm font-semibold text-slate-800 dark:text-foreground tabular-nums">
          {formatSummaryDate(start)} {locale === "en" ? "–" : "〜"} {formatSummaryDate(end)}
        </span>
        <ChevronDown
          size={16}
          className="ml-auto shrink-0 text-slate-400 dark:text-muted-foreground"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: `transform 380ms ${EASE_APPLE}`,
          }}
        />
      </button>

      {/* 開始日・終了日の編集行 */}
      <div
        aria-hidden={!expanded}
        className="grid"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: `grid-template-rows 380ms ${EASE_APPLE} ${expanded ? "0ms" : "140ms"}`,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`mt-2.5 ${expanded ? "" : "pointer-events-none"}`}>
            <div className="rounded-lg bg-slate-100 dark:bg-muted px-3 divide-y divide-slate-200 dark:divide-border">
              <div style={fadeItemStyle(0)}>
                <PeriodDateRow
                  label={t("stats.start_date")}
                  value={start}
                  display={formatDisplayDate(start)}
                  onChange={onStartChange}
                />
              </div>
              <div style={fadeItemStyle(1)}>
                <PeriodDateRow
                  label={t("stats.end_date")}
                  value={end}
                  display={formatDisplayDate(end)}
                  onChange={onEndChange}
                />
              </div>
            </div>
            <p
              className="mt-2.5 flex items-center justify-end gap-1 px-1 text-[10px] text-slate-400 dark:text-muted-foreground"
              style={fadeItemStyle(2)}
            >
              <Info size={12} className="shrink-0" />
              {t("stats.period_edit_hint")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// 走行距離タブ用の統計行コンポーネント
function StatRow({
  label, value, unit,
}: {
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm font-semibold text-slate-600 dark:text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold text-slate-800 dark:text-foreground tabular-nums tracking-wide">{value}</span>
        {unit && <span className="text-sm font-bold text-slate-400 dark:text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}

export default function StatsPage() {
  const [records, setRecords] = useState<Record_[]>([])
  const [carFuelTypes, setCarFuelTypes] = useState<Map<string, string>>(new Map())
  const [totalOdo, setTotalOdo] = useState(0)
  const [loading, setLoading] = useState(true)

  // カテゴリ別グラフ用フィルター
  const [catPreset, setCatPreset] = useState<PeriodPreset>("all")
  const [catStart, setCatStart] = useState("")
  const [catEnd, setCatEnd] = useState("")

  // 月別推移グラフ
  const [monthlyChartType, setMonthlyChartType] = useState<"line" | "bar">("line")
  const [yearlyChartType, setYearlyChartType] = useState<"line" | "bar">("bar")
  const [isColorful, setIsColorful] = useState(false)

  // 円グラフアニメーション
  const [pieAnimKey, setPieAnimKey] = useState(0)
  const hasAnimatedPie = useRef(false)
  const isFirstCatFilter = useRef(true)

  // 年別推移用
  const currentYear = new Date().getFullYear()

  // 折れ線グラフの線の描画と点の出現を同期
  // タブ切替時に DOM がマウントされたタイミングで測定を発火させるため、callback ref として state を使う
  const [monthlyLineContainer, setMonthlyLineContainer] = useState<HTMLDivElement | null>(null)
  const [yearlyLineContainer, setYearlyLineContainer] = useState<HTMLDivElement | null>(null)
  const [monthlyLineReady, setMonthlyLineReady] = useState(false)
  const [yearlyLineReady, setYearlyLineReady] = useState(false)
  const LINE_ANIM_DURATION_MS = 900

  // createClient() は呼ぶたびに新しい BrowserClient を返すため、毎レンダーで supabase 参照が変わると
  // useEffect([supabase]) が毎回発火して records が再フェッチされ、メモ化したチャートデータも参照が変わってしまう
  const supabase = useMemo(() => createClient(), [])
  const { t, locale } = useTranslation()

  // 初回ローディング画面とデータ取得を連動させる
  usePageLoadingGate(!loading)

  // グリッド線、軸目盛り、円グラフの区切り線、ツールチップ背景などの構造部分だけをテーマに応じて出し分ける
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const chartChrome = useMemo(() => ({
    gridStroke: isDark ? "#334155" : "#f1f5f9",
    axisTick: isDark ? "#64748b" : "#94a3b8",
    sliceStroke: isDark ? "#18181b" : "#ffffff",
    dotStroke: isDark ? "#18181b" : "#ffffff",
    tooltipBg: isDark ? "#404040" : "#f1f5f9",
    tooltipText: isDark ? "#f5f5f5" : "#334155",
    tooltipLabel: isDark ? "#a3a3a3" : "#64748b",
    labelLineStroke: isDark ? "#475569" : "#cbd5e1",
    pieLabelFill: isDark ? "#94a3b8" : "#64748b",
    cursorFill: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
  }), [isDark])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: recordsData } = await supabase.from("records").select("*").eq("user_id", user.id)
        if (recordsData) setRecords(recordsData)
        const { data: carsData } = await supabase.from("cars").select("id, current_odo, fuel_type").eq("user_id", user.id).in("status", ["active", "archived"])
        if (carsData) {
          const maxOdo = Math.max(...carsData.map(c => c.current_odo), 0)
          setTotalOdo(maxOdo)
          const fuelTypeMap = new Map<string, string>()
          carsData.forEach((c: { id: string; fuel_type: string | null }) => {
            if (c.fuel_type) fuelTypeMap.set(c.id, c.fuel_type)
          })
          setCarFuelTypes(fuelTypeMap)
        }
      }

      // ローカルストレージからグラフの表示設定を復元
      const savedMonthly = localStorage.getItem("milenote_monthly_chart") as "line" | "bar"
      if (savedMonthly) setMonthlyChartType(savedMonthly)

      const savedYearly = localStorage.getItem("milenote_yearly_chart") as "line" | "bar"
      if (savedYearly) setYearlyChartType(savedYearly)

      const savedColorful = localStorage.getItem("milenote_colorful_pie") === "true"
      setIsColorful(savedColorful)

      setLoading(false)
    }
    fetchData()
  }, [supabase])

  // 期間プリセットから実際の開始・終了日を算出
  const toIsoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const todayStr = toIsoDate(new Date())
  const threeMonthsAgoStr = (() => {
    const now = new Date()
    return toIsoDate(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()))
  })()
  const oneYearAgoStr = (() => {
    const now = new Date()
    return toIsoDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()))
  })()
  const yearStartStr = `${currentYear}-01-01`
  // 全期間の開始日表示用
  const minRecordDate = useMemo(
    () => records.reduce((min, r) => (!min || r.date < min ? r.date : min), ""),
    [records],
  )

  // 表示用の開始・終了日
  const catDisplayStart = catPreset === "3m" ? threeMonthsAgoStr
    : catPreset === "1y" ? oneYearAgoStr
    : catPreset === "year" ? yearStartStr
    : catPreset === "all" ? minRecordDate
    : catStart
  const catDisplayEnd = catPreset === "custom" ? catEnd : todayStr

  // 絞り込み用
  const catFilterStart = catPreset === "all" ? "" : catDisplayStart
  const catFilterEnd = catPreset === "all" ? "" : catDisplayEnd

  // プリセット切替
  const selectCatPreset = (p: PeriodPreset) => {
    if (p === "custom" && catPreset !== "custom") {
      setCatStart(catDisplayStart)
      setCatEnd(catDisplayEnd)
    }
    setCatPreset(p)
  }

  // 日付を直接変更したら期間を指定に切り替え
  const changeCatStart = (v: string) => {
    if (catPreset !== "custom") {
      setCatEnd(catDisplayEnd)
      setCatPreset("custom")
    }
    setCatStart(v)
  }
  const changeCatEnd = (v: string) => {
    if (catPreset !== "custom") {
      setCatStart(catDisplayStart)
      setCatPreset("custom")
    }
    setCatEnd(v)
  }

  // データフィルタリング処理
  const catFilteredRecords = records.filter(r => {
    if (catFilterStart && r.date < catFilterStart) return false
    if (catFilterEnd && r.date > catFilterEnd) return false
    return true
  })

  // グラフ切り替え処理
  const selectMonthlyChart = (type: "line" | "bar") => {
    setMonthlyChartType(type)
    localStorage.setItem("milenote_monthly_chart", type)
  }

  const selectYearlyChart = (type: "line" | "bar") => {
    setYearlyChartType(type)
    localStorage.setItem("milenote_yearly_chart", type)
  }

  // データ集計処理
  const activeCategoryMap = isColorful ? CATEGORY_MAP_COLORFUL : CATEGORY_MAP_BLUE
  const categoryData = catFilteredRecords.reduce((acc: { name: string; value: number; fill: string }[], curr) => {
    const config = activeCategoryMap[curr.category] || activeCategoryMap.other
    const label = t(`categories.${curr.category}`)
    const found = acc.find(a => a.name === label)
    if (found) found.value += curr.amount
    else acc.push({ name: label, value: curr.amount, fill: config.color })
    return acc
  }, [])

  const totalAmount = catFilteredRecords.reduce((sum, r) => sum + r.amount, 0)

  // 初回データロード時にアニメーション
  useEffect(() => {
    if (categoryData.length > 0 && !hasAnimatedPie.current) {
      hasAnimatedPie.current = true
      setPieAnimKey(k => k + 1)
    }
  }, [categoryData.length])

  // 期間フィルター変更時にアニメーション（初回マウント時はスキップ）
  useEffect(() => {
    if (isFirstCatFilter.current) { isFirstCatFilter.current = false; return }
    setPieAnimKey(k => k + 1)
  }, [catFilterStart, catFilterEnd])

  // 折れ線グラフの実パス長を測定して CSS 変数に反映し、線と点のアニメーションを同期させる
  // 初期マウント時に該当タブが非アクティブで DOM が無いケースに対応するため、container を state で受けてアタッチされたタイミングで測定する
  useEffect(() => {
    setMonthlyLineReady(false)
    const container = monthlyLineContainer
    if (!container) return
    let raf = 0
    let attempts = 0
    const measure = () => {
      const path = container.querySelector(".recharts-line-curve") as SVGPathElement | null
      if (path) {
        const len = path.getTotalLength()
        if (len > 0) {
          container.style.setProperty("--line-length", `${len}`)
          setMonthlyLineReady(true)
          return
        }
      }
      if (attempts++ < 30) raf = requestAnimationFrame(measure)
    }
    raf = requestAnimationFrame(measure)
    return () => { if (raf) cancelAnimationFrame(raf) }
  }, [monthlyLineContainer])

  useEffect(() => {
    setYearlyLineReady(false)
    const container = yearlyLineContainer
    if (!container) return
    let raf = 0
    let attempts = 0
    const measure = () => {
      const path = container.querySelector(".recharts-line-curve") as SVGPathElement | null
      if (path) {
        const len = path.getTotalLength()
        if (len > 0) {
          container.style.setProperty("--line-length", `${len}`)
          setYearlyLineReady(true)
          return
        }
      }
      if (attempts++ < 30) raf = requestAnimationFrame(measure)
    }
    raf = requestAnimationFrame(measure)
    return () => { if (raf) cancelAnimationFrame(raf) }
  }, [yearlyLineContainer])

  // 直近6か月の枠を常に生成してから集計（記録が無い月も枠を表示する）
  type MonthlyBucket = { month: string; amount: number } & Record<CategoryKey, number>
  const monthlyData = useMemo<MonthlyBucket[]>(() => {
    const now = new Date()
    const months: MonthlyBucket[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      return { month, amount: 0, ...buildEmptyCategoryBuckets() }
    })
    records.forEach(r => {
      const found = months.find(m => m.month === r.date.substring(0, 7))
      if (!found) return
      const cat = normalizeCategoryKey(r.category)
      found[cat] += r.amount
      found.amount += r.amount
    })
    return months
  }, [records])

  const monthlyCategoriesPresent = useMemo<CategoryKey[]>(
    () => CATEGORY_KEYS.filter(cat => monthlyData.some(d => d[cat] > 0)),
    [monthlyData],
  )

  // 各行で実際にスタックの最上段になるカテゴリを記録（角丸描画のため）
  const monthlyTopByRow = useMemo(() => {
    const map = new Map<string, CategoryKey>()
    monthlyData.forEach(row => {
      let top: CategoryKey | null = null
      CATEGORY_KEYS.forEach(cat => { if (row[cat] > 0) top = cat })
      if (top) map.set(row.month, top)
    })
    return map
  }, [monthlyData])

  // 直近3年（今年を含む過去3年）の枠を生成してから集計
  type YearlyBucket = { year: number; amount: number; hasData: boolean } & Record<CategoryKey, number>
  const yearlyData = useMemo<YearlyBucket[]>(() => {
    const years: YearlyBucket[] = Array.from({ length: 3 }, (_, i) => ({
      year: currentYear - (2 - i),
      amount: 0,
      hasData: false,
      ...buildEmptyCategoryBuckets(),
    }))
    records.forEach(r => {
      const year = parseInt(r.date.substring(0, 4), 10)
      const found = years.find(y => y.year === year)
      if (!found) return
      const cat = normalizeCategoryKey(r.category)
      found[cat] += r.amount
      found.amount += r.amount
      found.hasData = true
    })
    return years
  }, [records, currentYear])

  const yearlyCategoriesPresent = useMemo<CategoryKey[]>(
    () => CATEGORY_KEYS.filter(cat => yearlyData.some(d => d[cat] > 0)),
    [yearlyData],
  )

  const yearlyTopByRow = useMemo(() => {
    const map = new Map<string, CategoryKey>()
    yearlyData.forEach(row => {
      let top: CategoryKey | null = null
      CATEGORY_KEYS.forEach(cat => { if (row[cat] > 0) top = cat })
      if (top) map.set(String(row.year), top)
    })
    return map
  }, [yearlyData])

  // 新しい年が上、前年比（増減額）を付与
  const yearlyTableRows = useMemo(
    () => yearlyData
      .map((d, i) => ({
        year: d.year,
        amount: d.amount,
        hasData: d.hasData,
        diff: i > 0 ? d.amount - yearlyData[i - 1].amount : null,
      }))
      .reverse(),
    [yearlyData],
  )

  // グラフ再アニメーション用のキー（グラフ種別、データ量が変わるたびに再マウントしてCSSアニメを発火させる）
  const monthlyAnimKey = `${monthlyChartType}|${monthlyData.length}`
  const yearlyAnimKey = `${yearlyChartType}|${yearlyCategoriesPresent.length}`

  // 走行距離スケール計算処理
  const earthCircumference = 40075
  const distanceToMoon = 384400
  const earthRounds = (totalOdo / earthCircumference).toFixed(2)
  const moonPercent = Math.min(((totalOdo / distanceToMoon) * 100), 100).toFixed(1)
  const remainingMoonDist = Math.max(distanceToMoon - totalOdo, 0)

  // 給油系統計（EV車の充電記録は別集計するためここでは除外）
  const isEvRecord = (r: Record_) => (r.car_id ? carFuelTypes.get(r.car_id) : null) === "ev"
  const fuelRecords = records.filter(r => r.category === "fuel" && !isEvRecord(r))
  const totalFuelAmount = fuelRecords.reduce((sum, r) => {
    const liters = r.fuel_amount ? parseFloat(String(r.fuel_amount)) : 0
    return sum + (isNaN(liters) ? 0 : liters)
  }, 0)
  const fuelCount = fuelRecords.length
  const totalFuelCost = fuelRecords.reduce((sum, r) => sum + r.amount, 0)
  const avgUnitPrice = totalFuelAmount > 0 ? totalFuelCost / totalFuelAmount : 0
  const co2Emission = fuelRecords.reduce((sum, r) => {
    const liters = r.fuel_amount ? parseFloat(String(r.fuel_amount)) : 0
    if (isNaN(liters)) return sum
    const fuelType = r.car_id ? carFuelTypes.get(r.car_id) : null
    const coefficient = fuelType && fuelType in CO2_COEFFICIENT
      ? CO2_COEFFICIENT[fuelType]
      : CO2_COEFFICIENT_DEFAULT
    return sum + liters * coefficient
  }, 0)

  // EV充電系統計（EV車の給油カテゴリ記録を kWh 建てで集計）
  const chargeRecords = records.filter(r => r.category === "fuel" && isEvRecord(r))
  const totalChargeAmount = chargeRecords.reduce((sum, r) => {
    const kwh = r.fuel_amount ? parseFloat(String(r.fuel_amount)) : 0
    return sum + (isNaN(kwh) ? 0 : kwh)
  }, 0)
  const chargeCount = chargeRecords.length
  const totalChargeCost = chargeRecords.reduce((sum, r) => sum + r.amount, 0)
  const avgChargeUnitPrice = totalChargeAmount > 0 ? totalChargeCost / totalChargeAmount : 0

  // Recharts の <XAxis>/<YAxis>/<Tooltip> 等は内部で memo 比較しており、tickFormatter / formatter の参照が
  // 毎レンダーで変わると axis 設定が replaceXAxis として Redux に再 dispatch され、folded line の points 参照が
  // 変わり useAnimationId が再発行 → JavascriptAnimate が remount → CSS lineDraw が再生されてしまう。
  // そのため useCallback で安定化させる。
  // ロケール対応の月フォーマッター
  const monthFormatter = useCallback((v: string) => {
    const monthNum = parseInt(v.split('-')[1], 10)
    if (locale === "en") {
      const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return names[monthNum - 1]
    }
    return `${monthNum}月`
  }, [locale])

  // 年別推移の年フォーマッター（軸は数値のみ、Tooltipはロケールに応じて年表記）
  const yearFormatter = useCallback((y: number) => String(y), [])

  // Recharts のコールバック型（PieLabelRenderProps / Formatter / LabelFormatter 等）は
  // 省略可能フィールドを含む複雑な union のため、本ファイル内では any を許容する
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const numberTickFormatter = useCallback((v: any) => Number(v).toLocaleString(), [])
  const expenditureTooltipFormatter = useCallback((value: any): [string, string] => [
    `¥${Number(value).toLocaleString()}`,
    t("stats.expenditure"),
  ], [t])
  const yearTooltipLabelFormatter = useCallback(
    (label: any) => (locale === "en" ? String(label) : `${label}年`),
    [locale],
  )
  const monthlyTooltipLabelFormatter = useCallback((label: any) => {
    const [year, month] = String(label).split("-")
    const monthNum = parseInt(month, 10)
    if (locale === "en") {
      const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return `${names[monthNum - 1]} ${year}`
    }
    return `${year}年${monthNum}月`
  }, [locale])
  // 凡例ラベルの整形（カテゴリキーを翻訳して表示）
  const renderCategoryLegendLabel = useCallback((value: string) => (
    <span className="text-xs font-bold text-slate-600 dark:text-muted-foreground">{t(`categories.${value}`)}</span>
  ), [t])
  // 凡例ラベルの整形
  const renderRawLegendLabel = useCallback((value: string) => (
    <span className="text-xs font-bold text-slate-600 dark:text-muted-foreground">{value}</span>
  ), [])
  // 凡例を列揃えのグリッドで描画し、ブロック全体を中央寄せする
  // formatLabel でラベルの整形方法を切り替える
  const renderGridLegend = useCallback(
    (formatLabel: (value: string) => ReactElement) => {
      const GridLegend = ({ payload }: { payload?: readonly { value?: string | number; color?: string }[] }) => (
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(70px, max-content))',
            justifyContent: 'center',
            gap: '8px 20px',
            listStyle: 'none',
            margin: 0,
            padding: '20px 16px 12px',
          }}
        >
          {payload?.map((entry, index) => (
            <li key={`legend-${index}`} className="flex items-center gap-1.5">
              <span
                className="inline-block shrink-0 rounded-full"
                style={{ width: 8, height: 8, backgroundColor: entry.color }}
              />
              {formatLabel(String(entry.value))}
            </li>
          ))}
        </ul>
      )
      return GridLegend
    },
    [],
  )
  // 積み上げ棒グラフの詳細ポップアップ
  // 0円の項目を除外して高さを抑える
  const renderStackedBarTooltip = useCallback(
    (labelFormatter: (label: string) => string) => {
      const StackedBarTooltip = ({ active, payload, label }: TooltipContentProps) => {
        if (!active || !payload) return null
        const items = payload.filter((entry) => Number(entry.value) > 0)
        return (
          <div
            style={{
              background: chartChrome.tooltipBg,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '10px 14px',
            }}
          >
            <p className="mb-1.5 text-xs font-bold text-slate-500 dark:text-muted-foreground">{labelFormatter(String(label))}</p>
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-muted-foreground">{t("stats.no_data")}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {items.map((entry, index) => (
                  <li key={`tooltip-item-${index}`} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="inline-block shrink-0 rounded-full"
                      style={{ width: 6, height: 6, backgroundColor: entry.color }}
                    />
                    <span className="text-slate-500 dark:text-muted-foreground">{t(`categories.${String(entry.dataKey)}`)}</span>
                    <span className="ml-auto font-bold text-slate-700 dark:text-foreground">¥{Number(entry.value).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      }
      return StackedBarTooltip
    },
    [t, chartChrome.tooltipBg],
  )
  // 折れ線グラフのドット描画（線の進行に合わせて各点をフェードイン）
  // dot prop の参照が毎レンダーで変わると Recharts が内部で要素を作り直しアニメーションが再生されるため、useMemo で安定化する
  const yearlyLastValidIndex = useMemo(
    () => yearlyData.reduce((acc, d, i) => (d.amount != null ? i : acc), -1),
    [yearlyData],
  )
  const monthlyLineDot = useMemo(() => {
    const totalLastIndex = monthlyData.length - 1
    const LineDot = (props: any) => {
      const { cx, cy, index, value } = props
      if (cx == null || cy == null || value == null) {
        return <g key={`line-dot-${index}`} />
      }
      const denom = Math.max(totalLastIndex, 1)
      const delay = (Math.min(index, totalLastIndex) / denom) * LINE_ANIM_DURATION_MS
      return (
        <circle
          key={`line-dot-${index}`}
          cx={cx}
          cy={cy}
          r={4}
          fill="#3b82f6"
          stroke={chartChrome.dotStroke}
          strokeWidth={2}
          className="line-dot-anim"
          style={{ animationDelay: `${delay}ms` }}
        />
      )
    }
    LineDot.displayName = "LineDot"
    return LineDot
  }, [monthlyData.length, chartChrome.dotStroke])
  const yearlyLineDot = useMemo(() => {
    const totalLastIndex = yearlyLastValidIndex
    const LineDot = (props: any) => {
      const { cx, cy, index, value } = props
      if (cx == null || cy == null || value == null) {
        return <g key={`line-dot-${index}`} />
      }
      const denom = Math.max(totalLastIndex, 1)
      const delay = (Math.min(index, totalLastIndex) / denom) * LINE_ANIM_DURATION_MS
      return (
        <circle
          key={`line-dot-${index}`}
          cx={cx}
          cy={cy}
          r={4}
          fill="#3b82f6"
          stroke={chartChrome.dotStroke}
          strokeWidth={2}
          className="line-dot-anim"
          style={{ animationDelay: `${delay}ms` }}
        />
      )
    }
    LineDot.displayName = "LineDot"
    return LineDot
  }, [yearlyLastValidIndex, chartChrome.dotStroke])

  const makeStackedBarShape = (
    cat: CategoryKey,
    topByRow: Map<string, CategoryKey>,
    getKey: (payload: any) => string,
  ) => {
    const StackedBarShape = (props: any) => {
      const { x, y, width, height, fill, payload } = props
      if (!width || width <= 0 || !height || height <= 0) return <g />
      const isTop = topByRow.get(getKey(payload)) === cat
      if (!isTop) {
        return <rect x={x} y={y} width={width} height={height} fill={fill} />
      }
      const r = Math.min(4, height, width / 2)
      const path = `M${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} L${x},${y + height} Z`
      return <path d={path} fill={fill} />
    }
    StackedBarShape.displayName = "StackedBarShape"
    return StackedBarShape
  }
  // shape prop の参照を毎レンダーで作り直すと、Recharts が同じ Bar を別物として扱い、もう一方のグラフの shape も含めて再生成されてしまうため per-category で memo 化する
  const monthlyBarShapes = useMemo(() => {
    const shapes: Partial<Record<CategoryKey, ReturnType<typeof makeStackedBarShape>>> = {}
    monthlyCategoriesPresent.forEach(cat => {
      shapes[cat] = makeStackedBarShape(cat, monthlyTopByRow, (p: { month: string }) => p.month)
    })
    return shapes
  }, [monthlyCategoriesPresent, monthlyTopByRow])
  const yearlyBarShapes = useMemo(() => {
    const shapes: Partial<Record<CategoryKey, ReturnType<typeof makeStackedBarShape>>> = {}
    yearlyCategoriesPresent.forEach(cat => {
      shapes[cat] = makeStackedBarShape(cat, yearlyTopByRow, (p: { year: number }) => String(p.year))
    })
    return shapes
  }, [yearlyCategoriesPresent, yearlyTopByRow])
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // ローディング状態の表示（タイトルは即時表示し、コンテンツのみスケルトン）
  if (loading) return (
    <main className="p-4 space-y-6 max-w-5xl mx-auto">
      <header className="pt-4 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">{t("stats.title")}</h1>
        <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground tracking-wider mt-1">{t("stats.subtitle")}</p>
      </header>
      <SkeletonTabs />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-card rounded-xl shadow-sm dark:border dark:border-border p-4 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ))}
      </div>
    </main>
  )

  return (
    <main className="p-4 space-y-6 max-w-5xl mx-auto pb-20">
      <header className="pt-4 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">{t("stats.title")}</h1>
        <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground tracking-wider mt-1">{t("stats.subtitle")}</p>
      </header>

      <Tabs defaultValue="cost" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="cost" className="font-bold">
            <BarChart3 size={14} className="mr-1.5" />
            {t("stats.tab_cost")}
          </TabsTrigger>
          <TabsTrigger value="distance" className="font-bold">
            <Globe size={14} className="mr-1.5" />
            {t("stats.tab_distance")}
          </TabsTrigger>
        </TabsList>

        {/* 走行距離タブ */}
        <TabsContent value="distance" className="space-y-6 outline-none">

          {/* ヒーローバナー：地球周、月進捗 */}
          <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-card">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-11 md:gap-8">
                {/* 地球周セクション */}
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <Globe className="text-blue-500 w-10 h-10" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-foreground tracking-wide tabular-nums">
                      {t("stats.earth_rounds", { rounds: earthRounds })}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-muted-foreground mt-1 font-medium tracking-wide">
                      {t("stats.total_odo")}: <span className="font-bold text-slate-700 dark:text-foreground tabular-nums">{totalOdo.toLocaleString()}</span> {t("stats.unit_km")}
                    </p>
                  </div>
                </div>

                {/* 月進捗セクション */}
                <div className="space-y-3 md:border-l md:border-slate-100 dark:border-border md:pl-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon className="text-yellow-500 w-5 h-5" />
                      <span className="font-bold text-slate-700 dark:text-foreground text-sm">{t("stats.moon_progress")}</span>
                    </div>
                    <span className="text-sm font-black text-slate-800 dark:text-foreground tabular-nums">{moonPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-surface-3 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      style={{ width: `${moonPercent}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-center text-slate-500 dark:text-muted-foreground font-medium">
                    {t("stats.moon_remaining", { distance: remainingMoonDist.toLocaleString() })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 給油サマリーカード */}
          <Card className="border-none shadow-sm bg-white dark:bg-card">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600 dark:text-muted-foreground">
                <Fuel size={16} /> {t("stats.fuel_summary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="divide-y divide-slate-100 dark:divide-border">
                <StatRow
                  label={t("stats.total_fuel")}
                  value={totalFuelAmount.toFixed(1)}
                  unit={t("stats.unit_liter")}
                />
                <StatRow
                  label={t("stats.fuel_count")}
                  value={fuelCount.toLocaleString()}
                  unit={t("stats.unit_count_times")}
                />
                <StatRow
                  label={t("stats.total_fuel_cost")}
                  value={`¥${totalFuelCost.toLocaleString()}`}
                  unit=""
                />
                <StatRow
                  label={t("stats.avg_unit_price")}
                  value={Math.round(avgUnitPrice).toLocaleString()}
                  unit={t("stats.unit_yen_per_liter")}
                />
              </div>
              {/* CO₂セクション */}
              <div className="mt-2 pt-1 border-t-2 border-slate-100 dark:border-border">
                <StatRow
                  label={t("stats.co2_emission")}
                  value={Math.round(co2Emission).toLocaleString()}
                  unit={t("stats.unit_kg")}
                />
                <p className="text-[10px] text-slate-400 dark:text-muted-foreground">{t("stats.co2_note")}</p>
              </div>
            </CardContent>
          </Card>

          {/* 充電サマリーカード（EV車の充電記録がある場合のみ表示） */}
          {chargeCount > 0 && (
            <Card className="border-none shadow-sm bg-white dark:bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600 dark:text-muted-foreground">
                  <BatteryCharging size={16} /> {t("stats.charge_summary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="divide-y divide-slate-100 dark:divide-border">
                  <StatRow
                    label={t("stats.total_charge")}
                    value={totalChargeAmount.toFixed(1)}
                    unit={t("stats.unit_kwh")}
                  />
                  <StatRow
                    label={t("stats.charge_count")}
                    value={chargeCount.toLocaleString()}
                    unit={t("stats.unit_count_times")}
                  />
                  <StatRow
                    label={t("stats.total_charge_cost")}
                    value={`¥${totalChargeCost.toLocaleString()}`}
                    unit=""
                  />
                  <StatRow
                    label={t("stats.avg_charge_unit_price")}
                    value={Math.round(avgChargeUnitPrice).toLocaleString()}
                    unit={t("stats.unit_yen_per_kwh")}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 費用分析タブ */}
        <TabsContent value="cost" className="space-y-6 outline-none">
          <style>{`
            @keyframes barStackRise {
              from { transform: scaleY(0); opacity: 0; }
              to   { transform: scaleY(1); opacity: 1; }
            }
            .bar-anim .recharts-bar {
              transform-box: fill-box;
              transform-origin: bottom;
              animation: barStackRise 0.6s cubic-bezier(0.33, 1, 0.68, 1) backwards;
            }
            .bar-anim .recharts-bar:nth-of-type(1) { animation-delay: 0ms; }
            .bar-anim .recharts-bar:nth-of-type(2) { animation-delay: 90ms; }
            .bar-anim .recharts-bar:nth-of-type(3) { animation-delay: 180ms; }
            .bar-anim .recharts-bar:nth-of-type(4) { animation-delay: 270ms; }
            .bar-anim .recharts-bar:nth-of-type(5) { animation-delay: 360ms; }
            .bar-anim .recharts-bar:nth-of-type(6) { animation-delay: 450ms; }
            .bar-anim .recharts-bar:nth-of-type(7) { animation-delay: 540ms; }
            .bar-anim .recharts-legend-wrapper {
              animation: chartFadeIn 0.5s ease-out 0.4s backwards;
            }
            @keyframes chartFadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes lineDraw {
              to { stroke-dashoffset: 0; }
            }
            @keyframes dotFadeIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            .line-anim .recharts-line-curve {
              stroke-dasharray: var(--line-length, 9999);
              stroke-dashoffset: var(--line-length, 9999);
            }
            .line-anim.line-ready .recharts-line-curve {
              animation: lineDraw 0.9s linear forwards;
            }
            .line-anim .line-dot-anim {
              opacity: 0;
            }
            .line-anim.line-ready .line-dot-anim {
              animation: dotFadeIn 0.2s ease-out forwards;
            }
          `}</style>

          {/* グラフセクション */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* カテゴリ別内訳 */}
            <Card className="border-none shadow-sm bg-white dark:bg-card">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600 dark:text-muted-foreground">
                  <PieIcon size={16} /> {t("stats.category_breakdown")}
                </CardTitle>
              </CardHeader>
              <PeriodFilter
                preset={catPreset}
                onPresetChange={selectCatPreset}
                start={catDisplayStart} end={catDisplayEnd}
                onStartChange={changeCatStart} onEndChange={changeCatEnd}
              />
              <CardContent className="h-80 p-0">
                {categoryData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-muted-foreground gap-2">
                    <PieIcon size={40} strokeWidth={1.5} />
                    <p className="text-sm font-medium">{t("stats.no_data")}</p>
                  </div>
                ) : (
                  <>
                    <style>{`
                      @keyframes pieRotateIn {
                        from { transform: rotate(-180deg); opacity: 0; }
                        to   { transform: rotate(0deg);   opacity: 1; }
                      }
                      @keyframes pieLabelFadeIn {
                        0%,  40% { opacity: 0; }
                        100%     { opacity: 1; }
                      }
                      .pie-anim .recharts-layer.recharts-pie {
                        transform-box: fill-box;
                        transform-origin: center;
                        animation: pieRotateIn 0.75s cubic-bezier(0.33, 1, 0.68, 1) forwards;
                      }
                      .pie-anim .recharts-label-list text,
                      .pie-anim .recharts-layer.recharts-label text,
                      .pie-anim .recharts-label-list line,
                      .pie-anim .recharts-pie-label-line,
                      .pie-anim .recharts-pie-label-line path {
                        animation: pieLabelFadeIn 0.75s ease-out forwards;
                      }
                    `}</style>
                    <div key={pieAnimKey} className="pie-anim" style={{ width: "100%", height: "100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryData} cx="50%" cy="45%" innerRadius={60} outerRadius={80} dataKey="value" stroke={chartChrome.sliceStroke} strokeWidth={2} strokeLinejoin="round" isAnimationActive={false} label={createCustomizedLabel(t, locale, chartChrome.pieLabelFill)} labelLine={{ stroke: chartChrome.labelLineStroke, strokeWidth: 1 }}>
                            {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                            <Label value={`¥${totalAmount.toLocaleString()}`} position="center" dy={-8} className="text-base font-black fill-slate-800 dark:fill-foreground" />
                            <Label value={t("stats.total")} position="center" dy={8} className="text-[10px] font-bold fill-slate-400 dark:fill-muted-foreground" />
                          </Pie>
                          {/* Recharts のコールバック型が複雑なため any を許容 */}
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: chartChrome.tooltipBg }} itemStyle={{ color: chartChrome.tooltipText }} formatter={(value: any, name: any) => [`¥${Number(value).toLocaleString()}`, String(name)]} />
                          <Legend verticalAlign="bottom" content={renderGridLegend(renderRawLegendLabel)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 月別出費推移 */}
            <Card className="border-none shadow-sm bg-white dark:bg-card">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600 dark:text-muted-foreground">
                  <BarChart3 size={16} /> {t("stats.monthly_trend")}
                </CardTitle>
                <SegmentedToggle
                  value={monthlyChartType}
                  onChange={selectMonthlyChart}
                  options={[
                    { value: "line", label: t("stats.chart_line"), icon: <LineChartIcon size={14} /> },
                    { value: "bar", label: t("stats.chart_bar"), icon: <BarChart3 size={14} /> },
                  ]}
                />
              </CardHeader>
              <CardContent className="h-80 p-4 pt-0">
                {records.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-muted-foreground gap-2">
                    <BarChart3 size={40} strokeWidth={1.5} />
                    <p className="text-sm font-medium">{t("stats.no_data")}</p>
                  </div>
                ) : (
                <div
                  key={monthlyAnimKey}
                  ref={monthlyChartType === "line" ? setMonthlyLineContainer : null}
                  className={`${monthlyChartType === "bar" ? "bar-anim" : "line-anim"}${monthlyChartType === "line" && monthlyLineReady ? " line-ready" : ""}`}
                  style={{ width: "100%", height: "100%" }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    {monthlyChartType === "line" ? (
                      <LineChart data={monthlyData} margin={{ top: 40, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartChrome.gridStroke} />
                        <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} dy={10} tick={{ fill: chartChrome.axisTick }} tickFormatter={monthFormatter} padding={{ left: 30, right: 30 }} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: chartChrome.axisTick }} width={65} domain={[0, 'auto']} tickFormatter={numberTickFormatter} />
                        <Tooltip cursor={{ stroke: chartChrome.gridStroke }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: chartChrome.tooltipBg }} itemStyle={{ color: chartChrome.tooltipText }} labelStyle={{ color: chartChrome.tooltipLabel }} formatter={expenditureTooltipFormatter} labelFormatter={monthlyTooltipLabelFormatter} />
                        <Line type="linear" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={monthlyLineDot} isAnimationActive={false} />
                      </LineChart>
                    ) : (
                      <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 10, bottom: 4 }} barCategoryGap="30%" maxBarSize={56}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartChrome.gridStroke} />
                        <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} dy={10} tick={{ fill: chartChrome.axisTick }} tickFormatter={monthFormatter} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: chartChrome.axisTick }} width={65} tickFormatter={numberTickFormatter} />
                        <Tooltip cursor={{ fill: chartChrome.cursorFill }} content={renderStackedBarTooltip(monthlyTooltipLabelFormatter)} />
                        <Legend verticalAlign="bottom" content={renderGridLegend(renderCategoryLegendLabel)} />
                        {monthlyCategoriesPresent.map((cat) => (
                          <Bar
                            key={cat}
                            dataKey={cat}
                            stackId="a"
                            fill={activeCategoryMap[cat].color}
                            shape={monthlyBarShapes[cat]}
                            isAnimationActive={false}
                          />
                        ))}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 年別推移セクション */}
          <Card className="border-none shadow-sm bg-white dark:bg-card">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600 dark:text-muted-foreground">
                  <CalendarDays size={16} /> {t("stats.yearly_trend")}
                </CardTitle>
                {/* グラフ切り替えボタン */}
                <SegmentedToggle
                  value={yearlyChartType}
                  onChange={selectYearlyChart}
                  options={[
                    { value: "line", label: t("stats.chart_line"), icon: <LineChartIcon size={14} /> },
                    { value: "bar", label: t("stats.chart_bar"), icon: <BarChart3 size={14} /> },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-4 pt-0 lg:flex lg:items-center lg:gap-10 lg:px-6">
              {records.length === 0 ? (
                <div className="h-64 w-full flex flex-col items-center justify-center text-slate-300 dark:text-muted-foreground gap-2">
                  <CalendarDays size={40} strokeWidth={1.5} />
                  <p className="text-sm font-medium">{t("stats.no_data")}</p>
                </div>
              ) : (
              <>
              {/* グラフ */}
              <div
                key={yearlyAnimKey}
                ref={yearlyChartType === "line" ? setYearlyLineContainer : null}
                className={`h-64 w-full lg:flex-1 lg:min-w-0 ${yearlyChartType === "bar" ? "bar-anim" : "line-anim"}${yearlyChartType === "line" && yearlyLineReady ? " line-ready" : ""}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {yearlyChartType === "line" ? (
                    <LineChart data={yearlyData} margin={{ top: 40, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartChrome.gridStroke} />
                      <XAxis dataKey="year" fontSize={10} axisLine={false} tickLine={false} dy={10} tick={{ fill: chartChrome.axisTick }} tickFormatter={yearFormatter} padding={{ left: 30, right: 30 }} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: chartChrome.axisTick }} width={65} domain={[0, 'auto']} tickFormatter={numberTickFormatter} />
                      <Tooltip cursor={{ stroke: chartChrome.gridStroke }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: chartChrome.tooltipBg }} itemStyle={{ color: chartChrome.tooltipText }} labelStyle={{ color: chartChrome.tooltipLabel }} formatter={expenditureTooltipFormatter} labelFormatter={yearTooltipLabelFormatter} />
                      <Line type="linear" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={yearlyLineDot} isAnimationActive={false} />
                    </LineChart>
                  ) : (
                    <BarChart data={yearlyData} margin={{ top: 20, right: 30, left: 10, bottom: 4 }} barCategoryGap="30%" maxBarSize={56}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartChrome.gridStroke} />
                      <XAxis dataKey="year" fontSize={10} axisLine={false} tickLine={false} dy={10} tick={{ fill: chartChrome.axisTick }} tickFormatter={yearFormatter} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: chartChrome.axisTick }} width={65} tickFormatter={numberTickFormatter} />
                      <Tooltip cursor={{ fill: chartChrome.cursorFill }} content={renderStackedBarTooltip(yearTooltipLabelFormatter)} />
                      <Legend verticalAlign="bottom" content={renderGridLegend(renderCategoryLegendLabel)} />
                      {yearlyCategoriesPresent.map((cat) => (
                        <Bar
                          key={cat}
                          dataKey={cat}
                          stackId="a"
                          fill={activeCategoryMap[cat].color}
                          shape={yearlyBarShapes[cat]}
                          isAnimationActive={false}
                        />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              {/* テーブル */}
              <div className="mt-4 px-2 lg:mt-0 lg:w-[40%] lg:shrink-0 lg:pl-0 lg:pr-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-border text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">
                      <th className="pb-2.5 pr-3 text-left font-semibold">{t("stats.col_year")}</th>
                      <th className="pb-2.5 px-3 text-right font-semibold">{t("stats.total")}</th>
                      <th className="pb-2.5 pl-3 text-right font-semibold">{t("stats.col_yoy")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-border">
                    {yearlyTableRows.map(row => (
                      <tr key={row.year}>
                        <td className="py-4 pr-3 text-[15px] font-bold text-slate-700 dark:text-foreground tabular-nums">
                          {locale === "en" ? row.year : `${row.year}年`}
                        </td>
                        {row.hasData ? (
                          <>
                            <td className="py-4 px-3 text-right text-sm font-bold text-slate-800 dark:text-foreground tabular-nums">
                              ¥{row.amount.toLocaleString()}
                            </td>
                            <td className="py-4 pl-3 text-right text-xs tabular-nums">
                              {row.diff === null ? (
                                <span className="text-slate-300 dark:text-muted-foreground">—</span>
                              ) : row.diff > 0 ? (
                                <span className="font-semibold text-rose-500">+¥{row.diff.toLocaleString()}</span>
                              ) : row.diff < 0 ? (
                                <span className="font-semibold text-emerald-500">-¥{Math.abs(row.diff).toLocaleString()}</span>
                              ) : (
                                <span className="text-slate-400 dark:text-muted-foreground">±¥0</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <td colSpan={2} className="py-4 pl-3 text-right text-xs text-slate-400 dark:text-muted-foreground">
                            {t("stats.no_data")}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
              )}
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>

    </main>
  )
}
