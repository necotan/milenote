import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

// サーバー描画とハイドレーション中は false、それ以降は true を返す
// next-themes のテーマなどクライアントでしか確定しない値を、SSR の初期HTMLと食い違わないよう表示し分けるために使う
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
