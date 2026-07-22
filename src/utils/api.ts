import type { Message } from '../types'

export interface UserDevice {
  id: string
  authorName: string
  authorColor: string
  ipAddress: string
  os: string | null
  browser: string | null
  screenRes: string | null
  timezone: string | null
  language: string | null
  cores: number
  firstSeen: number
  lastSeen: number
  messageCount: number
}

export interface AppNotification {
  id: string
  recipientId: string
  type: 'reaction' | 'mention'
  messageId: string | null
  fromName: string
  fromColor: string
  emoji: string | null
  excerpt: string | null
  read: boolean
  createdAt: number
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    let details = ''
    try {
      const errorBody = (await response.json()) as { error?: string }
      if (errorBody?.error) {
        details = `: ${errorBody.error}`
      }
    } catch {
      // Ignore non-JSON error bodies.
    }
    throw new Error(`Request failed with status ${response.status}${details}`)
  }

  return (await response.json()) as T
}

export async function getMessages(): Promise<Message[]> {
  return request<Message[]>('/messages')
}

export async function addMessage(message: Message): Promise<Message> {
  return request<Message>('/messages', {
    method: 'POST',
    body: JSON.stringify(message),
  })
}

export async function addReaction(
  messageId: string,
  emoji: string,
  reactor?: { id: string; name: string; color: string },
): Promise<Message> {
  return request<Message>(`/messages/${messageId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({
      emoji,
      reactorId:    reactor?.id,
      reactorName:  reactor?.name,
      reactorColor: reactor?.color,
    }),
  })
}

export async function getUsers(): Promise<UserDevice[]> {
  return request<UserDevice[]>('/users')
}

export async function getNotifications(deviceId: string): Promise<AppNotification[]> {
  return request<AppNotification[]>(`/notifications?deviceId=${encodeURIComponent(deviceId)}`)
}

export async function markNotificationsRead(deviceId: string): Promise<void> {
  await request<{ ok: boolean }>('/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ deviceId }),
  })
}
