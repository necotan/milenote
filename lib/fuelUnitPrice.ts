// 総額は Math.round で整数に丸めて保存しているため、単純な割り算では入力した単価に戻らない
// 小数点以下の桁数が少ない順に試し、掛け直して総額に一致する最初の値を入力値とみなす
export function deriveFuelUnitPrice(total: number, quantity: number): string {
  for (const digits of [0, 1, 2]) {
    const price = Number((total / quantity).toFixed(digits))
    if (Math.round(price * quantity) === total) return String(price)
  }
  return (total / quantity).toFixed(2)
}
