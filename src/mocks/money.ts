import { Decimal } from 'decimal.js'

export function money(value: Decimal) {
  const normalized = value.toFixed(8).replace(/\.?0+$/, '')
  return normalized || '0'
}

export function mul(price: string, quantity: number) {
  return money(new Decimal(price).times(quantity))
}

export function plus(left: string, right: string) {
  return money(new Decimal(left).plus(right))
}

export function minus(left: string, right: string) {
  return money(new Decimal(left).minus(right))
}

export function percent(amount: string, rate: string) {
  return money(new Decimal(amount).times(rate))
}

export function compare(left: string, right: string) {
  return new Decimal(left).comparedTo(right)
}
