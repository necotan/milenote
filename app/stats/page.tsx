"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/utils/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PieChart, Pie, Cell, ResponsiveContainer, Label, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar
} from "recharts"
import { Globe, Moon, PieChart as PieIcon, BarChart3, ChevronLeft, ChevronRight, CalendarDays, RotateCcw, LineChart as LineChartIcon, Palette, Fuel, Hash, Receipt, TrendingUp, Leaf, Droplet } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

const CATEGORY_MAP_COLORFUL: Record<string, { color: string }> = {
  fuel: { color: "#3b82f6" },
  maintenance: { color: "#f97316" },
  custom: { color: "#a855f7" },
  highway: { color: "#6366f1" },
  tax: { color: "#ef4444" },
  insurance: { color: "#22c55e" },
  other: { color: "#64748b" },
}

const CATEGORY_MAP_BLUE: Record<string, { color: string }> = {
  fuel: { color: "#0ea5e9" },
  maintenance: { color: "#2563eb" },
  custom: { color: "#6366f1" },
  highway: { color: "#38bdf8" },
  tax: { color: "#1e3a8a" },
  insurance: { color: "#818cf8" },
  other: { color: "#cbd5e1" },
}

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
  "レギュラー": 2.32,
  "ハイオク": 2.32,
  "軽油": 2.62,
  "EV": 0,
  "その他": 2.32,
}
const CO2_COEFFICIENT_DEFAULT = 2.32

const createCustomizedLabel = (t: (key: string, params?: Record<string, string | number>) => string, locale: string) => {
  // Recharts の PieLabel 型は省略可能フィールドを含む複雑な union のため any を許容
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PieCustomLabel = (props: any) => {
    const { x, y, percent, value, textAnchor } = props;

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

    return (
      <text
        x={x}
        y={y}
        fill="#64748b"
        textAnchor={textAnchor as "start" | "middle" | "end"}
        dominantBaseline="central"
        fontSize={10}
        fontWeight="500"
        style={{ animation: "pieLabelFadeIn 0.75s ease-out forwards" }}
      >
        {`${formatValue(value)} (${(percent * 100).toFixed(1)}%)`}
      </text>
    );
  };
  PieCustomLabel.displayName = "PieCustomLabel";
  return PieCustomLabel;
};

// 期間フィルターUIコンポーネント
function PeriodFilter({
  start, end,
  onStartChange, onEndChange, onReset,
  labelFrom, labelTo, labelReset,
}: {
  start: string; end: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  onReset: () => void
  labelFrom: string; labelTo: string; labelReset: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 text-slate-500">
          <CalendarDays size={14} />
          <span className="text-xs font-semibold">{labelFrom}</span>
        </div>
        <input
          type="date"
          value={start}
          onChange={e => onStartChange(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all w-[110px]"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-slate-300 text-xs">—</span>
        <span className="text-xs font-semibold text-slate-500">{labelTo}</span>
        <input
          type="date"
          value={end}
          onChange={e => onEndChange(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 transition-all w-[110px]"
        />
      </div>

      {(start || end) && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-50 ml-auto"
        >
          <RotateCcw size={12} />
          {labelReset}
        </button>
      )}
    </div>
  )
}

// 走行距離タブ用の統計行コンポーネント
function StatRow({
  icon: Icon, iconColor, label, value, unit,
}: {
  icon: typeof Fuel
  iconColor: string
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2">
        <Icon size={16} className={iconColor} />
        <span className="text-sm font-semibold text-slate-600">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-black text-slate-800 tabular-nums">{value}</span>
        {unit && <span className="text-xs font-bold text-slate-400">{unit}</span>}
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
  const [catStart, setCatStart] = useState("")
  const [catEnd, setCatEnd] = useState("")

  // 月別推移グラフ用フィルター
  const [monthStart, setMonthStart] = useState("")
  const [monthEnd, setMonthEnd] = useState("")
  const [monthlyChartType, setMonthlyChartType] = useState<"line" | "bar">("line")
  const [yearlyChartType, setYearlyChartType] = useState<"line" | "bar">("bar")
  const [isColorful, setIsColorful] = useState(false)

  // 円グラフアニメーション
  const [pieAnimKey, setPieAnimKey] = useState(0)
  const hasAnimatedPie = useRef(false)
  const isFirstCatFilter = useRef(true)

  // 年次統計用
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const supabase = createClient()
  const { t, locale } = useTranslation()

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

  // データフィルタリング処理
  const catFilteredRecords = records.filter(r => {
    if (catStart && r.date < catStart) return false
    if (catEnd && r.date > catEnd) return false
    return true
  })

  const monthFilteredRecords = records.filter(r => {
    if (monthStart && r.date < monthStart) return false
    if (monthEnd && r.date > monthEnd) return false
    return true
  })

  // 年次統計用
  const yearFilteredRecords = records.filter(r => r.date.startsWith(String(selectedYear)))

  // グラフ切り替え処理
  const toggleMonthlyChart = () => {
    const nextType = monthlyChartType === "line" ? "bar" : "line"
    setMonthlyChartType(nextType)
    localStorage.setItem("milenote_monthly_chart", nextType)
  }

  const toggleYearlyChart = () => {
    const nextType = yearlyChartType === "line" ? "bar" : "line"
    setYearlyChartType(nextType)
    localStorage.setItem("milenote_yearly_chart", nextType)
  }

  const toggleColorful = () => {
    const nextVal = !isColorful
    setIsColorful(nextVal)
    localStorage.setItem("milenote_colorful_pie", String(nextVal))
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
  }, [catStart, catEnd])

  const monthlyData = monthFilteredRecords.reduce((acc: { month: string; amount: number }[], curr) => {
    const month = curr.date.substring(0, 7)
    const found = acc.find(a => a.month === month)
    if (found) found.amount += curr.amount
    else acc.push({ month, amount: curr.amount })
    return acc
  }, []).sort((a, b) => a.month.localeCompare(b.month))

  // 年次統計: 1〜12月をすべて0で初期化してから集計
  const currentMonth = new Date().getMonth() + 1
  const yearlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const monthStr = `${selectedYear}-${String(month).padStart(2, "0")}`
    const amount = yearFilteredRecords
      .filter(r => r.date.startsWith(monthStr))
      .reduce((sum, r) => sum + r.amount, 0)

    // 現在の年で未来の月の場合は null にする（線や点を描画しない）
    const isFuture = selectedYear === currentYear && month > currentMonth
    return { month, monthStr, amount: isFuture ? null : amount }
  })

  const yearlyTotal = yearFilteredRecords.reduce((sum, r) => sum + r.amount, 0)

  // 走行距離スケール計算処理
  const earthCircumference = 40075
  const distanceToMoon = 384400
  const earthRounds = (totalOdo / earthCircumference).toFixed(2)
  const moonPercent = Math.min(((totalOdo / distanceToMoon) * 100), 100).toFixed(1)
  const remainingMoonDist = Math.max(distanceToMoon - totalOdo, 0)

  // 給油系統計
  const fuelRecords = records.filter(r => r.category === "fuel")
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

  // ロケール対応の月フォーマッター
  const monthFormatter = (v: string) => {
    const monthNum = parseInt(v.split('-')[1], 10)
    if (locale === "en") {
      const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return names[monthNum - 1]
    }
    return `${monthNum}月`
  }

  const yearlyMonthFormatter = (m: number) => {
    if (locale === "en") {
      const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return names[m - 1]
    }
    return `${m}月`
  }

  // Recharts のコールバック型（PieLabelRenderProps / Formatter / LabelFormatter 等）は
  // 省略可能フィールドを含む複雑な union のため、本ファイル内では any を許容する
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const yenTickFormatter = (v: any) => (v === 0 ? "0" : `¥${Number(v).toLocaleString()}`)
  const expenditureTooltipFormatter = (value: any): [string, string] => [
    `¥${Number(value).toLocaleString()}`,
    t("stats.expenditure"),
  ]
  const monthTooltipLabelFormatter = (label: any) => yearlyMonthFormatter(label)
  const monthlyTooltipLabelFormatter = (label: any) => {
    const [year, month] = String(label).split("-")
    const monthNum = parseInt(month, 10)
    if (locale === "en") {
      const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return `${names[monthNum - 1]} ${year}`
    }
    return `${year}年${monthNum}月`
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // ローディング状態の表示
  if (loading) return (
    <main className="p-4 space-y-6 max-w-5xl mx-auto">
      <header className="pt-4 pb-2">
        <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse" />
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
            <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  )

  return (
    <main className="p-4 space-y-6 max-w-5xl mx-auto pb-20">
      <header className="pt-4 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t("stats.title")}</h1>
      </header>

      <Tabs defaultValue="distance" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="distance" className="font-bold">
            <Globe size={14} className="mr-1.5" />
            {t("stats.tab_distance")}
          </TabsTrigger>
          <TabsTrigger value="cost" className="font-bold">
            <BarChart3 size={14} className="mr-1.5" />
            {t("stats.tab_cost")}
          </TabsTrigger>
        </TabsList>

        {/* 走行距離タブ */}
        <TabsContent value="distance" className="space-y-6 outline-none">

          {/* ヒーローバナー：地球周、月進捗 */}
          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-11 md:gap-8">
                {/* 地球周セクション */}
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-4 rounded-full shadow-sm shrink-0">
                    <Globe className="text-blue-500 w-10 h-10" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-2xl font-black text-slate-800 tracking-wide tabular-nums">
                      {t("stats.earth_rounds", { rounds: earthRounds })}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium tracking-wide">
                      {t("stats.total_odo")}: <span className="font-bold text-slate-700 tabular-nums">{totalOdo.toLocaleString()}</span> {t("stats.unit_km")}
                    </p>
                  </div>
                </div>

                {/* 月進捗セクション */}
                <div className="space-y-3 md:border-l md:border-slate-100 md:pl-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon className="text-yellow-500 w-5 h-5" />
                      <span className="font-bold text-slate-700 text-sm">{t("stats.moon_progress")}</span>
                    </div>
                    <span className="text-sm font-black text-slate-800 tabular-nums">{moonPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      style={{ width: `${moonPercent}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-center text-slate-500 font-medium">
                    {t("stats.moon_remaining", { distance: remainingMoonDist.toLocaleString() })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 給油サマリーカード */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
                <Fuel size={16} /> {t("stats.fuel_summary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="divide-y divide-slate-100">
                <StatRow
                  icon={Droplet}
                  iconColor="text-blue-500"
                  label={t("stats.total_fuel")}
                  value={totalFuelAmount.toFixed(1)}
                  unit={t("stats.unit_liter")}
                />
                <StatRow
                  icon={Hash}
                  iconColor="text-indigo-500"
                  label={t("stats.fuel_count")}
                  value={fuelCount.toLocaleString()}
                  unit={t("stats.unit_count_times")}
                />
                <StatRow
                  icon={Receipt}
                  iconColor="text-orange-500"
                  label={t("stats.total_fuel_cost")}
                  value={`¥${totalFuelCost.toLocaleString()}`}
                  unit=""
                />
                <StatRow
                  icon={TrendingUp}
                  iconColor="text-rose-500"
                  label={t("stats.avg_unit_price")}
                  value={Math.round(avgUnitPrice).toLocaleString()}
                  unit={t("stats.unit_yen_per_liter")}
                />
              </div>
              {/* CO₂セクション */}
              <div className="mt-2 pt-1 border-t-2 border-slate-100">
                <StatRow
                  icon={Leaf}
                  iconColor="text-green-500"
                  label={t("stats.co2_emission")}
                  value={Math.round(co2Emission).toLocaleString()}
                  unit={t("stats.unit_kg")}
                />
                <p className="text-[10px] text-slate-400 pl-6">{t("stats.co2_note")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 費用分析タブ */}
        <TabsContent value="cost" className="space-y-6 outline-none">

          {/* グラフセクション */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* カテゴリ別内訳 */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
                  <PieIcon size={16} /> {t("stats.category_breakdown")}
                </CardTitle>
                <button
                  onClick={toggleColorful}
                  className={`p-1.5 rounded-lg transition-colors ${isColorful ? 'text-blue-500 bg-blue-50' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`}
                  aria-label="Toggle colorful pie chart"
                  title="カラー切り替え"
                >
                  <Palette size={16} />
                </button>
              </CardHeader>
              <PeriodFilter
                start={catStart} end={catEnd}
                onStartChange={setCatStart} onEndChange={setCatEnd}
                onReset={() => { setCatStart(""); setCatEnd("") }}
                labelFrom={t("stats.from")}
                labelTo={t("stats.to")}
                labelReset={t("stats.reset_filter")}
              />
              <CardContent className="h-80 p-0">
                {categoryData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
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
                          <Pie data={categoryData} cx="50%" cy="45%" innerRadius={60} outerRadius={80} dataKey="value" stroke="#ffffff" strokeWidth={2} strokeLinejoin="round" isAnimationActive={false} label={createCustomizedLabel(t, locale)} labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}>
                            {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                            <Label value={`¥${totalAmount.toLocaleString()}`} position="center" dy={-8} className="text-base font-black fill-slate-800" />
                            <Label value={t("stats.total")} position="center" dy={8} className="text-[10px] font-bold fill-slate-400" />
                          </Pie>
                          {/* Recharts のコールバック型が複雑なため any を許容 */}
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value: any) => [`¥${Number(value).toLocaleString()}`, t("stats.amount")]} />
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value: any) => <span className="text-xs font-bold text-slate-600 mr-2">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 月別出費推移 */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
                  <BarChart3 size={16} /> {t("stats.monthly_trend")}
                </CardTitle>
                <button
                  onClick={toggleMonthlyChart}
                  className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  aria-label="Toggle chart type"
                  title="グラフの種類を切り替え"
                >
                  {monthlyChartType === "line" ? <BarChart3 size={16} /> : <LineChartIcon size={16} />}
                </button>
              </CardHeader>
              <PeriodFilter
                start={monthStart} end={monthEnd}
                onStartChange={setMonthStart} onEndChange={setMonthEnd}
                onReset={() => { setMonthStart(""); setMonthEnd("") }}
                labelFrom={t("stats.from")}
                labelTo={t("stats.to")}
                labelReset={t("stats.reset_filter")}
              />
              <CardContent className="h-80 p-4 pt-0">
                {monthlyData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                    <BarChart3 size={40} strokeWidth={1.5} />
                    <p className="text-sm font-medium">{t("stats.no_data")}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {monthlyChartType === "line" ? (
                      <LineChart data={monthlyData} margin={{ top: 40, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} dy={10} tick={{ fill: '#94a3b8' }} tickFormatter={monthFormatter} padding={{ left: 30, right: 30 }} />
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} width={65} domain={[0, 'auto']} tickFormatter={(v: any) => v.toLocaleString()} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={expenditureTooltipFormatter} labelFormatter={monthlyTooltipLabelFormatter} />
                        <Line type="linear" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                      </LineChart>
                    ) : (
                      <BarChart data={monthlyData} margin={{ top: 40, right: 30, left: 10, bottom: 20 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} dy={10} tick={{ fill: '#94a3b8' }} tickFormatter={monthFormatter} />
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} width={65} tickFormatter={(v: any) => v.toLocaleString()} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={expenditureTooltipFormatter} labelFormatter={monthlyTooltipLabelFormatter} />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 年次統計セクション */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
                  <CalendarDays size={16} /> {t("stats.yearly_stats")}
                </CardTitle>
                {/* 年切替ナビとグラフ切り替えボタン */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleYearlyChart}
                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label="Toggle chart type"
                    title="グラフの種類を切り替え"
                  >
                    {yearlyChartType === "line" ? <BarChart3 size={16} /> : <LineChartIcon size={16} />}
                  </button>
                  <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                    <button
                      onClick={() => setSelectedYear(y => y - 1)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
                      aria-label="前の年"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-black text-slate-800 min-w-[60px] text-center tabular-nums">
                      {locale === "en" ? selectedYear : `${selectedYear}年`}
                    </span>
                    <button
                      onClick={() => setSelectedYear(y => y + 1)}
                      disabled={selectedYear >= currentYear}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="次の年"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
              {/* 年合計 */}
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{t("stats.yearly_total")}</span>
                <span className="text-2xl font-bold text-slate-800 tracking-widest tabular-nums">¥{yearlyTotal.toLocaleString()}</span>
              </div>
            </CardHeader>
            <CardContent className="h-64 px-2 pb-4 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                {yearlyChartType === "line" ? (
                  <LineChart data={yearlyData} margin={{ top: 20, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                      tick={{ fill: '#94a3b8' }}
                      tickFormatter={yearlyMonthFormatter}
                    />
                    <YAxis
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8' }}
                      width={70}
                      tickFormatter={yenTickFormatter}
                    />
                    <Tooltip
                      cursor={false}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: '#3b82f6' }}
                      formatter={expenditureTooltipFormatter}
                      labelFormatter={monthTooltipLabelFormatter}
                    />
                    <Line type="linear" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                ) : (
                  <BarChart data={yearlyData} margin={{ top: 20, right: 16, left: 8, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                      tick={{ fill: '#94a3b8' }}
                      tickFormatter={yearlyMonthFormatter}
                    />
                    <YAxis
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8' }}
                      width={70}
                      tickFormatter={yenTickFormatter}
                    />
                    <Tooltip
                      cursor={false}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: '#3b82f6' }}
                      formatter={expenditureTooltipFormatter}
                      labelFormatter={monthTooltipLabelFormatter}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {yearlyData.map((entry, index) => (
                        <Cell
                          key={`bar-${index}`}
                          fill={(entry.amount ?? 0) > 0 ? "#3b82f6" : "#e2e8f0"}
                          fillOpacity={(entry.amount ?? 0) > 0 ? 1 : 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>

    </main>
  )
}
