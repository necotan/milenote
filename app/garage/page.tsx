"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { CarFront, Plus, X, ListTodo, ExternalLink, Camera, Pencil, Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useTranslation, formatDateLocale, formatMonthsPassedLocale } from "@/lib/i18n"

const WISHLIST_GENRE_KEYS = [
  "ホイール", "マフラー・吸排気", "エアロ・外装", "足回り・車高調", "インテリア・内装", "その他"
]

const FUEL_TYPE_KEYS = ["レギュラー", "ハイオク", "軽油", "EV", "その他"]

const CAR_STATUS_KEYS = ["pending", "active", "archived", "archived_excluded"] as const
type CarStatus = typeof CAR_STATUS_KEYS[number]

// 一覧での並び順
const CAR_STATUS_ORDER: Record<string, number> = {
  active: 0,
  pending: 1,
  archived: 2,
  archived_excluded: 3,
}

export default function GaragePage() {
  const [cars, setCars] = useState<any[]>([])
  const [wishlists, setWishlists] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])

  // 表示の切り替えステート
  const [isAddingCar, setIsAddingCar] = useState(false)
  const [editCarId, setEditCarId] = useState<string | null>(null)
  const [isAddingWish, setIsAddingWish] = useState(false)
  const [editWishId, setEditWishId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 削除確認モーダル用
  const [deleteCarTarget, setDeleteCarTarget] = useState<any | null>(null)
  const [deleteCarConfirmName, setDeleteCarConfirmName] = useState("")
  const supabase = createClient()
  const { t, locale } = useTranslation()

  // 車両追加フォームの状態管理
  const [name, setName] = useState("")
  const [maker, setMaker] = useState("")
  const [modelCode, setModelCode] = useState("")
  const [year, setYear] = useState("")
  const [grade, setGrade] = useState("")
  const [color, setColor] = useState("")
  const [fuelType, setFuelType] = useState("レギュラー")
  const [currentOdo, setCurrentOdo] = useState("")
  const [firstRegistrationDate, setFirstRegistrationDate] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [purchaseOdo, setPurchaseOdo] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [includePriceInCost, setIncludePriceInCost] = useState(false)
  const [carStatus, setCarStatus] = useState<CarStatus>("active")

  // ウィッシュリスト追加フォームの状態管理
  const [wishCarId, setWishCarId] = useState("")
  const [wishItemName, setWishItemName] = useState("")
  const [wishGenre, setWishGenre] = useState("")
  const [wishPrice, setWishPrice] = useState("")
  const [wishUrl, setWishUrl] = useState("")
  const [wishMemo, setWishMemo] = useState("")

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // 車両データの取得
      const { data: carsData } = await supabase
        .from("cars")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })

      if (carsData) {
        // ステータス順でソートしてから状態にセット
        const sortedCars = [...carsData].sort((a, b) => {
          const aOrder = CAR_STATUS_ORDER[a.status] ?? 99
          const bOrder = CAR_STATUS_ORDER[b.status] ?? 99
          return aOrder - bOrder
        })
        setCars(sortedCars)
        if (sortedCars.length === 1) setWishCarId(sortedCars[0].id)
      }

      // ウィッシュリストの取得
      const { data: wishesData } = await supabase
        .from("wishlists")
        .select(`*, cars(name)`)
        .in("car_id", carsData ? carsData.map(c => c.id) : [])
        .order("created_at", { ascending: false })

      if (wishesData) setWishlists(wishesData)

      // 維持費記録の取得（累計維持費の計算用）
      const { data: recordsData } = await supabase
        .from("records")
        .select("*")
        .in("car_id", carsData ? carsData.map(c => c.id) : [])
      if (recordsData) setRecords(recordsData)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [supabase])

  // 車両フォームの入力値をリセット
  const resetCarForm = () => {
    setIsAddingCar(false)
    setEditCarId(null)
    setName(""); setMaker(""); setModelCode(""); setYear("");
    setGrade(""); setColor(""); setFuelType("レギュラー"); setCurrentOdo("");
    setFirstRegistrationDate(""); setPurchaseDate(""); setPurchaseOdo("");
    setPurchasePrice(""); setIncludePriceInCost(false);
    setCarStatus("active")
  }

  // 新規車両の登録処理
  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from("cars").insert({
      user_id: user.id, name, maker, model_code: modelCode,
      year: parseInt(year) || null, grade, color, fuel_type: fuelType,
      current_odo: parseInt(currentOdo) || 0,
      first_registration_date: firstRegistrationDate ? `${firstRegistrationDate}-01` : null,
      purchase_date: purchaseDate || null,
      purchase_odo: parseInt(purchaseOdo) || 0,
      purchase_price: parseInt(purchasePrice) || 0,
      include_price_in_cost: includePriceInCost,
      status: carStatus,
    })

    if (error) {
      toast.error(t("common.error_occurred") + ": " + error.message)
    } else {
      toast.success(t("garage.car_registered"))
      resetCarForm()
      fetchData()
    }
  }

  // 車両情報の編集モードを開始
  const handleStartEditCar = (car: any) => {
    setEditCarId(car.id)
    setIsAddingCar(false)
    setName(car.name || "")
    setMaker(car.maker || "")
    setModelCode(car.model_code || "")
    setYear(car.year ? String(car.year) : "")
    setGrade(car.grade || "")
    setColor(car.color || "")
    setFuelType(car.fuel_type || "レギュラー")
    setCurrentOdo(car.current_odo ? String(car.current_odo) : "")
    setFirstRegistrationDate(car.first_registration_date ? car.first_registration_date.substring(0, 7) : "")
    setPurchaseDate(car.purchase_date || "")
    setPurchaseOdo(car.purchase_odo ? String(car.purchase_odo) : "")
    setPurchasePrice(car.purchase_price ? String(car.purchase_price) : "")
    setIncludePriceInCost(!!car.include_price_in_cost)
    setCarStatus((CAR_STATUS_KEYS as readonly string[]).includes(car.status) ? (car.status as CarStatus) : "active")
  }

  // 車両情報の更新処理
  const handleUpdateCar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCarId) return

    const { error } = await supabase.from("cars").update({
      name, maker, model_code: modelCode,
      year: parseInt(year) || null, grade, color, fuel_type: fuelType,
      current_odo: parseInt(currentOdo) || 0,
      first_registration_date: firstRegistrationDate ? `${firstRegistrationDate}-01` : null,
      purchase_date: purchaseDate || null,
      purchase_odo: parseInt(purchaseOdo) || 0,
      purchase_price: parseInt(purchasePrice) || 0,
      include_price_in_cost: includePriceInCost,
      status: carStatus,
    }).eq("id", editCarId)

    if (error) {
      toast.error(t("common.error_occurred") + ": " + error.message)
    } else {
      toast.success(t("garage.car_updated"))
      resetCarForm()
      fetchData()
    }
  }

  // 車両の論理削除処理
  const handleDeleteCar = async () => {
    if (!deleteCarTarget) return
    if (deleteCarConfirmName !== deleteCarTarget.name) {
      toast.error(t("garage.name_mismatch"))
      return
    }

    const { error } = await supabase.from("cars").update({ status: "deleted" }).eq("id", deleteCarTarget.id)
    if (error) {
      toast.error(t("common.delete_failed") + ": " + error.message)
    } else {
      toast.success(t("garage.car_deleted", { name: deleteCarTarget.name }))
      setDeleteCarTarget(null)
      setDeleteCarConfirmName("")
      fetchData()
    }
  }

  // ウィッシュリストアイテムの追加処理
  const handleAddWish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wishCarId) return alert(t("records.select_car_alert"))

    const { error } = await supabase.from("wishlists").insert({
      car_id: wishCarId,
      item_name: wishItemName,
      genre: wishGenre,
      price_estimate: parseInt(wishPrice) || 0,
      url: wishUrl,
      memo: wishMemo,
      status: 'considering' // 初期状態は検討中
    })

    if (error) {
      toast.error(t("common.error_occurred") + ": " + error.message)
    } else {
      toast.success(t("garage.wish_added"))
      setIsAddingWish(false)
      setWishItemName(""); setWishGenre(""); setWishPrice(""); setWishUrl(""); setWishMemo("");
      fetchData()
    }
  }

  // ウィッシュリスト情報の編集モードを開始
  const handleStartEditWish = (wish: any) => {
    setEditWishId(wish.id)
    setIsAddingWish(false)
    setWishCarId(wish.car_id)
    setWishItemName(wish.item_name)
    setWishGenre(wish.genre || "")
    setWishPrice(wish.price_estimate ? String(wish.price_estimate) : "")
    setWishUrl(wish.url || "")
    setWishMemo(wish.memo || "")
  }

  // ウィッシュリスト情報の更新処理
  const handleUpdateWish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editWishId) return

    const { error } = await supabase.from("wishlists").update({
      car_id: wishCarId,
      item_name: wishItemName,
      genre: wishGenre,
      price_estimate: parseInt(wishPrice) || 0,
      url: wishUrl,
      memo: wishMemo,
    }).eq("id", editWishId)

    if (error) {
      toast.error(t("common.error_occurred") + ": " + error.message)
    } else {
      toast.success(t("garage.wish_updated"))
      resetWishForm()
      fetchData()
    }
  }

  // ウィッシュリストアイテムの削除処理
  const handleDeleteWish = async (wishId: string) => {
    const confirmed = window.confirm(t("garage.confirm_delete_item"))
    if (!confirmed) return

    const { error } = await supabase.from("wishlists").delete().eq("id", wishId)
    if (error) {
      toast.error(t("common.delete_failed") + ": " + error.message)
    } else {
      toast.success(t("garage.item_deleted"))
      fetchData()
    }
  }

  // ウィッシュリストフォームの入力値をリセット
  const resetWishForm = () => {
    setIsAddingWish(false)
    setEditWishId(null)
    setWishItemName(""); setWishGenre(""); setWishPrice(""); setWishUrl(""); setWishMemo("");
    if (cars.length === 1) setWishCarId(cars[0].id)
  }

  // ステータス更新処理
  const updateWishStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("wishlists").update({ status: newStatus }).eq("id", id)

    if (error) {
      toast.error(t("common.error_occurred") + ": " + error.message)
      return
    }

    toast.success(t("garage.status_updated"))
    fetchData()
  }

  // 画像アップロード処理
  const handleImageUpload = async (carId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 5MB制限チェック
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("garage.file_too_large"))
      return
    }

    const toastId = toast.loading(t("garage.uploading_photo"))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Storageにアップロード
    const fileExt = file.name.split('.').pop()
    const fileName = `${carId}-${Date.now()}.${fileExt}` // 重複しないファイル名を生成
    const filePath = `${user.id}/${fileName}` // ユーザーごとのフォルダに保存

    const { error: uploadError } = await supabase.storage.from('cars').upload(filePath, file)

    if (uploadError) {
      toast.dismiss(toastId)
      toast.error(t("garage.upload_failed") + ": " + uploadError.message)
      return
    }

    // アップロードした画像の公開URLを取得
    const { data: { publicUrl } } = supabase.storage.from('cars').getPublicUrl(filePath)

    // cars テーブルの image_url を更新
    const { error: updateError } = await supabase.from('cars').update({ image_url: publicUrl }).eq('id', carId)

    toast.dismiss(toastId)
    if (updateError) {
      toast.error(t("garage.db_update_failed"))
    } else {
      toast.success(t("garage.photo_set"))
      fetchData() // 画面を更新して写真を表示
    }
  }

  // ステータスの色を定義
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'considering': return "bg-slate-100 text-slate-600 border-slate-200"
      case 'purchased': return "bg-blue-50 text-blue-600 border-blue-200"
      case 'installed': return "bg-green-50 text-green-600 border-green-200"
      case 'given_up': return "bg-slate-50 text-slate-400 border-slate-200 opacity-60"
      default: return "bg-slate-100"
    }
  }

  return (
    <main className="p-4 space-y-6 max-w-5xl mx-auto">
      <header className="pt-4 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t("garage.title")}</h1>
        <p className="text-xs font-bold text-slate-400 tracking-wider mt-1">{t("garage.subtitle")}</p>
      </header>

      <Tabs defaultValue="mycars" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1">
          <TabsTrigger value="mycars" className="flex items-center gap-2 font-bold text-[11px] uppercase tracking-wider">
            <CarFront size={14} /> {t("garage.my_cars")}
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="flex items-center gap-2 font-bold text-[11px] uppercase tracking-wider">
            <ListTodo size={14} /> {t("garage.wishlist")}
          </TabsTrigger>
        </TabsList>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="h-48 bg-slate-100 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-7 w-36 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="p-4 space-y-2">
                      <div className="h-2.5 w-16 bg-slate-100 rounded animate-pulse" />
                      <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 愛車一覧（My Cars）*/}
        <TabsContent value="mycars" className="space-y-4">
          <div className="flex justify-end">
            {!loading && !isAddingCar && !editCarId && (
              <Button onClick={() => setIsAddingCar(true)} size="sm" className="font-bold">
                <Plus className="mr-1 h-4 w-4" /> {t("garage.register_car")}
              </Button>
            )}
          </div>

          {(isAddingCar || editCarId) && (
            <Card className="border-none shadow-md bg-white mb-6">
              <CardContent className="p-6 relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-400" onClick={resetCarForm}>
                  <X className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-extrabold text-slate-800 mb-6">
                  {editCarId ? t("garage.edit_car") : t("garage.add_car")}
                </h2>

                <form onSubmit={editCarId ? handleUpdateCar : handleAddCar} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("garage.car_name")} <span className="text-red-500">{t("common.required")}</span></Label>
                    <Input placeholder="TOYOTA 86" value={name} onChange={(e) => setName(e.target.value)} required className="placeholder:text-slate-300" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>{t("garage.maker")}</Label><Input placeholder="" value={maker} onChange={(e) => setMaker(e.target.value)} className="placeholder:text-slate-300" /></div>
                    <div className="space-y-2"><Label>{t("garage.model_code")}</Label><Input placeholder="ZN6" value={modelCode} onChange={(e) => setModelCode(e.target.value)} className="placeholder:text-slate-300" /></div>
                    <div className="space-y-2"><Label>{t("garage.year")}</Label><Input type="number" placeholder="2018" value={year} onChange={(e) => setYear(e.target.value)} className="placeholder:text-slate-300" /></div>
                    <div className="space-y-2"><Label>{t("common.grade")}</Label><Input placeholder="GT Limited" value={grade} onChange={(e) => setGrade(e.target.value)} className="placeholder:text-slate-300" /></div>
                    <div className="space-y-2"><Label>{t("garage.body_color")}</Label><Input placeholder="" value={color} onChange={(e) => setColor(e.target.value)} className="placeholder:text-slate-300" /></div>
                    <div className="space-y-2"><Label>{t("garage.current_odo")} <span className="text-red-500">{t("common.required")}</span></Label><Input type="number" placeholder="52400" value={currentOdo} onChange={(e) => setCurrentOdo(e.target.value)} required className="placeholder:text-slate-300" /></div>
                    <div className="space-y-2"><Label>{t("garage.first_registration")}</Label><Input type="month" value={firstRegistrationDate} onChange={(e) => setFirstRegistrationDate(e.target.value)} className="placeholder:text-slate-300 appearance-none h-8 min-h-0" /></div>
                    <div className="space-y-2"><Label>{t("common.delivery_date")}</Label><Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="placeholder:text-slate-300 appearance-none h-8 min-h-0" /></div>
                    <div className="space-y-2"><Label>{t("garage.purchase_odo")}</Label><Input type="number" placeholder="48000" value={purchaseOdo} onChange={(e) => setPurchaseOdo(e.target.value)} className="placeholder:text-slate-300" /></div>
                    <div className="space-y-2"><Label>{t("garage.purchase_price")}</Label><Input type="number" placeholder="2500000" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="placeholder:text-slate-300" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("garage.fuel_type")}</Label>
                    <Select value={fuelType} onValueChange={setFuelType}>
                      <SelectTrigger><SelectValue placeholder={t("garage.select_fuel_type")} /></SelectTrigger>
                      <SelectContent>
                        {FUEL_TYPE_KEYS.map(key => (
                          <SelectItem key={key} value={key}>{t(`fuel_types.${key}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
                    <div className="space-y-0.5 pr-3">
                      <Label htmlFor="include-price" className="cursor-pointer">{t("garage.include_price_in_cost")}</Label>
                      <p className="text-[11px] text-slate-400">{t("garage.include_price_in_cost_hint")}</p>
                    </div>
                    <Switch id="include-price" checked={includePriceInCost} onCheckedChange={setIncludePriceInCost} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("garage.status")}</Label>
                    <Select value={carStatus} onValueChange={(v) => setCarStatus(v as CarStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CAR_STATUS_KEYS.map(key => (
                          <SelectItem key={key} value={key}>{t(`garage.car_status_${key}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4 flex justify-center">
                    <Button type="submit" className="px-12 font-bold">
                      {editCarId ? t("common.update") : t("common.register")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {!loading && !isAddingCar && !editCarId && cars.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-xl">
              <CarFront className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">{t("garage.no_cars")}</p>
            </div>
          )}

          {!loading && !isAddingCar && !editCarId && cars.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cars.map((car) => (
                <Card key={car.id} className="border-none shadow-sm overflow-hidden bg-white p-0 relative group">
                  {/* 画像アップロードボタン */}
                  <Label className="absolute top-3 right-3 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer z-20 transition-all backdrop-blur-sm opacity-80 hover:opacity-100 shadow-lg">
                    <Camera size={16} />
                    <Input
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      className="hidden"
                      onChange={(e) => handleImageUpload(car.id, e)}
                    />
                  </Label>

                  <div className="relative h-48 bg-slate-800 w-full m-0 border-b border-slate-100">
                    {/* 登録済みの画像がある場合は表示 */}
                    {car.image_url && (
                      <img src={car.image_url} alt={car.name} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                  </div>

                  <CardContent className="p-0 m-0">
                    <div className="px-4 pb-4 bg-white relative z-20">
                      <h3 className="text-2xl font-black text-slate-800 tracking-wider mt-1">{car.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 tracking-widest">{car.maker} {car.model_code} {car.year ? `/ ${t("common.year_format", { year: car.year })}` : ""}</p>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-b border-slate-100">
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{t("common.odometer")}</p>
                        <p className="text-lg font-black text-slate-800 tracking-wider">{car.current_odo.toLocaleString()} <span className="text-[10px]">{t("common.km_unit")}</span></p>
                      </div>
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{t("common.total_cost")}</p>
                        <p className="text-lg font-black text-slate-800 tracking-wider">¥{
                          (records.filter(r => r.car_id === car.id).reduce((sum, r) => sum + r.amount, 0)
                            + (car.include_price_in_cost ? (car.purchase_price || 0) : 0)).toLocaleString()
                        }</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/30">
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{t("common.distance_since_delivery")}</p>
                        <p className="text-lg font-black text-slate-800 tracking-wider">+{Math.max(0, car.current_odo - (car.purchase_odo || 0)).toLocaleString()} <span className="text-[10px]">{t("common.km_unit")}</span></p>
                      </div>
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{t("common.ownership_period")}</p>
                        <p className="text-lg font-black text-slate-800 tracking-wider">{formatMonthsPassedLocale(car.purchase_date, locale)}</p>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col gap-2.5 text-xs bg-slate-50/50">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">{t("common.delivery_date")}</span>
                        <span className="font-bold text-slate-700 tracking-wider text-[10px]">{formatDateLocale(car.purchase_date, locale)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">{t("common.car_age")}</span>
                        <span className="font-bold text-slate-700 tracking-wider text-[10px]">{formatMonthsPassedLocale(car.first_registration_date, locale)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">{t("common.grade")}</span>
                        <span className="font-bold text-slate-700 tracking-wider text-[10px]">{car.grade || "-"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">{t("garage.status")}</span>
                          <span className="font-bold text-slate-700 tracking-wider text-[10px]">{t(`garage.car_status_${car.status}`)}</span>
                        </div>
                        {/* 編集・削除アクション */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEditCar(car)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                            title={t("common.edit")}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => { setDeleteCarTarget(car); setDeleteCarConfirmName(""); }}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title={t("common.delete")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 車両削除確認モーダル */}
        {deleteCarTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setDeleteCarTarget(null); setDeleteCarConfirmName(""); }}>
            <Card className="border-none shadow-2xl bg-white max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-red-500">
                  <AlertTriangle size={24} />
                  <h2 className="text-lg font-extrabold text-slate-800">{t("garage.delete_car_title")}</h2>
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-slate-800">{t("garage.delete_car_message", { name: deleteCarTarget.name })}</span><br />
                  {t("garage.delete_car_warning")}
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-800">
                    {t("garage.delete_confirm_instruction")}
                  </p>
                  <Input
                    placeholder={deleteCarTarget.name}
                    value={deleteCarConfirmName}
                    onChange={(e) => setDeleteCarConfirmName(e.target.value)}
                    className="bg-white placeholder:text-slate-300"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 font-bold"
                    onClick={() => { setDeleteCarTarget(null); setDeleteCarConfirmName(""); }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 font-bold bg-red-600 border border-red-700 text-white hover:bg-red-700"
                    disabled={deleteCarConfirmName !== deleteCarTarget.name}
                    onClick={handleDeleteCar}
                  >
                    {t("common.delete_action")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ウィッシュリスト（欲しいもの） */}
        <TabsContent value="wishlist" className="space-y-4">
          <div className="flex justify-end">
            {!loading && !isAddingWish && !editWishId && cars.length > 0 && (
              <Button onClick={() => setIsAddingWish(true)} size="sm" className="font-bold">
                <Plus className="mr-1 h-4 w-4" /> {t("common.add")}
              </Button>
            )}
          </div>

          {!loading && cars.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-xl">
              <p className="text-slate-500 font-medium">{t("garage.register_car_first_line1")}<br />{t("garage.register_car_first_line2")}</p>
            </div>
          )}

          {(isAddingWish || editWishId) && (
            <Card className="border-none shadow-md bg-white mb-6">
              <CardContent className="p-6 relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-400" onClick={resetWishForm}>
                  <X className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-extrabold text-slate-800 mb-6">
                  {editWishId ? t("garage.edit_wish") : t("garage.add_wish")}
                </h2>

                <form onSubmit={editWishId ? handleUpdateWish : handleAddWish} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("common.target_car")} <span className="text-red-500">{t("common.required")}</span></Label>
                      <Select value={wishCarId} onValueChange={setWishCarId} required>
                        <SelectTrigger><SelectValue placeholder={t("common.select_car")} /></SelectTrigger>
                        <SelectContent>
                          {cars.map(car => <SelectItem key={car.id} value={car.id}>{car.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("garage.genre")} <span className="text-red-500">{t("common.required")}</span></Label>
                      <Select value={wishGenre} onValueChange={setWishGenre} required>
                        <SelectTrigger><SelectValue placeholder={t("garage.genre")} /></SelectTrigger>
                        <SelectContent>
                          {WISHLIST_GENRE_KEYS.map(key => (
                            <SelectItem key={key} value={key}>{t(`wishlist_genres.${key}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("garage.parts_name")} <span className="text-red-500">{t("common.required")}</span></Label>
                    <Input placeholder="" value={wishItemName} onChange={(e) => setWishItemName(e.target.value)} required />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("garage.estimated_price")}</Label>
                      <Input type="number" placeholder="100000" value={wishPrice} onChange={(e) => setWishPrice(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("garage.reference_url")}</Label>
                      <Input type="url" placeholder="https://..." value={wishUrl} onChange={(e) => setWishUrl(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("common.memo")}</Label>
                    <Textarea placeholder="" value={wishMemo} onChange={(e) => setWishMemo(e.target.value)} className="resize-none h-20" />
                  </div>

                  <div className="pt-4 flex justify-center">
                    <Button type="submit" className="px-12 font-bold">
                      {editWishId ? t("common.update") : t("common.add")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {!loading && !isAddingWish && !editWishId && wishlists.length === 0 && cars.length > 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-xl">
              <ListTodo className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">{t("garage.no_wishlist")}</p>
            </div>
          )}

          {!loading && !isAddingWish && !editWishId && wishlists.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wishlists.map((wish) => {
                const statusStyle = getStatusStyle(wish.status)
                return (
                  <Card key={wish.id} className="border border-slate-100 shadow-sm bg-white overflow-hidden relative">
                    {/* 編集・削除ボタン（右上に常時表示） */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                      <button
                        onClick={() => handleStartEditWish(wish)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                        title={t("common.edit")}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteWish(wish.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title={t("common.delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-start mb-2 pr-16">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
                            {t(`wishlist_genres.${wish.genre}`)} / {wish.cars.name}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
                            {t(`wishlist_statuses.${wish.status}`)}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{wish.item_name}</h3>

                        {wish.price_estimate > 0 && (
                          <p className="text-sm font-bold text-blue-600 mb-2">¥{wish.price_estimate.toLocaleString()}</p>
                        )}

                        {wish.memo && (
                          <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md mb-3 line-clamp-2">
                            {wish.memo}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-50">
                        {wish.url ? (
                          <a href={wish.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors">
                            <ExternalLink size={12} /> {t("garage.open_link")}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">{t("garage.no_link")}</span>
                        )}

                        {/* ステータス変更ドロップダウン */}
                        <div className="w-32">
                          <Select defaultValue={wish.status} onValueChange={(val) => updateWishStatus(wish.id, val)}>
                            <SelectTrigger className="h-7 text-xs font-bold bg-slate-50 border-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="considering">{t("wishlist_statuses.considering")}</SelectItem>
                              <SelectItem value="purchased">{t("wishlist_statuses.purchased")}</SelectItem>
                              <SelectItem value="installed">{t("wishlist_statuses.installed")}</SelectItem>
                              <SelectItem value="given_up">{t("wishlist_statuses.given_up")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}