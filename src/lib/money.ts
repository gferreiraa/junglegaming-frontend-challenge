import { Decimal } from 'decimal.js'

export function formatEth(value: string) {
  const normalized = new Decimal(value).toFixed(8).replace(/\.?0+$/, '')
  return `${normalized || '0'} ETH`
}
