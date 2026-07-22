import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ExternalLink, X } from 'lucide-react'
import type { Message } from '../types'

const REACTIONS = ['🔥', '💀', '👀', '🤝', '⚡', '🫀']

interface Props {
  message: Message
  index: number
  myName?: string
  onReact: (messageId: string, emoji: string) => Promise<void>
}

function renderContent(text: string, myName?: string) {
  const parts = text.split(/(@[A-Za-z0-9_]+)/g)
  return parts.map((part, i) => {
    if (/^@[A-Za-z0-9_]+$/.test(part)) {
      const isMe = myName && part === `@${myName}`
      return (
        <span
          key={i}
          className={`font-semibold rounded px-0.5 ${isMe ? 'text-roach-500 bg-roach-500/10' : 'text-void-300 bg-void-800/60'}`}
        >
          {part}
        </span>
      )
    }
    return part
  })
}

export default function MessageCard({ message, index, myName, onReact }: Props) {
  const [reacted, setReacted]         = useState<Set<string>>(new Set())
  const [imgExpanded, setImgExpanded] = useState(false)
  const [imgError, setImgError]       = useState(false)

  async function handleReaction(emoji: string) {
    if (reacted.has(emoji)) return
    await onReact(message.id, emoji)
    setReacted((prev) => new Set([...prev, emoji]))
  }

  const totalReactions = Object.values(message.reactions).reduce((a, b) => a + b, 0)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        duration: 0.45,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative rounded-2xl glass overflow-hidden transition-all duration-300 hover:border-void-700"
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-2xl opacity-60"
        style={{ backgroundColor: message.authorColor }}
      />

      <div className="pl-5 pr-4 pt-4 pb-3">
        {/* Author row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold"
              style={{
                backgroundColor: `${message.authorColor}18`,
                color: message.authorColor,
                border: `1px solid ${message.authorColor}30`,
              }}
            >
              {message.authorName.charAt(0)}
            </div>
            <Link
              to={`/u/${encodeURIComponent(message.authorName)}`}
              className="font-mono text-xs font-medium hover:underline underline-offset-2"
              style={{ color: message.authorColor }}
            >
              {message.authorName}
            </Link>
          </div>
          <time className="font-mono text-[11px] text-void-700" dateTime={new Date(message.timestamp).toISOString()}>
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </time>
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed text-void-200 whitespace-pre-wrap break-words">
          {renderContent(message.content, myName)}
        </p>

        {/* Attached image */}
        {message.imageUrl && !imgError && (
          <div className="mt-3">
            <button
              onClick={() => setImgExpanded(true)}
              className="relative block w-full rounded-xl overflow-hidden border border-void-800 hover:border-void-600 transition-colors group/img"
            >
              <img
                src={message.imageUrl}
                alt="Attached"
                className="w-full max-h-64 object-cover group-hover/img:scale-[1.02] transition-transform duration-300"
                loading="lazy"
                onError={() => setImgError(true)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                <ExternalLink className="w-5 h-5 text-white drop-shadow" />
              </div>
            </button>
          </div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {imgExpanded && message.imageUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setImgExpanded(false)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
            >
              <motion.div
                initial={{ scale: 0.92 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.92 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-3xl w-full"
              >
                <img
                  src={message.imageUrl}
                  alt="Full size"
                  className="w-full rounded-2xl shadow-2xl"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <a
                    href={message.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setImgExpanded(false)}
                    className="p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reactions */}
        <div className="mt-4 flex items-center gap-1.5 flex-wrap">
          {REACTIONS.map((emoji) => {
            const count    = message.reactions[emoji] ?? 0
            const hasReacted = reacted.has(emoji)
            return (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => void handleReaction(emoji)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-150 ${
                  hasReacted
                    ? 'bg-roach-500/15 border border-roach-500/40 text-roach-400'
                    : count > 0
                    ? 'bg-void-800/60 border border-void-700/60 text-void-300 hover:border-void-600'
                    : 'opacity-0 group-hover:opacity-100 bg-void-900/60 border border-void-800 text-void-600 hover:text-void-300 hover:border-void-700'
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && (
                  <span className="font-mono text-[10px] tabular-nums">{count}</span>
                )}
              </motion.button>
            )
          })}

          {totalReactions > 0 && (
            <span className="ml-auto font-mono text-[10px] text-void-700">
              {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}
