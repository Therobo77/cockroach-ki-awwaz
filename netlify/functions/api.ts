import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions'

const prisma = new PrismaClient()

const createMessageSchema = z.object({
  id: z.string().min(3).max(100).optional(),
  content: z.string().trim().min(1).max(500),
  authorName: z.string().trim().min(2).max(100),
  authorColor: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  timestamp: z.number().int().positive().optional(),
})

const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(32),
})

function toApiMessage(message: {
  id: string
  content: string
  authorName: string
  authorColor: string
  createdAt: Date
  reactions: Array<{ emoji: string; count: number }>
}) {
  return {
    id: message.id,
    content: message.content,
    authorName: message.authorName,
    authorColor: message.authorColor,
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
    return json(500, { error: 'Internal server error' })
  }
}
