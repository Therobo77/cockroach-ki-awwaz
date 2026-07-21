import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import MessageCard from './MessageCard'
import EmptyState from './EmptyState'
import type { Message } from '../types'

interface Props {
  messages: Message[]
  onReact: (messageId: string, emoji: string) => Promise<void>
}

export default function MessageBoard({ messages, onReact }: Props) {
  const [filter, setFilter] = useState<'all' | 'hot'>('all')

  const displayed = filter === 'hot'
    ? [...messages].sort((a, b) => {
        const ra = Object.values(a.reactions).reduce((s, n) => s + n, 0)
        const rb = Object.values(b.reactions).reduce((s, n) => s + n, 0)
        return rb - ra
      })
    : messages

  const handleReact = useCallback(
    (messageId: string, emoji: string) => onReact(messageId, emoji),
    [onReact]
  )

  return (
    <section className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-20 mt-8">
      {/* Board header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-void-600" strokeWidth={1.5} />
          <span className="font-mono text-xs text-void-600 tracking-widest uppercase">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-void-900/60 border border-void-800">
          {(['all', 'hot'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`relative px-3 py-1 rounded-md font-mono text-[10px] tracking-widest uppercase transition-all duration-200 ${
                filter === tab ? 'text-void-950' : 'text-void-600 hover:text-void-400'
              }`}
            >
              {filter === tab && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-md bg-roach-500"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">
                {tab === 'hot' ? '🔥 Hot' : '⏱ Latest'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div layout className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {displayed.map((msg, i) => (
              <MessageCard
                key={msg.id}
                message={msg}
                index={i}
                onReact={handleReact}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  )
}
