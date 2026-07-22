import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions'

const prisma = new PrismaClient()

function parseUA(ua: string): { os: string; browser: string } {
  let os = 'Unknown'
  if (/Windows NT/.test(ua))         os = 'Windows'
  else if (/Android/.test(ua))       os = 'Android'
  else if (/iPhone|iPad/.test(ua))   os = 'iOS'
  else if (/Mac OS X/.test(ua))      os = 'macOS'
  else if (/Linux/.test(ua))         os = 'Linux'

  let browser = 'Unknown'
  if (/OPR\/|Opera\//.test(ua))                        browser = 'Opera'
  else if (/Edg\//.test(ua))                            browser = 'Edge'
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua))                        browser = 'Firefox'
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua))   browser = 'Safari'

  return { os, browser }
}

const createMessageSchema = z.object({
  id: z.string().min(3).max(100).optional(),
  content: z.string().trim().min(1).max(500),
  authorName: z.string().trim().min(2).max(100),
  authorColor: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  timestamp: z.number().int().positive().optional(),
  imageUrl: z.string().max(400000)
    .refine(v => v.startsWith('data:image/') || /^https?:\/\//.test(v), 'Must be image URL or data URL')
    .optional().or(z.literal('')).transform(v => v || undefined),
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
    reactions: Object.fromEntries(message.reactions.map((r) => [r.emoji, r.count])),
  }
}

function json(statusCode: number, body: unknown): HandlerResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Normalize path so both direct function calls and redirects work
  // e.g. "/.netlify/functions/api/messages" → "/api/messages"
  const normalizedPath = event.path
    .replace(/^\/.netlify\/functions\/api/, '/api')
    .replace(/\/$/, '')

  const method = event.httpMethod

  const isMessages = /\/api\/messages$/.test(normalizedPath)
  const reactionsMatch = /\/api\/messages\/([^/]+)\/reactions$/.exec(normalizedPath)

  try {
    // GET /api/identity — return client IP for deterministic identity
    if (normalizedPath === '/api/identity' && method === 'GET') {
      const ip =
        event.headers['x-nf-client-connection-ip'] ||
        event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        '0.0.0.0'
      return json(200, { ip })
    }

    // POST /api/users — upsert device/user record
    if (normalizedPath === '/api/users' && method === 'POST') {
      let body: Record<string, unknown> = {}
      try { body = JSON.parse(event.body ?? '{}') } catch { /* ignore */ }

      const ip =
        event.headers['x-nf-client-connection-ip'] ||
        event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        '0.0.0.0'

      const id          = String(body.id ?? '').slice(0, 64)
      const authorName  = String(body.authorName ?? '').slice(0, 100)
      const authorColor = String(body.authorColor ?? '#ffffff').slice(0, 32)
      const userAgent   = String(body.userAgent ?? '').slice(0, 2000)
      const screenRes   = String(body.screenRes ?? '').slice(0, 20)
      const timezone    = String(body.timezone ?? '').slice(0, 100)
      const language    = String(body.language ?? '').slice(0, 20)
      const cores       = Number(body.cores ?? 0)

      if (!id || !authorName) return json(400, { error: 'id and authorName required' })

      const { os, browser } = parseUA(userAgent)

      await prisma.userDevice.upsert({
        where: { id },
        create: { id, authorName, authorColor, ipAddress: ip, userAgent, os, browser, screenRes, timezone, language, cores },
        update: { authorName, authorColor, ipAddress: ip, lastSeen: new Date() },
      })
      return json(200, { ok: true })
    }

    // GET /api/users — list all known devices
    if (normalizedPath === '/api/users' && method === 'GET') {
      const users = await prisma.userDevice.findMany({ orderBy: { lastSeen: 'desc' } })

      const counts = await prisma.message.groupBy({
        by: ['authorName'],
        _count: { id: true },
      })
      const countMap: Record<string, number> = {}
      for (const c of counts) countMap[c.authorName] = c._count.id

      return json(200, users.map(u => ({
        id:          u.id,
        authorName:  u.authorName,
        authorColor: u.authorColor,
        ipAddress:   u.ipAddress,
        os:          u.os,
        browser:     u.browser,
        screenRes:   u.screenRes,
        timezone:    u.timezone,
        language:    u.language,
        cores:       u.cores,
        firstSeen:   u.firstSeen.getTime(),
        lastSeen:    u.lastSeen.getTime(),
        messageCount: countMap[u.authorName] ?? 0,
      })))
    }

    // GET /api/messages
    if (isMessages && method === 'GET') {
      const limit = Math.min(
        Math.max(Number(event.queryStringParameters?.limit ?? 50), 1),
        100,
      )

      const messages = await prisma.message.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { reactions: { select: { emoji: true, count: true } } },
      })

      return json(200, messages.map(toApiMessage))
    }

    // POST /api/messages
    if (isMessages && method === 'POST') {
      let body: unknown
      try {
        body = JSON.parse(event.body ?? '{}')
      } catch {
        return json(400, { error: 'Invalid JSON body' })
      }

      const parsed = createMessageSchema.safeParse(body)
      if (!parsed.success) {
        return json(400, { error: 'Invalid message payload', details: parsed.error.flatten() })
      }

      const payload = parsed.data
      const created = await prisma.message.create({
        data: {
          ...(payload.id ? { id: payload.id } : {}),
          content: payload.content,
          authorName: payload.authorName,
          authorColor: payload.authorColor,
          ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
          ...(payload.timestamp ? { createdAt: new Date(payload.timestamp) } : {}),
        },
        include: { reactions: { select: { emoji: true, count: true } } },
      })

      return json(201, toApiMessage(created))
    }

    // POST /api/messages/:id/reactions
    if (reactionsMatch && method === 'POST') {
      const messageId = reactionsMatch[1]

      let body: unknown
      try {
        body = JSON.parse(event.body ?? '{}')
      } catch {
        return json(400, { error: 'Invalid JSON body' })
      }

      const parsed = reactionSchema.safeParse(body)
      if (!messageId || !parsed.success) {
        return json(400, { error: 'Invalid reaction payload' })
      }

      const exists = await prisma.message.findUnique({
        where: { id: messageId },
        select: { id: true },
      })

      if (!exists) {
        return json(404, { error: 'Message not found' })
      }

      await prisma.reaction.upsert({
        where: { messageId_emoji: { messageId, emoji: parsed.data.emoji } },
        create: { messageId, emoji: parsed.data.emoji, count: 1 },
        update: { count: { increment: 1 } },
      })

      const updated = await prisma.message.findUniqueOrThrow({
        where: { id: messageId },
        include: { reactions: { select: { emoji: true, count: true } } },
      })

      return json(200, toApiMessage(updated))
    }

    return json(404, { error: 'Not found' })
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : String(err)
    return json(500, { error: 'Internal server error', detail: message })
  }
}
