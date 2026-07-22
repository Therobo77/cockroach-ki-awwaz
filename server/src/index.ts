import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const app = express()
const prisma = new PrismaClient()

const PORT = Number(process.env.PORT ?? 4000)
const NODE_ENV = process.env.NODE_ENV ?? 'development'
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
const IS_PRODUCTION = NODE_ENV === 'production'
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? FRONTEND_ORIGIN)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

app.use(helmet())
app.use(express.json({ limit: '1mb' }))
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'))
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('CORS origin not allowed'))
  },
}))

const createMessageSchema = z.object({
  id: z.string().min(3).max(100).optional(),
  content: z.string().trim().min(1).max(500),
  authorName: z.string().trim().min(2).max(100),
  authorColor: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  timestamp: z.number().int().positive().optional(),
  imageUrl: z.string().url().max(2048).optional().or(z.literal('')).transform(v => v || undefined),
})

const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(32),
})

function toApiMessage(message: {
  id: string
  content: string
  authorName: string
  authorColor: string
  imageUrl: string | null
  createdAt: Date
  reactions: Array<{ emoji: string; count: number }>
}) {
  return {
    id: message.id,
    content: message.content,
    authorName: message.authorName,
    authorColor: message.authorColor,
    imageUrl: message.imageUrl ?? undefined,
    timestamp: message.createdAt.getTime(),
    reactions: Object.fromEntries(message.reactions.map((item) => [item.emoji, item.count])),
  }
}

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

app.get('/api/health', asyncHandler(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({ ok: true })
}))

app.get('/api/messages', asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100)

  const messages = await prisma.message.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      reactions: {
        select: {
          emoji: true,
          count: true,
        },
      },
    },
  })

  res.json(messages.map(toApiMessage))
}))

app.post('/api/messages', asyncHandler(async (req, res) => {
  const parsed = createMessageSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid message payload',
      details: parsed.error.flatten(),
    })
  }

  const payload = parsed.data

  const created = await prisma.message.create({
    data: {
      ...(payload.id ? { id: payload.id } : {}),
      content: payload.content,
      authorName: payload.authorName,
      authorColor: payload.authorColor,      ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),      ...(payload.timestamp ? { createdAt: new Date(payload.timestamp) } : {}),
    },
    include: {
      reactions: {
        select: {
          emoji: true,
          count: true,
        },
      },
    },
  })

  res.status(201).json(toApiMessage(created))
}))

app.post('/api/messages/:id/reactions', asyncHandler(async (req, res) => {
  const messageId = req.params.id.trim()
  const parsed = reactionSchema.safeParse(req.body)

  if (!messageId || !parsed.success) {
    return res.status(400).json({ error: 'Invalid reaction payload' })
  }

  const exists = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true },
  })

  if (!exists) {
    return res.status(404).json({ error: 'Message not found' })
  }

  await prisma.reaction.upsert({
    where: {
      messageId_emoji: {
        messageId,
        emoji: parsed.data.emoji,
      },
    },
    create: {
      messageId,
      emoji: parsed.data.emoji,
      count: 1,
    },
    update: {
      count: {
        increment: 1,
      },
    },
  })

  const updated = await prisma.message.findUniqueOrThrow({
    where: { id: messageId },
    include: {
      reactions: {
        select: {
          emoji: true,
          count: true,
        },
      },
    },
  })

  res.json(toApiMessage(updated))
}))

if (IS_PRODUCTION) {
  const distPath = path.resolve(process.cwd(), 'dist')
  app.use(express.static(distPath))

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next()
    }

    return res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)

  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() })
  }

  return res.status(500).json({ error: 'Internal server error' })
})

async function start() {
  await prisma.$connect()

  app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`)
  })
}

start().catch(async (error) => {
  console.error('Server bootstrap failed', error)
  await prisma.$disconnect()
  process.exit(1)
})
