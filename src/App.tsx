import { useState, useCallback, useEffect } from 'react'
import { getMessages, addMessage, addReaction } from './utils/api.ts'
import type { Message } from './types'
import Header from './components/Header'
import ComposeBox from './components/ComposeBox'
import MessageBoard from './components/MessageBoard'

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getMessages()
        setMessages(data)
      } catch {
        setError('Could not load messages. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const handleNewMessage = useCallback((msg: Message) => {
    setMessages((prev) => [msg, ...prev])
  }, [])

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    const updatedMessage = await addReaction(messageId, emoji)
    setMessages((prev) => prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg)))
  }, [])

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(ellipse, #a3e63530 0%, transparent 60%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute top-1/3 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #4ade8030 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-1/4 -right-40 w-80 h-80 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #60a5fa20 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10">
        <Header />

        <div className="mt-6">
          <ComposeBox
            onNewMessage={handleNewMessage}
            onSubmitMessage={addMessage}
          />
        </div>

        {loading ? (
          <div className="mx-auto mt-8 w-full max-w-2xl px-4 text-sm text-void-500">Loading messages...</div>
        ) : error ? (
          <div className="mx-auto mt-8 w-full max-w-2xl px-4 text-sm text-red-300">{error}</div>
        ) : (
          <MessageBoard messages={messages} onReact={handleReact} />
        )}
      </div>
    </div>
  )
}
