"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  // iOSのステータスバーはバー下端から下のコンテンツの色も取り込むため、トースト(sonner)を上方向へドラッグしてホールドしてもサンプリング圏内に入らないよう追従を制限
  useEffect(() => {
    const onTouchMove = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest?.("[data-sonner-toast]")) {
        event.preventDefault()
      }
    }

    const releaseList = () => {
      const list = document.querySelector("[data-sonner-toaster]")
      if (!list) return
      list.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
      window.setTimeout(() => {
        list.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }))
      }, 50)
    }

    let touchEndTimer: number | undefined

    const onPointerCancel = () => {
      document
        .querySelectorAll<HTMLElement>('[data-sonner-toast][data-swiping="true"]')
        .forEach((el) => {
          const y = parseFloat(el.style.getPropertyValue("--swipe-amount-y") || "0")
          if (y <= -28) {
            dismissSwipedToast(el)
          } else {
            el.style.setProperty("--swipe-amount-x", "0px")
            el.style.setProperty("--swipe-amount-y", "0px")
          }
        })
      releaseList()
    }

    const onTouchEnd = () => {
      window.clearTimeout(touchEndTimer)
      touchEndTimer = window.setTimeout(releaseList, 1000)
    }

    const dismissSwipedToast = (el: HTMLElement) => {
      if (el.dataset.milenoteDismissed === "true") return
      el.dataset.milenoteDismissed = "true"
      el.style.setProperty("--swipe-amount-y", "-46px")
      el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
    }

    let lastMoveY = 0
    let lastMoveTime = 0

    const onPointerDown = () => {
      lastMoveY = 0
      lastMoveTime = 0
    }

    const onPointerMove = () => {
      const el = document.querySelector<HTMLElement>('[data-sonner-toast][data-swiping="true"]')
      if (!el) return
      const y = parseFloat(el.style.getPropertyValue("--swipe-amount-y") || "0")
      const now = performance.now()
      if (lastMoveTime > 0) {
        const velocity = (y - lastMoveY) / (now - lastMoveTime)
        if (y <= -15 && velocity <= -0.35) {
          dismissSwipedToast(el)
        }
      }
      lastMoveY = y
      lastMoveTime = now
    }

    const onPointerUpCapture = () => {
      document
        .querySelectorAll<HTMLElement>('[data-sonner-toast][data-swiping="true"]')
        .forEach((el) => {
          const y = parseFloat(el.style.getPropertyValue("--swipe-amount-y") || "0")
          if (y <= -28 && y > -46) {
            el.style.setProperty("--swipe-amount-y", "-46px")
          } else if (Math.abs(y) < 12) {
            el.style.setProperty("--swipe-amount-y", "0px")
          }
        })
    }

    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointercancel", onPointerCancel)
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    window.addEventListener("pointerup", onPointerUpCapture, true)
    return () => {
      window.clearTimeout(touchEndTimer)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointercancel", onPointerCancel)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("pointerup", onPointerUpCapture, true)
    }
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
      position="top-center"
      mobileOffset={{ top: "calc(env(safe-area-inset-top, 0px) + 40px)" }}
    />
  )
}

export { Toaster }
