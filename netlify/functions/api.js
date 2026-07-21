import { getStore } from '@netlify/blobs'

const store = getStore('cockroach-ki-awwaz')

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

function sanitizeString(input) {
  return typeof input === 'string' ? input.trim() : ''
}

async function readMessages() {
  const messages = await store.get('messages', { type: 'json' })
  return Array.isArray(messages) ? messages : []
}

async function writeMessages(messages) {
  await store.setJSON('messages', messages)
}

export async function handler(event) {
  const url = new URL(event.rawUrl)
  const pathname = url.pathname
  const method = event.httpMethod

  if (method === 'GET' && pathname === '/api/health') {
    return json(200, { ok: true })
  }

  if (method === 'GET' && pathname === '/api/messages') {
    const messages = await readMessages()
    return json(200, messages)
  }

  if (method === 'POST' && pathname === '/api/messages') {
    let payload
    try {
      payload = JSON.parse(event.body || '{}')
    } catch {
      return json(400, { error: 'Invalid JSON payload' })
    }

    const id = sanitizeString(payload.id)
    const content = sanitizeString(payload.content)
    const authorName = sanitizeString(payload.authorName)
    const authorColor = sanitizeString(payload.authorColor)
    const timestamp = Number(payload.timestamp)
    const reactions = payload.reactions && typeof payload.reactions === 'object' ? payload.reactions : {}

    if (!id || !content || !authorName || !authorColor || !Number.isFinite(timestamp)) {
      return json(400, { error: 'Invalid message payload' })
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

    return json(201, message)
  }

  const reactionMatch = pathname.match(/^\/api\/messages\/([^/]+)\/reactions$/)
  if (method === 'POST' && reactionMatch) {
    const messageId = sanitizeString(decodeURIComponent(reactionMatch[1]))

    let payload
    try {
      payload = JSON.parse(event.body || '{}')
    } catch {
      return json(400, { error: 'Invalid JSON payload' })
    }

    const emoji = sanitizeString(payload.emoji)
    if (!messageId || !emoji) {
      return json(400, { error: 'Invalid reaction payload' })
    }

    const messages = await readMessages()
    const message = messages.find((item) => item.id === messageId)

    if (!message) {
      return json(404, { error: 'Message not found' })
    }

    const current = Number(message.reactions?.[emoji] ?? 0)
    message.reactions = {
      ...(message.reactions ?? {}),
      [emoji]: current + 1,
    }

    await writeMessages(messages)
    return json(200, message)
  }

  return json(404, { error: 'Not found' })
}
