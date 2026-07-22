import { generateFromSeed } from './names'

const CACHE_KEY = 'ckawwaz_identity_v2'

function hashString(str: string): number {
  let h = 2166136261 // FNV-1a 32-bit offset basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) // FNV prime
  }
  return h >>> 0 // unsigned 32-bit
}

function deviceFingerprint(): string {
  const ua   = navigator.userAgent
  const res  = `${screen.width}x${screen.height}x${screen.colorDepth}`
  const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone
  const lang = navigator.language
  const cores = navigator.hardwareConcurrency ?? 0
  return [ua, res, tz, lang, cores].join('|')
}

export interface Identity {
  name: string
  color: string
  ip: string
}

export async function getIdentity(): Promise<Identity> {
  // Return cached identity if available
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as Identity
      if (parsed.name && parsed.color) return parsed
    }
  } catch { /* ignore */ }

  // Fetch real client IP from the server
  let ip = '0.0.0.0'
  try {
    const res = await fetch('/api/identity')
    if (res.ok) {
      const data = (await res.json()) as { ip: string }
      ip = data.ip ?? ip
    }
  } catch { /* offline / dev fallback */ }

  const fingerprint = `${ip}|${deviceFingerprint()}`
  const seed = hashString(fingerprint)
  const { name, color } = generateFromSeed(seed)

  const identity: Identity = { name, color, ip }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(identity))
  } catch { /* storage full */ }

  return identity
}

/** Call this to force a fresh identity (e.g. if IP changed). */
export function clearIdentityCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
