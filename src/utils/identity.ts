import { generateFromSeed } from './names'

const CACHE_KEY = 'ckawwaz_identity_v2'

function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function deviceFingerprint() {
  const ua    = navigator.userAgent
  const res   = `${screen.width}x${screen.height}x${screen.colorDepth}`
  const tz    = Intl.DateTimeFormat().resolvedOptions().timeZone
  const lang  = navigator.language
  const cores = navigator.hardwareConcurrency ?? 0
  return { ua, screenRes: res, timezone: tz, language: lang, cores, raw: [ua, res, tz, lang, cores].join('|') }
}

export interface Identity {
  id: string
  name: string
  color: string
  ip: string
  ua: string
  screenRes: string
  timezone: string
  language: string
  cores: number
}

export async function getIdentity(): Promise<Identity> {
  // Return cached identity if available
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as Identity
      if (parsed.name && parsed.color && parsed.id) {
        // Re-register in background (update lastSeen) without blocking
        void registerUser(parsed)
        return parsed
      }
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

  const fp = deviceFingerprint()
  const seed = hashString(`${ip}|${fp.raw}`)
  const { name, color } = generateFromSeed(seed)
  const id = seed.toString(16).padStart(8, '0')

  const identity: Identity = { id, name, color, ip, ua: fp.ua, screenRes: fp.screenRes, timezone: fp.timezone, language: fp.language, cores: fp.cores }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(identity))
  } catch { /* storage full */ }

  void registerUser(identity)
  return identity
}

async function registerUser(identity: Identity): Promise<void> {
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:          identity.id,
        authorName:  identity.name,
        authorColor: identity.color,
        userAgent:   identity.ua,
        screenRes:   identity.screenRes,
        timezone:    identity.timezone,
        language:    identity.language,
        cores:       identity.cores,
      }),
    })
  } catch { /* ignore — non-critical */ }
}

export function clearIdentityCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
