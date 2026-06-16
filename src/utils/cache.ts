type CacheEntry = { data: unknown; expiresAt: number }

const store = new Map<string, CacheEntry>()

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.data as T

  const data = await fn()
  store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 })
  return data
}

export function invalidate(pattern: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) store.delete(key)
  }
}
