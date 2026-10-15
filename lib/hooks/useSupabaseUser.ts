import useSWR, { mutate as globalMutate } from "swr"
import { getSupabaseBrowserClient } from "@/utils/supabase"

const AUTH_USER_KEY = "auth-user"

// ログイン中ユーザーのuser_idをアプリ全体でキャッシュする
export function useSupabaseUser() {
  const { data, isLoading, error } = useSWR(AUTH_USER_KEY, async () => {
    const supabase = getSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  })

  return { user: data ?? null, isLoading, error }
}

// クライアント遷移でログイン画面へ移る場合、キャッシュ済みのユーザーが残らないよう破棄する
export async function signOutAndClearUser(): Promise<void> {
  await getSupabaseBrowserClient().auth.signOut()
  await globalMutate(AUTH_USER_KEY, null, { revalidate: false })
}
