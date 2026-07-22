import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Fingerprint, ImagePlus, X, AlertCircle, Upload, Link2, AtSign } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { getIdentity, type Identity } from '../utils/identity'
import { compressImage, formatBytes } from '../utils/imageUpload'
import { getUsers } from '../utils/api'
import type { Message } from '../types'

interface Props {
  onNewMessage: (msg: Message) => void
  onSubmitMessage: (msg: Message) => Promise<Message>
}

const MAX_CHARS = 500
const ACCEPTED  = 'image/jpeg,image/png,image/webp,image/gif'
const MENTION_RE = /@([A-Za-z0-9_]*)$/

function isValidImageUrl(url: string): boolean {
  if (url.startsWith('data:image/')) return true
  try { return /^https?:/.test(new URL(url).protocol) } catch { return false }
}

export default function ComposeBox({ onNewMessage, onSubmitMessage }: Props) {
  const [content, setContent]                 = useState('')
  const [imageUrl, setImageUrl]               = useState('')
  const [imageTab, setImageTab]               = useState<'url' | 'upload'>('url')
  const [showImageInput, setShowImageInput]   = useState(false)
  const [imageError, setImageError]           = useState(false)
  const [uploading, setUploading]             = useState(false)
  const [uploadInfo, setUploadInfo]           = useState<string | null>(null)
  const [identity, setIdentity]               = useState<Identity | null>(null)
  const [identityLoading, setIdentityLoading] = useState(true)
  const [sending, setSending]                 = useState(false)
  const [submitError, setSubmitError]         = useState<string | null>(null)
  // @mention autocomplete
  const [mentionQuery, setMentionQuery]       = useState<string | null>(null)
  const [mentionUsers, setMentionUsers]       = useState<string[]>([])
  const [mentionIndex, setMentionIndex]       = useState(0)
  const textareaRef   = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const allUsersRef   = useRef<string[]>([])

  useEffect(() => {
    getIdentity().then(setIdentity).finally(() => setIdentityLoading(false))
    // Pre-fetch users for @mention
    getUsers().then(u => { allUsersRef.current = u.map(x => x.authorName) }).catch(() => null)
  }, [])

  // Detect @mention at cursor
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    const cursor = e.target.selectionStart ?? val.length
    const textBeforeCursor = val.slice(0, cursor)
    const match = MENTION_RE.exec(textBeforeCursor)
    if (match) {
      const q = match[1].toLowerCase()
      setMentionQuery(q)
      setMentionUsers(allUsersRef.current.filter(n => n.toLowerCase().startsWith(q)).slice(0, 6))
      setMentionIndex(0)
    } else {
      setMentionQuery(null)
      setMentionUsers([])
    }
  }, [])

  function insertMention(name: string) {
    const ta = textareaRef.current
    if (!ta) return
    const cursor = ta.selectionStart ?? content.length
    const before = content.slice(0, cursor)
    const after  = content.slice(cursor)
    const newBefore = before.replace(MENTION_RE, `@${name} `)
    const newContent = newBefore + after
    setContent(newContent)
    setMentionQuery(null)
    setMentionUsers([])
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(newBefore.length, newBefore.length)
    }, 0)
  }

  const charCount  = content.trim().length
  const validImage = imageUrl.trim() !== '' && isValidImageUrl(imageUrl.trim())
  const canSend    = charCount > 0 && charCount <= MAX_CHARS && identity !== null && !uploading &&
                     (!imageUrl.trim() || validImage)

  function handleKeyDown(e: React.KeyboardEvent) {
    // Handle mention dropdown navigation
    if (mentionQuery !== null && mentionUsers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % mentionUsers.length); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => (i - 1 + mentionUsers.length) % mentionUsers.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionUsers[mentionIndex]); return }
      if (e.key === 'Escape')    { setMentionQuery(null); setMentionUsers([]); return }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSend) submit()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    setImageError(false)
    setUploadInfo(`Compressing ${formatBytes(file.size)}…`)
    try {
      const dataUrl = await compressImage(file)
      const outKB   = Math.round(dataUrl.length / 1024 / 1.37)
      setImageUrl(dataUrl)
      setUploadInfo(`Compressed to ~${outKB} KB`)
    } catch {
      setImageError(true)
      setUploadInfo(null)
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    if (!canSend || sending || !identity) return
    setSending(true)
    setSubmitError(null)

    const msg: Message = {
      id:          uuidv4(),
      content:     content.trim(),
      authorName:  identity.name,
      authorColor: identity.color,
      timestamp:   Date.now(),
      reactions:   {},
      ...(validImage ? { imageUrl: imageUrl.trim() } : {}),
    }

    try {
      const created = await onSubmitMessage(msg)
      onNewMessage(created)
      setContent('')
      setImageUrl('')
      setUploadInfo(null)
      setShowImageInput(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }

    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const progress    = Math.min((charCount / MAX_CHARS) * 100, 100)
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
            {identityLoading ? (
              <span className="font-mono text-xs text-void-700 animate-pulse">resolving identity…</span>
            ) : identity ? (
              <>
                <div className="w-2 h-2 rounded-full animate-pulse-slow"
                  style={{ backgroundColor: identity.color, boxShadow: `0 0 8px ${identity.color}` }} />
                <span className="font-mono text-xs" style={{ color: identity.color }}>{identity.name}</span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase text-void-700">
            <Fingerprint className="w-3 h-3" />
            <span>device-bound</span>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-void-800 to-transparent mx-4" />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="Say something... type @ to mention a user"
          rows={4}
          className="w-full bg-transparent px-4 py-4 text-sm leading-relaxed text-void-200 placeholder:text-void-700 font-sans focus:outline-none"
        />

        {/* @mention dropdown */}
        <AnimatePresence>
          {mentionQuery !== null && mentionUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="mx-4 mb-2 rounded-xl glass border border-void-800 overflow-hidden"
            >
              {mentionUsers.map((name, i) => (
                <button
                  key={name}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(name) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                    i === mentionIndex ? 'bg-roach-500/15 text-roach-400' : 'text-void-300 hover:bg-void-900/60'
                  }`}
                >
                  <AtSign className="w-3 h-3 flex-shrink-0 opacity-50" />
                  <span className="font-mono text-xs">{name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image panel */}
        <AnimatePresence>
          {showImageInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mx-4 mb-3 space-y-2">
                {/* Tab switch */}
                <div className="flex gap-1 p-0.5 rounded-lg bg-void-900/60 border border-void-800 w-fit">
                  {(['url', 'upload'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setImageTab(tab); setImageUrl(''); setUploadInfo(null); setImageError(false) }}
                      className={`relative px-3 py-1 rounded-md font-mono text-[10px] tracking-widest uppercase transition-all duration-200 flex items-center gap-1.5 ${
                        imageTab === tab ? 'text-void-950' : 'text-void-600 hover:text-void-400'
                      }`}
                    >
                      {imageTab === tab && (
                        <motion.span layoutId="img-tab" className="absolute inset-0 rounded-md bg-roach-500"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                      )}
                      <span className="relative z-10 flex items-center gap-1">
                        {tab === 'url' ? <Link2 className="w-2.5 h-2.5" /> : <Upload className="w-2.5 h-2.5" />}
                        {tab === 'url' ? 'URL' : 'Upload'}
                      </span>
                    </button>
                  ))}
                </div>

                {imageTab === 'url' ? (
                  <div className="relative">
                    <input
                      ref={imageInputRef}
                      type="url"
                      value={imageUrl}
                      onChange={(e) => { setImageUrl(e.target.value); setImageError(false) }}
                      placeholder="https://i.imgur.com/… or any image URL"
                      className="w-full pl-3 pr-8 py-2 rounded-lg bg-void-900/40 border border-void-800 text-void-300 placeholder:text-void-700 font-mono text-xs focus:outline-none focus:border-roach-500/50 transition-all"
                    />
                    {imageUrl && (
                      <button onClick={() => { setImageUrl(''); setImageError(false) }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-void-600 hover:text-void-400">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Hidden file input */}
                    <input ref={fileInputRef} type="file" accept={ACCEPTED}
                      onChange={handleFileChange} className="hidden" />

                    {imageUrl ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-void-900/40 border border-void-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          <span className="font-mono text-xs text-void-400 truncate">{uploadInfo}</span>
                        </div>
                        <button onClick={() => { setImageUrl(''); setUploadInfo(null) }}
                          className="ml-2 flex-shrink-0 text-void-600 hover:text-void-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full flex flex-col items-center gap-2 py-5 rounded-lg border-2 border-dashed border-void-800 hover:border-roach-500/50 text-void-600 hover:text-void-400 transition-all"
                      >
                        {uploading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-roach-500/30 border-t-roach-500 rounded-full animate-spin" />
                            <span className="font-mono text-xs">{uploadInfo}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            <span className="font-mono text-xs">Click to choose image</span>
                            <span className="font-mono text-[10px] text-void-700">JPEG · PNG · WebP · max ~200 KB output</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Preview */}
                {validImage && !imageUrl.startsWith('data:') && (
                  <div className="relative rounded-lg overflow-hidden border border-void-800 max-h-48">
                    {imageError ? (
                      <div className="flex items-center gap-2 p-3 font-mono text-xs">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400">Can't load image — check the URL</span>
                      </div>
                    ) : (
                      <img src={imageUrl.trim()} alt="Preview"
                        className="w-full max-h-48 object-cover"
                        onError={() => setImageError(true)} onLoad={() => setImageError(false)} />
                    )}
                  </div>
                )}
                {imageUrl.startsWith('data:') && (
                  <div className="relative rounded-lg overflow-hidden border border-void-800 max-h-48">
                    <img src={imageUrl} alt="Preview" className="w-full max-h-48 object-cover" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative w-20 h-1 rounded-full bg-void-900 overflow-hidden">
              <motion.div className="absolute inset-y-0 left-0 rounded-full"
                style={{ backgroundColor: isOverLimit ? '#f87171' : isNearLimit ? '#facc15' : '#a3e635' }}
                animate={{ width: `${progress}%` }} transition={{ duration: 0.15 }} />
            </div>
            <span className={`font-mono text-xs tabular-nums ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-void-600'}`}>
              {MAX_CHARS - charCount}
            </span>
            <button
              onClick={() => { setShowImageInput(v => !v); if (!showImageInput) setTimeout(() => imageInputRef.current?.focus(), 50) }}
              title="Attach image"
              className={`p-1.5 rounded-lg transition-colors ${showImageInput || validImage ? 'text-roach-500 bg-roach-500/10' : 'text-void-600 hover:text-void-400'}`}
            >
              <ImagePlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block font-mono text-[10px] text-void-700 tracking-widest">⌘↵ to send</span>
            <motion.button
              onClick={() => void submit()}
              disabled={!canSend || sending}
              whileHover={canSend ? { scale: 1.04 } : {}}
              whileTap={canSend ? { scale: 0.96 } : {}}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-medium tracking-wider transition-all duration-200 ${
                canSend
                  ? 'bg-roach-500 text-void-950 hover:bg-roach-400 shadow-lg shadow-roach-500/20'
                  : 'bg-void-900 text-void-500 border border-void-800 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>SEND</span>
            </motion.button>
          </div>
        </div>

        {submitError && (
          <div className="px-4 pb-4 text-xs text-red-300 font-mono">{submitError}</div>
        )}
      </div>
    </motion.div>
  )
}

