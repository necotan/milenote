// body の padding-top と min-h-screen が重なると文書が画面より高くなり上に余白までスクロールできてしまうため、文書スクロールに乗らない fixed の枠で画面全体を囲う
// iOS のホーム画面アプリでは起動直後の dvh がステータスバー分短く報告されるため、standalone では lvh を使用
export default function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 top-0 h-dvh standalone:h-lvh overflow-y-auto overscroll-none bg-white dark:bg-background">
      <div className="relative flex min-h-full items-center justify-center p-8">
        {children}
      </div>
    </div>
  )
}
