import { generateFromSeed } from './names'

const CACHE_KEY        = 'ckawwaz_identity_v2'
const GOOGLE_CACHE_KEY = 'ckawwaz_google_identity'

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

export interface GoogleProfile {
  sub: string
  name: string
  given_name: string
  email: string
  picture: string
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
  googleProfile?: GoogleProfile
}

/** Parse a Google JWT credential (base64url → JSON, no verification — client-side only). */
export function parseGoogleJwt(credential: string): GoogleProfile {
  const base64 = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(base64)) as GoogleProfile
}

/** Build a display name from a Google profile, e.g. "Vikash_a3e6" */
function googleToName(profile: GoogleProfile): string {
  const first = (profile.given_name || profile.name.split(' ')[0]).replace(/[^A-Za-z0-9]/g, '')
  const suffix = hashString(profile.sub).toString(16).slice(0, 4)
  return `${first}_${suffix}`
}

/** Persist a Google-based identity (call after successful sign-in). */
export function setGoogleIdentity(profile: GoogleProfile): void {
  const seed  = hashString(profile.sub)
  const { color } = generateFromSeed(seed)
  const name  = googleToName(profile)
  const id    = hashString(profile.sub + 'google').toString(16).padStart(8, '0')
  const payload = { id, name, color, googleProfile: profile }
  localStorage.setItem(GOOGLE_CACHE_KEY, JSON.stringify(payload))
  // Invalidate device cache so getIdentity() picks up the Google one
  localStorage.removeItem(CACHE_KEY)
}

/** Clear Google identity, revert to device fingerprint. */
export function clearGoogleIdentity(): void {
  localStorage.removeItem(GOOGLE_CACHE_KEY)
  localStorage.removeItem(CACHE_KEY)
}

export async function getIdentity(): Promise<Identity> {
  // Check for Google identity first
  try {
    const googleRaw = localStorage.getItem(GOOGLE_CACHE_KEY)
    if (googleRaw) {
      const g = JSON.parse(googleRaw) as { id: string; name: string; color: string; googleProfile: GoogleProfile }
      if (g.id && g.name && g.googleProfile) {
        const fp = deviceFingerprint()
        // Build full identity merging device info
        let ip = '0.0.0.0'
        try {
          const res = await fetch('/api/identity')
          if (res.ok) ip = ((await res.json()) as { ip: string }).ip ?? ip
        } catch { /* offline */ }
        const identity: Identity = { ...g, ip, ua: fp.ua, screenRes: fp.screenRes, timezone: fp.timezone, language: fp.language, cores: fp.cores }
        void registerUser(identity)
        return identity
      }
    }
  } catch { /* ignore */ }

  // Fall back to device fingerprint identity
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as Identity
      if (parsed.name && parsed.color && parsed.id) {
        void registerUser(parsed)
        return parsed
      }
    }
  } catch { /* ignore */ }

  let ip = '0.0.0.0'
  try {
    const res = await fetch('/api/identity')
    if (res.ok) ip = ((await res.json()) as { ip: string }).ip ?? ip
  } catch { /* offline */ }

  const fp   = deviceFingerprint()
  const seed = hashString(`${ip}|${fp.raw}`)
  const { name, color } = generateFromSeed(seed)
  const id   = seed.toString(16).padStart(8, '0')

  const identity: Identity = { id, name, color, ip, ua: fp.ua, screenRes: fp.screenRes, timezone: fp.timezone, language: fp.language, cores: fp.cores }

  try { localStorage.setItem(CACHE_KEY, JSON.stringify(identity)) } catch { /* full */ }

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
  } catch { /* non-critical */ }
}

export function clearIdentityCache(): void {
  localStorage.removeItem(CACHE_KEY)
}

