"use client"

import { createContext, useContext, useEffect, ReactNode } from "react"

type LoadingGate = {
  // このページが初回ローディングの完了を期待していることをゲートに伝える
  setExpecting: () => void
  // このページのデータ取得が完了したことをゲートに伝える
  setReady: () => void
}

const LoadingGateContext = createContext<LoadingGate | null>(null)

export function LoadingGateProvider({ value, children }: { value: LoadingGate; children: ReactNode }) {
  return <LoadingGateContext.Provider value={value}>{children}</LoadingGateContext.Provider>
}

// ページのデータ取得状況を初回ローディング画面と連動させる。
// loaded が false の間はローディング画面を維持し、true になってから実画面を表示することで、ローディング画面のあとにスケルトンが一瞬挟まるのを防ぐ。
export function usePageLoadingGate(loaded: boolean) {
  const ctx = useContext(LoadingGateContext)

  useEffect(() => {
    ctx?.setExpecting()
  }, [ctx])

  useEffect(() => {
    if (loaded) ctx?.setReady()
  }, [loaded, ctx])
}
