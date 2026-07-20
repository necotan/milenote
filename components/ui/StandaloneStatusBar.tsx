"use client"

import { useEffect } from "react"

export default function StandaloneStatusBar() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    if (meta && !meta.content.includes("viewport-fit=cover")) {
      meta.content = `${meta.content}, viewport-fit=cover`
    }
  }, [])

  return <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
}
