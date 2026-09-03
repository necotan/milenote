import useSWR from "swr"
import { getSupabaseBrowserClient } from "@/utils/supabase"

// ログイン中ユーザーのuser_idをアプリ全体でキャッシュする
export function useSupabaseUser() {
  const { data, isLoading, error } = useSWR("auth-user", async () => {
    const supabase = getSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  })

  return { user: data ?? null, isLoading, error }
}
