import useSWR from "swr"
import { getSupabaseBrowserClient } from "@/utils/supabase"
import type { Car } from "@/lib/types"

// ユーザーの車両を全ステータス（deleted以外は物理削除で存在しないため実質全件）取得する
// 用途に応じたstatusの絞り込みは呼び出し側で行うこと
export function useCars(userId: string | null | undefined) {
  const { data, isLoading, error, mutate } = useSWR(
    userId ? ["cars", userId] : null,
    async ([, uid]: [string, string]) => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.from("cars").select("*").eq("user_id", uid)
      if (error) throw error
      return (data ?? []) as Car[]
    }
  )

  return { cars: data ?? [], isLoading, error, mutate }
}
