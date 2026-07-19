"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

// 表示上は「52,500」のようにフォーマットし、親のstateには生の数値文字列（"52500"）を渡す
// type="number" はブラウザ仕様でカンマを表示できないため、type="text" + inputMode で実装する
type NumberInputProps = Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: string
  onValueChange: (value: string) => void
  // 小数を許可するか（給油量、単価など）
  decimal?: boolean
}

// 整数部のみ3桁カンマ区切りにする
function formatWithCommas(raw: string): string {
  if (raw === "") return ""
  const [intPart, ...fractionParts] = raw.split(".")
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return fractionParts.length > 0 ? `${formattedInt}.${fractionParts.join("")}` : formattedInt
}

function NumberInput({ value, onValueChange, decimal = false, ...props }: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    const caret = el.selectionStart ?? el.value.length
    const disallowed = decimal ? /[^\d.]/g : /[^\d]/g

    // カーソル位置より前にある有効文字（数字、小数点）の数を数える
    const digitsBeforeCaret = el.value.slice(0, caret).replace(disallowed, "").length

    let sanitized = el.value.replace(disallowed, "")
    if (decimal) {
      // 小数点は最初の1つだけ残す
      const firstDot = sanitized.indexOf(".")
      if (firstDot !== -1) {
        sanitized = sanitized.slice(0, firstDot + 1) + sanitized.slice(firstDot + 1).replace(/\./g, "")
      }
    }

    // 親stateが変化しないケース（数字以外の入力など）でもDOM表示を正しく保つため、フォーマット済みの値とカーソル位置をここで直接反映
    const formatted = formatWithCommas(sanitized)
    el.value = formatted
    let pos = 0
    let count = 0
    while (pos < formatted.length && count < digitsBeforeCaret) {
      if (formatted[pos] !== ",") count++
      pos++
    }
    el.setSelectionRange(pos, pos)

    onValueChange(sanitized)
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={formatWithCommas(value)}
      onChange={handleChange}
    />
  )
}

export { NumberInput }
