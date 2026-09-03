import useSWR from "swr"
import { getSupabaseBrowserClient } from "@/utils/supabase"
import type { Wishlist } from "@/lib/types"

// wishlistsテーブルにuser_idカラムが無いため、car_idを介してcars.user_idで絞り込む
export function useWishlists(userId: string | null | undefined) {
  const { data, isLoading, error, mutate } = useSWR(
    userId ? ["wishlists", userId] : null,
    async ([, uid]: [string, string]) => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from("wishlists")
        .select("*, cars!inner(user_id)")
        .eq("cars.user_id", uid)
      if (error) throw error
      return (data ?? []).map((row): Wishlist => ({
        id: row.id,
        car_id: row.car_id,
        item_name: row.item_name,
        price_estimate: row.price_estimate,
        url: row.url,
        memo: row.memo,
        genre: row.genre,
        status: row.status,
        created_at: row.created_at,
      }))
    }
  )

  return { wishlists: data ?? [], isLoading, error, mutate }
}
