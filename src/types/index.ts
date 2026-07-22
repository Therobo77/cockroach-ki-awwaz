export interface Reaction {
  emoji: string
  count: number
  label: string
}

export interface Message {
  id: string
  content: string
  authorName: string
  authorColor: string
  timestamp: number
  reactions: Record<string, number>
  imageUrl?: string
  pinned?: boolean
}
