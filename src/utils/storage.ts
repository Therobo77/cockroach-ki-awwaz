import type { Message } from '../types'

const STORAGE_KEY = 'cockroach_ki_awwaz_messages'

export function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Message[]
  } catch {
    return []
  }
}

export function saveMessages(messages: Message[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
}

export function addMessage(message: Message): void {
  const messages = loadMessages()
  saveMessages([message, ...messages])
}

export function updateReaction(messageId: string, emoji: string): Message[] {
  const messages = loadMessages()
  const updated = messages.map((msg) => {
    if (msg.id !== messageId) return msg
    const current = msg.reactions[emoji] ?? 0
    return {
      ...msg,
      reactions: { ...msg.reactions, [emoji]: current + 1 },
    }
  })
  saveMessages(updated)
  return updated
}
