import { randomBytes } from 'crypto'

// Generates a unique 16-digit numeric barcode.
// Uses last 10 digits of timestamp + 6 crypto-random digits.
// Collision probability per invocation: ~1 in 1,000,000.
export function generateBarcode(): string {
  const ts = Date.now().toString().slice(-10)
  const rand = (parseInt(randomBytes(3).toString('hex'), 16) % 1_000_000)
    .toString()
    .padStart(6, '0')
  return ts + rand
}
