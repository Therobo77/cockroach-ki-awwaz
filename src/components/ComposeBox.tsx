import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send, Shuffle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { generateAnonName } from '../utils/names'
import type { Message } from '../types'

interface Props {
  onNewMessage: (msg: Message) => void
  onSubmitMessage: (msg: Message) => Promise<Message>
}

const MAX_CHARS = 500

export default function ComposeBox({ onNewMessage, onSubmitMessage }: Props) {
  const [content, setContent]   = useState('')
  const [identity, setIdentity] = useState(generateAnonName)
  const [sending, setSending]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const charCount = content.trim().length
  const canSend   = charCount > 0 && charCount <= MAX_CHARS

  function reroll() {
    setIdentity(generateAnonName())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSend) {
      submit()
    }
  }

  async function submit() {
    if (!canSend || sending) return
    setSending(true)
    setSubmitError(null)

    const msg: Message = {
      id:          uuidv4(),
      content:     content.trim(),
      authorName:  identity.name,
      authorColor: identity.color,
      timestamp:   Date.now(),
      reactions:   {},
    }

    try {
      const created = await onSubmitMessage(msg)
      onNewMessage(created)
      setContent('')
      setIdentity(generateAnonName())
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }

    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const progress = Math.min((charCount / MAX_CHARS) * 100, 100)
  const isNearLimit = charCount > MAX_CHARS * 0.85
  const isOverLimit = charCount > MAX_CHARS

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 mx-auto w-full max-w-2xl px-4"
    >
      <div className="rounded-2xl glass-strong neon-border overflow-hidden transition-all duration-300">
        {/* Identity bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse-slow"
              style={{ backgroundColor: identity.color, boxShadow: `0 0 8px ${identity.color}` }}
            />
            <span className="font-mono text-xs" style={{ color: identity.color }}>
              {identity.name}
            </span>
            <button
              onClick={reroll}
              title="New anonymous identity"
              className="ml-1 p-1 rounded-md text-void-600 hover:text-roach-500 hover:bg-roach-500/10 transition-colors"
            >
              <Shuffle className="w-3 h-3" />
            </button>
          </div>
          <span className="font-mono text-[10px] tracking-widest uppercase text-void-700">
            anonymous
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-void-800 to-transparent mx-4" />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say something... anything. No one knows it's you."
          rows={4}
          className="w-full bg-transparent px-4 py-4 text-sm leading-relaxed text-void-200 placeholder:text-void-700 font-sans focus:outline-none"
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-4">
          {/* Char counter + progress */}
          <div className="flex items-center gap-3">
            <div className="relative w-20 h-1 rounded-full bg-void-900 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  backgroundColor: isOverLimit ? '#f87171' : isNearLimit ? '#facc15' : '#a3e635',
                }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>
            <span
              className={`font-mono text-xs tabular-nums ${
                isOverLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-void-600'
              }`}
            >
              {MAX_CHARS - charCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block font-mono text-[10px] text-void-700 tracking-widest">
              ⌘↵ to send
            </span>
            <motion.button
              onClick={() => void submit()}
              disabled={!canSend || sending}
              whileHover={canSend ? { scale: 1.04 } : {}}
              whileTap={canSend ? { scale: 0.96 } : {}}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-medium tracking-wider transition-all duration-200 ${
                canSend
                  ? 'bg-roach-500 text-void-950 hover:bg-roach-400 shadow-lg shadow-roach-500/20'
                  : 'bg-void-900 text-void-700 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>SEND</span>
            </motion.button>
          </div>
        </div>

        {submitError ? (
          <div className="px-4 pb-4 text-xs text-red-300 font-mono">{submitError}</div>
        ) : null}
      </div>
    </motion.div>
  )
}
