import express from 'express'
import cors from 'cors'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const app = express()

const PORT = Number(process.env.PORT ?? 4000)
const NODE_ENV = process.env.NODE_ENV ?? 'development'
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data')
const MESSAGE_FILE = path.join(DATA_DIR, 'messages.json')

app.use(express.json({ limit: '1mb' }))

if (NODE_ENV === 'development') {
  app.use(cors({ origin: FRONTEND_ORIGIN }))
}

let writeQueue = Promise.resolve()

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(MESSAGE_FILE)
  } catch {
    await fs.writeFile(MESSAGE_FILE, '[]', 'utf8')
  }
}

async function readMessages() {
  try {
    const raw = await fs.readFile(MESSAGE_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      await fs.writeFile(MESSAGE_FILE, '[]', 'utf8')
      return []
    }

    const backupFile = `${MESSAGE_FILE}.corrupt.${Date.now()}.bak`
    try {
      await fs.copyFile(MESSAGE_FILE, backupFile)
    } catch {
      // Ignore backup failures and still recover app availability.
    }

    await fs.writeFile(MESSAGE_FILE, '[]', 'utf8')
    return []
  }
}

async function writeMessages(messages) {
  // Serialize writes and keep queue alive even if one write fails.
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const tmpFile = `${MESSAGE_FILE}.tmp`
      await fs.writeFile(tmpFile, JSON.stringify(messages, null, 2), 'utf8')
      await fs.rename(tmpFile, MESSAGE_FILE)
    })
  await writeQueue
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

function sanitizeString(input) {
  return typeof input === 'string' ? input.trim() : ''
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/messages', asyncHandler(async (_req, res) => {
  const messages = await readMessages()
  res.json(messages)
}))

app.post('/api/messages', asyncHandler(async (req, res) => {
  const id = sanitizeString(req.body.id)
  const content = sanitizeString(req.body.content)
  const authorName = sanitizeString(req.body.authorName)
  const authorColor = sanitizeString(req.body.authorColor)
  const timestamp = Number(req.body.timestamp)
  const reactions = req.body.reactions && typeof req.body.reactions === 'object' ? req.body.reactions : {}

  if (!id || !content || !authorName || !authorColor || !Number.isFinite(timestamp)) {
    return res.status(400).json({ error: 'Invalid message payload' })
  }

  const message = {
    id,
    content,
    authorName,
    authorColor,
    timestamp,
    reactions,
  }

  const messages = await readMessages()
  messages.unshift(message)
  await writeMessages(messages)

  return res.status(201).json(message)
}))

app.post('/api/messages/:id/reactions', asyncHandler(async (req, res) => {
  const messageId = sanitizeString(req.params.id)
  const emoji = sanitizeString(req.body.emoji)

  if (!messageId || !emoji) {
    return res.status(400).json({ error: 'Invalid reaction payload' })
  }

  const messages = await readMessages()
  const message = messages.find((item) => item.id === messageId)

  if (!message) {
    return res.status(404).json({ error: 'Message not found' })
  }

  const current = Number(message.reactions?.[emoji] ?? 0)
  message.reactions = {
    ...(message.reactions ?? {}),
    [emoji]: current + 1,
  }

  await writeMessages(messages)
  return res.json(message)
}))

if (NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist')
  app.use(express.static(distPath))

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next()
    }
    return res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

ensureStorage()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialize backend storage.', error)
    process.exit(1)
  })
