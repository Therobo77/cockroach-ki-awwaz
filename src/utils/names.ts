const ADJECTIVES = [
  'Shadow', 'Ghost', 'Neon', 'Phantom', 'Venom', 'Ember', 'Cipher',
  'Static', 'Rogue', 'Spectre', 'Void', 'Haze', 'Flux', 'Drift',
  'Glitch', 'Storm', 'Dusk', 'Nova', 'Ash', 'Ink',
]

const NOUNS = [
  'Antenna', 'Carapace', 'Mandible', 'Exo', 'Shell', 'Crawl', 'Hive',
  'Node', 'Signal', 'Whisper', 'Echo', 'Byte', 'Pixel', 'Wave',
  'Current', 'Pulse', 'Trace', 'Arc', 'Vector', 'Spark',
]

const COLORS = [
  '#a3e635', '#34d399', '#60a5fa', '#f472b6', '#fb923c',
  '#c084fc', '#38bdf8', '#facc15', '#f87171', '#4ade80',
]

export function generateAnonName(): { name: string; color: string } {
  const adj   = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun  = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num   = Math.floor(Math.random() * 99) + 1
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  return { name: `${adj}_${noun}_${num}`, color }
}

export function generateFromSeed(seed: number): { name: string; color: string } {
  const s = Math.abs(seed)
  const adj   = ADJECTIVES[s % ADJECTIVES.length]
  const noun  = NOUNS[Math.floor(s / ADJECTIVES.length) % NOUNS.length]
  const num   = (Math.floor(s / (ADJECTIVES.length * NOUNS.length)) % 99) + 1
  const color = COLORS[Math.floor(s / (ADJECTIVES.length * NOUNS.length * 99)) % COLORS.length]
  return { name: `${adj}_${noun}_${num}`, color }
}
