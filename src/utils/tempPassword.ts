import crypto from 'crypto'

// Unambiguous alphabet (no 0/O, 1/l/I) so the password can be read aloud or copied by hand.
const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

/** A random one-time password; the account must change it at first sign-in. */
export function generateTemporaryPassword(length = 10): string {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length]
  return out
}
