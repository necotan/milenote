// body の padding-top と min-h-screen が重なると文書が画面より高くなり上に余白までスクロールできてしまうため、文書スクロールは globals.css で止め、この枠の中だけをスクロールさせる
// fixed にすると iOS のホーム画面アプリで起動直後にステータスバー分短い高さで切り取られ、下端のフッターが隠れるため通常フローに置く
// iOS のホーム画面アプリでは起動直後の dvh がステータスバー分短く報告されるため、standalone では lvh を使用
export default function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div data-auth-screen className="-mt-[env(safe-area-inset-top)] h-dvh standalone:h-lvh overflow-y-auto overscroll-none bg-white dark:bg-background">
      <div className="relative flex min-h-full items-center justify-center p-8">
        {children}
      </div>
    </div>
  )
}
