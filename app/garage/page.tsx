"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton, SkeletonTabs } from "@/components/ui/skeleton"
import { CarFront, Plus, X, ListTodo, ExternalLink, Camera, Pencil, Trash2, AlertTriangle, Move, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"
import { useTranslation, formatDateLocale, formatMonthsPassedLocale } from "@/lib/i18n"
import { usePageLoadingGate } from "@/lib/loadingGate"
import {
  getCarImageStyle,
  clampImagePosition,
  clampImageScale,
  DEFAULT_IMAGE_POSITION_X,
  DEFAULT_IMAGE_POSITION_Y,
  DEFAULT_IMAGE_SCALE,
  MIN_IMAGE_SCALE,
  MAX_IMAGE_SCALE,
} from "@/utils/carImage"
import { stripImageMetadata } from "@/utils/stripImageMetadata"
import { getSafeExternalUrl } from "@/utils/safeUrl"
import { WISHLIST_GENRES } from "@/lib/wishlistGenres"
import { FUEL_TYPES } from "@/lib/fuelTypes"

const CAR_STATUS_KEYS = ["pending", "active", "archived", "archived_excluded"] as const
type CarStatus = typeof CAR_STATUS_KEYS[number]

// ウィッシュリストの絞り込み対象ステータス
const WISH_STATUS_KEYS = ["considering", "purchased", "installed", "given_up"] as const
type WishStatus = typeof WISH_STATUS_KEYS[number]

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
  const [savingCar, setSavingCar] = useState(false)
  const [savingWish, setSavingWish] = useState(false)

  // 削除確認モーダル用
  const [deleteCarTarget, setDeleteCarTarget] = useState<any | null>(null)
  const [deleteCarConfirmName, setDeleteCarConfirmName] = useState("")
  const [deletingCar, setDeletingCar] = useState(false)

  // 画像の位置、ズーム調整モーダル用
  const [adjustTarget, setAdjustTarget] = useState<any | null>(null)
  const [adjustPosX, setAdjustPosX] = useState(DEFAULT_IMAGE_POSITION_X)
  const [adjustPosY, setAdjustPosY] = useState(DEFAULT_IMAGE_POSITION_Y)
  const [adjustScale, setAdjustScale] = useState(DEFAULT_IMAGE_SCALE)
  const [savingPosition, setSavingPosition] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  const supabase = createClient()
  const { t, locale } = useTranslation()

  // 初回ローディング画面とデータ取得を連動させる
  usePageLoadingGate(!loading)

  // 車両追加フォームの状態管理
  const [name, setName] = useState("")
  const [maker, setMaker] = useState("")
  const [modelCode, setModelCode] = useState("")
  const [year, setYear] = useState("")
  const [grade, setGrade] = useState("")
  const [color, setColor] = useState("")
  const [fuelType, setFuelType] = useState("regular")
  const [currentOdo, setCurrentOdo] = useState("")
  const [firstRegistrationDate, setFirstRegistrationDate] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [purchaseOdo, setPurchaseOdo] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [includePriceInCost, setIncludePriceInCost] = useState(false)
  const [carStatus, setCarStatus] = useState<CarStatus>("active")

  // ウィッシュリストのステータス絞り込み
  const [wishFilters, setWishFilters] = useState<WishStatus[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)

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
    setGrade(""); setColor(""); setFuelType("regular"); setCurrentOdo("");
    setFirstRegistrationDate(""); setPurchaseDate(""); setPurchaseOdo("");
    setPurchasePrice(""); setIncludePriceInCost(false);
    setCarStatus("active")
  }

  // 新規車両の登録処理
  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingCar(true)
    try {
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
    } finally {
      setSavingCar(false)
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
    setFuelType(car.fuel_type || "regular")
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

    setSavingCar(true)
    try {
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
    } finally {
      setSavingCar(false)
    }
  }

  // 車両の物理削除処理
  // records / wishlists / recurring_costs は FK の ON DELETE CASCADE で車本体と一緒に削除される。
  // Storage の車画像は FK では消えないため、削除前に明示的に削除する。
  const handleDeleteCar = async () => {
    if (!deleteCarTarget) return
    if (deleteCarConfirmName !== deleteCarTarget.name) {
      toast.error(t("garage.name_mismatch"))
      return
    }

    setDeletingCar(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Storage の車画像を削除する（過去にアップロードした孤立画像も car_id プレフィックスで一括削除）
      const { data: files } = await supabase.storage.from("cars").list(user.id)
      if (files && files.length > 0) {
        const targets = files
          .filter((f) => f.name.startsWith(`${deleteCarTarget.id}-`))
          .map((f) => `${user.id}/${f.name}`)
        if (targets.length > 0) {
          await supabase.storage.from("cars").remove(targets)
        }
      }

      // 車本体を物理削除する（紐づく records、wishlists、recurring_costs は CASCADE で削除）
      const { error } = await supabase.from("cars").delete().eq("id", deleteCarTarget.id)
      if (error) {
        toast.error(t("common.delete_failed") + ": " + error.message)
      } else {
        toast.success(t("garage.car_deleted", { name: deleteCarTarget.name }))
        setDeleteCarTarget(null)
        setDeleteCarConfirmName("")
        fetchData()
      }
    } finally {
      setDeletingCar(false)
    }
  }

  // ウィッシュリストアイテムの追加処理
  const handleAddWish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wishCarId) return alert(t("records.select_car_alert"))

    setSavingWish(true)
    try {
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
    } finally {
      setSavingWish(false)
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

    setSavingWish(true)
    try {
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
    } finally {
      setSavingWish(false)
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

    // 極端に大きいファイルはブラウザでのデコードに負荷がかかるため上限を設ける
    if (file.size > 30 * 1024 * 1024) {
      toast.error(t("garage.file_too_large"))
      return
    }

    const toastId = toast.loading(t("garage.uploading_photo"))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // public バケットに保存するため、アップロード前に EXIF情報 を除去する
    // 5MB を超える画像は、品質・解像度の順で段階的に圧縮して 5MB 以下に収める
    let cleanedFile: File
    try {
      cleanedFile = (await stripImageMetadata(file, { maxBytes: 5 * 1024 * 1024 })).file
    } catch {
      toast.dismiss(toastId)
      toast.error(t("garage.upload_failed"))
      return
    }

    // Storageにアップロード
    const fileName = `${carId}-${Date.now()}.jpg` // メタデータ除去後は常に jpg で重複しないファイル名を生成
    const filePath = `${user.id}/${fileName}` // ユーザーごとのフォルダに保存

    const { error: uploadError } = await supabase.storage
      .from('cars')
      .upload(filePath, cleanedFile, { contentType: cleanedFile.type })

    if (uploadError) {
      toast.dismiss(toastId)
      toast.error(t("garage.upload_failed") + ": " + uploadError.message)
      return
    }

    // アップロードした画像の公開URLを取得
    const { data: { publicUrl } } = supabase.storage.from('cars').getPublicUrl(filePath)

    // cars テーブルの image_url を更新
    // 写真を差し替えると前の位置、ズームは新しい画像に合わないため、中央、等倍に初期化する
    const { error: updateError } = await supabase.from('cars').update({
      image_url: publicUrl,
      image_position_x: DEFAULT_IMAGE_POSITION_X,
      image_position_y: DEFAULT_IMAGE_POSITION_Y,
      image_scale: DEFAULT_IMAGE_SCALE,
    }).eq('id', carId)

    toast.dismiss(toastId)
    if (updateError) {
      toast.error(t("garage.db_update_failed"))
    } else {
      // 画像への差し替えが成功したら、古い画像を Storage から削除
      // 失敗しても表示は壊れず、残ったファイルは次回の写真変更・車両削除時に処理されるため、エラーは表示しない
      try {
        const { data: files, error: listError } = await supabase.storage.from("cars").list(user.id)
        if (listError) console.warn("old image cleanup: list failed", listError.message)
        if (files && files.length > 0) {
          const targets = files
            .filter((f) => f.name.startsWith(`${carId}-`) && f.name !== fileName)
            .map((f) => `${user.id}/${f.name}`)
          if (targets.length > 0) {
            const { error: removeError } = await supabase.storage.from("cars").remove(targets)
            if (removeError) console.warn("old image cleanup: remove failed", removeError.message)
          }
        }
      } catch {
      }

      toast.success(t("garage.photo_set"))
      fetchData() // 画面を更新して写真を表示
      // アップロード直後に位置・ズーム調整モーダルを開き、新しい画像をすぐ調整できるようにする
      const baseCar = cars.find((c) => c.id === carId) || {}
      handleStartAdjustImage({
        ...baseCar,
        id: carId,
        image_url: publicUrl,
        image_position_x: DEFAULT_IMAGE_POSITION_X,
        image_position_y: DEFAULT_IMAGE_POSITION_Y,
        image_scale: DEFAULT_IMAGE_SCALE,
      })
    }
  }

  // 画像の位置、ズーム調整モーダルを開く（既存ユーザーは NULL の可能性があるためデフォルトにフォールバック）
  const handleStartAdjustImage = (car: any) => {
    setAdjustTarget(car)
    setAdjustPosX(car.image_position_x ?? DEFAULT_IMAGE_POSITION_X)
    setAdjustPosY(car.image_position_y ?? DEFAULT_IMAGE_POSITION_Y)
    setAdjustScale(car.image_scale ?? DEFAULT_IMAGE_SCALE)
  }

  // プレビュー上のドラッグで位置を調整する
  const handleAdjustPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startY: e.clientY, baseX: adjustPosX, baseY: adjustPosY }
  }

  const handleAdjustPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current || !previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    // ドラッグ量をプレビュー枠基準で % に換算（画像を掴んで動かす感覚にするため符号を反転）
    const dxPct = ((e.clientX - dragState.current.startX) / rect.width) * 100
    const dyPct = ((e.clientY - dragState.current.startY) / rect.height) * 100
    setAdjustPosX(clampImagePosition(dragState.current.baseX - dxPct))
    setAdjustPosY(clampImagePosition(dragState.current.baseY - dyPct))
  }

  const handleAdjustPointerUp = () => {
    dragState.current = null
  }

  // 位置、ズームを cars テーブルに保存する
  const handleSaveImagePosition = async () => {
    if (!adjustTarget) return
    setSavingPosition(true)
    const payload = {
      image_position_x: clampImagePosition(adjustPosX),
      image_position_y: clampImagePosition(adjustPosY),
      image_scale: clampImageScale(adjustScale),
    }
    const { error } = await supabase.from("cars").update(payload).eq("id", adjustTarget.id)
    setSavingPosition(false)
    if (error) {
      toast.error(t("garage.db_update_failed"))
    } else {
      toast.success(t("garage.position_saved"))
      setAdjustTarget(null)
      fetchData()
    }
  }

  // ステータス絞り込みの選択切り替え
  const toggleWishFilter = (key: WishStatus) => {
    setWishFilters((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
  }

  // ステータス絞り込みを適用したウィッシュリスト
  const filteredWishlists = wishFilters.length === 0
    ? wishlists
    : wishlists.filter((w) => wishFilters.includes(w.status))

  // ステータスの色を定義
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'considering': return "bg-slate-100 dark:bg-muted text-slate-600 dark:text-muted-foreground border-slate-200 dark:border-border"
      case 'purchased': return "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900"
      case 'installed': return "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-300 border-green-200 dark:border-green-900"
      case 'given_up': return "bg-slate-50 dark:bg-muted text-slate-400 dark:text-muted-foreground border-slate-200 dark:border-border opacity-60"
      default: return "bg-slate-100 dark:bg-muted"
    }
  }

  return (
    <main className="p-4 space-y-6 max-w-5xl mx-auto">
      <header className="pt-4 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">{t("garage.title")}</h1>
        <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground tracking-wider mt-1">{t("garage.subtitle")}</p>
      </header>

      <Tabs defaultValue="mycars" className="w-full">
        {/* タブ選択状態を再取得時にも保持するため、Tabsルートは常にマウントしたまま中身だけ切り替える */}
        {!loading && (
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 dark:bg-muted p-[3px]">
            <TabsTrigger value="mycars" className="flex items-center gap-2 font-bold uppercase tracking-wider">
              <CarFront size={14} /> {t("garage.my_cars")}
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="flex items-center gap-2 font-bold uppercase tracking-wider">
              <ListTodo size={14} /> {t("garage.wishlist")}
            </TabsTrigger>
          </TabsList>
        )}

        {loading && <SkeletonTabs className="mb-6" />}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-card rounded-xl shadow-sm dark:border dark:border-border overflow-hidden">
                <Skeleton className="h-48 rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-7 w-36 rounded-lg" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="grid grid-cols-2 divide-x [&>*:nth-child(even)]:border-e-0 divide-slate-100 dark:divide-border border-t border-slate-100 dark:border-border">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="p-4 space-y-2">
                      <Skeleton className="h-2.5 w-16" />
                      <Skeleton className="h-5 w-20" />
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
            <Card className="border-none shadow-md bg-white dark:bg-card mb-6">
              <CardContent className="p-6 relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-400 dark:text-muted-foreground" onClick={resetCarForm}>
                  <X className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-foreground mb-6">
                  {editCarId ? t("garage.edit_car") : t("garage.add_car")}
                </h2>

                <form onSubmit={editCarId ? handleUpdateCar : handleAddCar} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("garage.car_name")} <span className="text-red-500">{t("common.required")}</span></Label>
                    <Input placeholder="TOYOTA 86" value={name} onChange={(e) => setName(e.target.value)} required className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>{t("garage.maker")}</Label><Input placeholder="" value={maker} onChange={(e) => setMaker(e.target.value)} className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground" /></div>
                    <div className="space-y-2"><Label>{t("garage.model_code")}</Label><Input placeholder="ZN6" value={modelCode} onChange={(e) => setModelCode(e.target.value)} className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground" /></div>
                    <div className="space-y-2"><Label>{t("garage.year")}</Label><Input type="number" placeholder="2018" value={year} onChange={(e) => setYear(e.target.value)} className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground" /></div>
                    <div className="space-y-2"><Label>{t("common.grade")}</Label><Input placeholder="GT Limited" value={grade} onChange={(e) => setGrade(e.target.value)} className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground" /></div>
                    <div className="space-y-2"><Label>{t("garage.body_color")}</Label><Input placeholder="" value={color} onChange={(e) => setColor(e.target.value)} className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground" /></div>
                    <div className="space-y-2"><Label>{t("garage.current_odo")} <span className="text-red-500">{t("common.required")}</span></Label><Input type="number" placeholder="52400" value={currentOdo} onChange={(e) => setCurrentOdo(e.target.value)} required className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground" /></div>
                    <div className="space-y-2"><Label>{t("garage.first_registration")}</Label><Input type="month" value={firstRegistrationDate} onChange={(e) => setFirstRegistrationDate(e.target.value)} className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground appearance-none h-8 min-h-0" /></div>
                    <div className="space-y-2"><Label>{t("common.delivery_date")}</Label><Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground appearance-none h-8 min-h-0" /></div>
                    <div className="space-y-2"><Label>{t("garage.purchase_odo")}</Label><Input type="number" placeholder="48000" value={purchaseOdo} onChange={(e) => setPurchaseOdo(e.target.value)} className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground" /></div>
                    <div className="space-y-2"><Label>{t("garage.purchase_price")}</Label><Input type="number" placeholder="2500000" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="placeholder:text-slate-300 dark:placeholder:text-muted-foreground" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("garage.fuel_type")}</Label>
                    <Select value={fuelType} onValueChange={setFuelType}>
                      <SelectTrigger><SelectValue placeholder={t("garage.select_fuel_type")} /></SelectTrigger>
                      <SelectContent>
                        {FUEL_TYPES.map(key => (
                          <SelectItem key={key} value={key}>{t(`fuel_types.${key}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-border bg-slate-50/50 dark:bg-muted/50 px-4 py-3">
                    <div className="space-y-0.5 pr-3">
                      <Label htmlFor="include-price" className="cursor-pointer">{t("garage.include_price_in_cost")}</Label>
                      <p className="text-[11px] text-slate-400 dark:text-muted-foreground">{t("garage.include_price_in_cost_hint")}</p>
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
                    <Button type="submit" className="px-12 font-bold" disabled={savingCar}>
                      {savingCar ? t("common.saving") : (editCarId ? t("common.update") : t("common.register"))}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {!loading && !isAddingCar && !editCarId && cars.length === 0 && (
            <div className="text-center py-20">
              <CarFront className="mx-auto h-12 w-12 text-slate-300 dark:text-muted-foreground mb-3" />
              <p className="text-slate-500 dark:text-muted-foreground font-medium">{t("garage.no_cars")}</p>
            </div>
          )}

          {!loading && !isAddingCar && !editCarId && cars.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cars.map((car) => (
                <Card key={car.id} className="border-none shadow-sm overflow-hidden bg-white dark:bg-card p-0 relative group">
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                    {/* 画像の位置、ズーム調整ボタン（画像が設定済みの場合のみ） */}
                    {car.image_url && (
                      <button
                        type="button"
                        onClick={() => handleStartAdjustImage(car)}
                        className="bg-black/40 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer transition-all backdrop-blur-sm opacity-80 hover:opacity-100 shadow-lg"
                        title={t("garage.adjust_image")}
                      >
                        <Move size={16} />
                      </button>
                    )}
                    {/* 画像アップロードボタン */}
                    <Label className="bg-black/40 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer transition-all backdrop-blur-sm opacity-80 hover:opacity-100 shadow-lg">
                      <Camera size={16} />
                      <Input
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        className="hidden"
                        onChange={(e) => handleImageUpload(car.id, e)}
                      />
                    </Label>
                  </div>

                  <div className="relative aspect-[11/6] bg-neutral-800 w-full m-0 border-b border-slate-100 dark:border-border overflow-hidden">
                    {/* 登録済みの画像がある場合は表示 */}
                    {car.image_url && (
                      <img src={car.image_url} alt={car.name} className="absolute inset-0 w-full h-full object-cover" style={getCarImageStyle(car)} />
                    )}
                  </div>

                  <CardContent className="p-0 m-0">
                    <div className="px-4 pb-4 bg-white dark:bg-card relative z-20">
                      <h3 className="text-2xl font-black text-slate-800 dark:text-foreground tracking-wider mt-1">{car.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-muted-foreground tracking-widest">{car.maker} {car.model_code} {car.year ? `/ ${t("common.year_format", { year: car.year })}` : ""}</p>
                    </div>
                    <div className="grid grid-cols-2 divide-x [&>*:nth-child(even)]:border-e-0 divide-slate-100 dark:divide-border border-t border-b border-slate-100 dark:border-border">
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 dark:text-muted-foreground mb-1 uppercase tracking-widest">{t("common.odometer")}</p>
                        <p className="text-lg font-black text-slate-800 dark:text-foreground tracking-wider">{car.current_odo.toLocaleString()} <span className="text-[10px]">{t("common.km_unit")}</span></p>
                      </div>
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 dark:text-muted-foreground mb-1 uppercase tracking-widest">{t("common.total_cost")}</p>
                        <p className="text-lg font-black text-slate-800 dark:text-foreground tracking-wider">¥{
                          (records.filter(r => r.car_id === car.id).reduce((sum, r) => sum + r.amount, 0)
                            + (car.include_price_in_cost ? (car.purchase_price || 0) : 0)).toLocaleString()
                        }</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x [&>*:nth-child(even)]:border-e-0 divide-slate-100 dark:divide-border border-b border-slate-100 dark:border-border bg-slate-50/30 dark:bg-muted/30">
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 dark:text-muted-foreground mb-1 uppercase tracking-widest">{t("common.distance_since_delivery")}</p>
                        <p className="text-lg font-black text-slate-800 dark:text-foreground tracking-wider">+{Math.max(0, car.current_odo - (car.purchase_odo || 0)).toLocaleString()} <span className="text-[10px]">{t("common.km_unit")}</span></p>
                      </div>
                      <div className="p-4">
                        <p className="text-[9px] font-bold text-slate-400 dark:text-muted-foreground mb-1 uppercase tracking-widest">{t("common.ownership_period")}</p>
                        <p className="text-lg font-black text-slate-800 dark:text-foreground tracking-wider">{formatMonthsPassedLocale(car.purchase_date, locale)}</p>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col gap-2.5 text-xs bg-slate-50/50 dark:bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 dark:text-muted-foreground font-bold uppercase tracking-widest text-[9px]">{t("common.delivery_date")}</span>
                        <span className="font-bold text-slate-700 dark:text-foreground tracking-wider text-[10px]">{formatDateLocale(car.purchase_date, locale)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 dark:text-muted-foreground font-bold uppercase tracking-widest text-[9px]">{t("common.car_age")}</span>
                        <span className="font-bold text-slate-700 dark:text-foreground tracking-wider text-[10px]">{formatMonthsPassedLocale(car.first_registration_date, locale)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400 dark:text-muted-foreground font-bold uppercase tracking-widest text-[9px]">{t("common.grade")}</span>
                        <span className="font-bold text-slate-700 dark:text-foreground tracking-wider text-[10px]">{car.grade || "-"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-400 dark:text-muted-foreground font-bold uppercase tracking-widest text-[9px]">{t("garage.status")}</span>
                          <span className="font-bold text-slate-700 dark:text-foreground tracking-wider text-[10px]">{t(`garage.car_status_${car.status}`)}</span>
                        </div>
                        {/* 編集・削除アクション */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEditCar(car)}
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-border text-slate-500 dark:text-muted-foreground hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                            title={t("common.edit")}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => { setDeleteCarTarget(car); setDeleteCarConfirmName(""); }}
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-border text-slate-500 dark:text-muted-foreground hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4" onClick={() => { setDeleteCarTarget(null); setDeleteCarConfirmName(""); }}>
            <Card className="border-none shadow-2xl bg-white dark:bg-card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-red-500">
                  <AlertTriangle size={24} />
                  <h2 className="text-lg font-extrabold text-slate-800 dark:text-foreground">{t("garage.delete_car_title")}</h2>
                </div>
                <p className="text-sm text-slate-600 dark:text-muted-foreground">
                  <span className="font-bold text-slate-800 dark:text-foreground">{t("garage.delete_car_message", { name: deleteCarTarget.name })}</span><br />
                  {t("garage.delete_car_warning")}
                </p>
                <p className="text-xs font-bold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
                  {t("garage.delete_car_records_count", { count: records.filter((r) => r.car_id === deleteCarTarget.id).length })}
                </p>
                <p className="text-xs text-slate-500 dark:text-muted-foreground bg-slate-50 dark:bg-muted rounded-lg px-3 py-2">
                  {t("garage.delete_car_archive_hint")}
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-foreground">
                    {t("garage.delete_confirm_instruction")}
                  </p>
                  <Input
                    placeholder={deleteCarTarget.name}
                    value={deleteCarConfirmName}
                    onChange={(e) => setDeleteCarConfirmName(e.target.value)}
                    className="bg-white dark:bg-card placeholder:text-slate-300 dark:placeholder:text-muted-foreground"
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
                    disabled={deleteCarConfirmName !== deleteCarTarget.name || deletingCar}
                    onClick={handleDeleteCar}
                  >
                    {deletingCar ? t("common.deleting") : t("common.delete_action")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 画像の位置、ズーム調整モーダル */}
        {adjustTarget && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4" onClick={() => setAdjustTarget(null)}>
            <Card className="border-none shadow-2xl bg-white dark:bg-card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-slate-800 dark:text-foreground">
                  <Move size={20} />
                  <h2 className="text-lg font-extrabold">{t("garage.adjust_image_title")}</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium">{t("garage.adjust_image_hint")}</p>

                {/* プレビュー */}
                <div
                  ref={previewRef}
                  className="relative aspect-[11/6] w-full bg-neutral-800 rounded-lg overflow-hidden cursor-move select-none touch-none"
                  onPointerDown={handleAdjustPointerDown}
                  onPointerMove={handleAdjustPointerMove}
                  onPointerUp={handleAdjustPointerUp}
                  onPointerCancel={handleAdjustPointerUp}
                >
                  <img
                    src={adjustTarget.image_url}
                    alt={adjustTarget.name}
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={getCarImageStyle({ image_position_x: adjustPosX, image_position_y: adjustPosY, image_scale: adjustScale })}
                  />
                </div>

                {/* ズームスライダー */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-600 dark:text-muted-foreground">{t("garage.zoom")}</Label>
                    <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground tabular-nums">{adjustScale.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_IMAGE_SCALE}
                    max={MAX_IMAGE_SCALE}
                    step={0.1}
                    value={adjustScale}
                    onChange={(e) => setAdjustScale(clampImageScale(parseFloat(e.target.value)))}
                    className="w-full accent-slate-800 cursor-pointer"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 font-bold" onClick={() => setAdjustTarget(null)}>
                    {t("common.cancel")}
                  </Button>
                  <Button className="flex-1 font-bold" disabled={savingPosition} onClick={handleSaveImagePosition}>
                    {savingPosition ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ウィッシュリスト（欲しいもの） */}
        <TabsContent value="wishlist" className="space-y-4">
          <div className="flex items-center justify-end gap-4">
            {/* ステータス絞り込みボタン（アイテムがあるときのみ表示、絞り込み中は選択数をバッジ表示） */}
            {!loading && !isAddingWish && !editWishId && wishlists.length > 0 && (
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                title={t("garage.wish_filter_title")}
                className="relative h-7 flex items-center px-2.5 rounded-lg border bg-white text-slate-500 border-slate-300 hover:text-slate-700 hover:border-slate-400 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground transition-colors"
              >
                <SlidersHorizontal size={15} />
                {wishFilters.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-slate-400 text-white dark:bg-surface-2 dark:text-foreground/80 text-[9px] font-semibold tabular-nums">
                    {wishFilters.length}
                  </span>
                )}
              </button>
            )}
            {!loading && !isAddingWish && !editWishId && cars.length > 0 && (
              <Button onClick={() => setIsAddingWish(true)} size="sm" className="font-bold shrink-0">
                <Plus className="mr-1 h-4 w-4" /> {t("common.add")}
              </Button>
            )}
          </div>

          {/* ステータス絞り込みモーダル */}
          {isFilterOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4" onClick={() => setIsFilterOpen(false)}>
              <Card className="border-none shadow-2xl bg-white dark:bg-card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 text-slate-800 dark:text-foreground">
                    <SlidersHorizontal size={20} />
                    <h2 className="text-lg font-extrabold">{t("garage.wish_filter_title")}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* すべて */}
                    <button
                      type="button"
                      onClick={() => setWishFilters([])}
                      aria-pressed={wishFilters.length === 0}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition-colors ${
                        wishFilters.length === 0
                          ? "bg-slate-800 text-white border-slate-800 dark:bg-foreground dark:text-background dark:border-foreground"
                          : "bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
                      }`}
                    >
                      {t("garage.wish_filter_all")}
                      <span className="ml-1.5 tabular-nums opacity-60">{wishlists.length}</span>
                    </button>
                    {/* 各ステータスチップ */}
                    {WISH_STATUS_KEYS.map((key) => {
                      const active = wishFilters.includes(key)
                      const count = wishlists.filter((w) => w.status === key).length
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleWishFilter(key)}
                          aria-pressed={active}
                          className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition-colors ${
                            active
                              ? "bg-slate-800 text-white border-slate-800 dark:bg-foreground dark:text-background dark:border-foreground"
                              : "bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300 dark:bg-card dark:text-muted-foreground dark:border-border dark:hover:text-foreground"
                          }`}
                        >
                          {t(`wishlist_statuses.${key}`)}
                          <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                  <Button variant="outline" className="w-full font-bold" onClick={() => setIsFilterOpen(false)}>
                    {t("common.close")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {!loading && cars.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-500 dark:text-muted-foreground font-medium">{t("garage.register_car_first_line1")}<br />{t("garage.register_car_first_line2")}</p>
            </div>
          )}

          {(isAddingWish || editWishId) && (
            <Card className="border-none shadow-md bg-white dark:bg-card mb-6">
              <CardContent className="p-6 relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-400 dark:text-muted-foreground" onClick={resetWishForm}>
                  <X className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-foreground mb-6">
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
                          {WISHLIST_GENRES.map(key => (
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
                    <Button type="submit" className="px-12 font-bold" disabled={savingWish}>
                      {savingWish ? t("common.saving") : (editWishId ? t("common.update") : t("common.add"))}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {!loading && !isAddingWish && !editWishId && wishlists.length === 0 && cars.length > 0 && (
            <div className="text-center py-20">
              <ListTodo className="mx-auto h-12 w-12 text-slate-300 dark:text-muted-foreground mb-3" />
              <p className="text-slate-500 dark:text-muted-foreground font-medium">{t("garage.no_wishlist")}</p>
            </div>
          )}

          {/* 絞り込み結果が無いとき */}
          {!loading && !isAddingWish && !editWishId && wishlists.length > 0 && filteredWishlists.length === 0 && (
            <div className="text-center py-20">
              <ListTodo className="mx-auto h-12 w-12 text-slate-300 dark:text-muted-foreground mb-3" />
              <p className="text-slate-500 dark:text-muted-foreground font-medium">{t("garage.no_filtered_wishlist")}</p>
            </div>
          )}

          {!loading && !isAddingWish && !editWishId && filteredWishlists.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWishlists.map((wish) => {
                const statusStyle = getStatusStyle(wish.status)
                // http(s) 以外のスキームは弾き、安全なURLのみリンク化
                const safeUrl = getSafeExternalUrl(wish.url)
                return (
                  <Card key={wish.id} className="border border-slate-100 dark:border-border shadow-sm bg-white dark:bg-card overflow-hidden relative">
                    {/* 編集・削除ボタン（右上に常時表示） */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                      <button
                        onClick={() => handleStartEditWish(wish)}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-border text-slate-500 dark:text-muted-foreground hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        title={t("common.edit")}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteWish(wish.id)}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-border text-slate-500 dark:text-muted-foreground hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
                        title={t("common.delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-start mb-2 pr-16">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-muted-foreground bg-slate-100 dark:bg-surface-2 px-2 py-0.5 rounded-sm">
                            {t(`wishlist_genres.${wish.genre}`)} / {wish.cars.name}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
                            {t(`wishlist_statuses.${wish.status}`)}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-foreground text-lg leading-tight mb-1">{wish.item_name}</h3>

                        {wish.price_estimate > 0 && (
                          <p className="text-sm font-bold text-blue-600 mb-2">¥{wish.price_estimate.toLocaleString()}</p>
                        )}

                        {wish.memo && (
                          <p className="text-xs text-slate-500 dark:text-muted-foreground bg-slate-50 dark:bg-muted p-2 rounded-md mb-3 line-clamp-2">
                            {wish.memo}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-50 dark:border-border">
                        {safeUrl ? (
                          <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors">
                            <ExternalLink size={12} /> {t("garage.open_link")}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-muted-foreground">{t("garage.no_link")}</span>
                        )}

                        {/* ステータス変更ドロップダウン */}
                        <div className="w-32">
                          <Select defaultValue={wish.status} onValueChange={(val) => updateWishStatus(wish.id, val)}>
                            <SelectTrigger className="h-7 text-xs font-bold bg-slate-50 dark:bg-muted border-none">
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