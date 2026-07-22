import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquare, Search, X } from 'lucide-react'
import MessageCard from './MessageCard'
import EmptyState from './EmptyState'
import type { Message } from '../types'

type SortMode = 'latest' | 'oldest' | 'hot'

interface Props {
  messages: Message[]
  myName?: string
  onReact: (messageId: string, emoji: string) => Promise<void>
}

export default function MessageBoard({ messages, myName, onReact }: Props) {
  const [sort, setSort] = useState<SortMode>('latest')
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? messages.filter((m) => {
        const q = query.toLowerCase()
        return (
          m.content.toLowerCase().includes(q) ||
          m.authorName.toLowerCase().includes(q)
        )
      })
    : messages

  const displayed = [...filtered].sort((a, b) => {
    if (sort === 'oldest') return a.timestamp - b.timestamp
    if (sort === 'hot') {
      const ra = Object.values(a.reactions).reduce((s, n) => s + n, 0)
      const rb = Object.values(b.reactions).reduce((s, n) => s + n, 0)
      return rb - ra
    }
    return b.timestamp - a.timestamp // latest
  })

  const handleReact = useCallback(
    (messageId: string, emoji: string) => onReact(messageId, emoji),
    [onReact]
  )

  const SORT_TABS: { key: SortMode; label: string }[] = [
    { key: 'latest', label: '⏱ Latest' },
    { key: 'oldest', label: '📜 Oldest' },
    { key: 'hot',    label: '🔥 Hot'    },
  ]

  return (
    <section className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-20 mt-8">
      {/* Board header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-void-600" strokeWidth={1.5} />
          <span className="font-mono text-xs text-void-600 tracking-widest uppercase">
            {query.trim()
              ? `${displayed.length} / ${messages.length} messages`
              : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Sort tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-void-900/60 border border-void-800">
          {SORT_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`relative px-3 py-1 rounded-md font-mono text-[10px] tracking-widest uppercase transition-all duration-200 ${
                sort === key ? 'text-void-950' : 'text-void-600 hover:text-void-400'
              }`}
            >
              {sort === key && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-md bg-roach-500"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-void-600 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages or authors…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-void-900/60 border border-void-800 text-void-300 placeholder:text-void-700 font-mono text-xs focus:outline-none focus:border-roach-500/50 focus:ring-1 focus:ring-roach-500/20 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-void-600 hover:text-void-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <EmptyState />
      ) : displayed.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 font-mono text-xs text-void-600"
        >
          <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
          No messages match <span className="text-void-400">"{query}"</span>
        </motion.div>
      ) : (
        <motion.div layout className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {displayed.map((msg, i) => (
              <MessageCard
                key={msg.id}
                message={msg}
                index={i}
                myName={myName}
                onReact={handleReact}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  )
}

