import type { Message } from '../types'

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

export async function addReaction(messageId: string, emoji: string): Promise<Message> {
  return request<Message>(`/messages/${messageId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  })
}
