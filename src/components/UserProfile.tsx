import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Monitor, Globe, MessageSquare, RefreshCw, Zap } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { getUserProfile, addReaction, type UserProfileData } from '../utils/api'
import { getIdentity } from '../utils/identity'
import Header from './Header'
import MessageCard from './MessageCard'

const OS_EMOJI: Record<string, string> = {
  Windows: '🪟', macOS: '🍎', Linux: '🐧', Android: '🤖', iOS: '📱',
}
const BROWSER_EMOJI: Record<string, string> = {
  Chrome: '🟡', Firefox: '🦊', Safari: '🧭', Edge: '🔵', Opera: '🔴',
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>()
  const [data, setData]         = useState<UserProfileData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [myName, setMyName]     = useState<string | undefined>()
  const [refreshing, setRefreshing] = useState(false)

  const decodedUsername = username ? decodeURIComponent(username) : ''

  useEffect(() => {
    getIdentity().then(id => setMyName(id.name)).catch(() => null)
  }, [])

  const load = useCallback(async (showRefresh = false) => {
    if (!decodedUsername) return
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      setData(await getUserProfile(decodedUsername))
    } catch {
      setError('User not found or failed to load.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [decodedUsername])

  useEffect(() => { void load() }, [load])

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    const identity = await getIdentity()
    const reactor  = { id: identity.id, name: identity.name, color: identity.color }
    const updated  = await addReaction(messageId, emoji, reactor)
    setData(prev => prev
      ? { ...prev, messages: prev.messages.map(m => m.id === updated.id ? updated : m) }
      : prev)
  }, [])

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #a3e63530 0%, transparent 60%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10">
        <Header />

        <div className="mx-auto w-full max-w-2xl px-4 pb-20">
          {/* Back link */}
          <Link to="/" className="inline-flex items-center gap-2 font-mono text-xs text-void-600 hover:text-roach-500 transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to messages</span>
          </Link>

          {loading ? (
            <div className="text-center py-16 font-mono text-xs text-void-600 animate-pulse">Loading profile…</div>
          ) : error ? (
            <div className="text-center py-16 font-mono text-xs text-red-400">{error}</div>
          ) : data ? (
            <>
              {/* Profile card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-2xl neon-border p-6 mb-6"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-mono font-bold flex-shrink-0"
                    style={{
                      backgroundColor: `${data.user.authorColor}20`,
                      color: data.user.authorColor,
                      border: `2px solid ${data.user.authorColor}40`,
                      boxShadow: `0 0 24px ${data.user.authorColor}20`,
                    }}
                  >
                    {data.user.authorName.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h1 className="font-mono text-lg font-bold" style={{ color: data.user.authorColor }}>
                        {data.user.authorName}
                      </h1>
                      <button
                        onClick={() => void load(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg glass border border-void-800 font-mono text-[10px] text-void-600 hover:text-roach-500 transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 text-void-600" />
                        <span className="font-mono text-xs text-void-400">{data.stats.messageCount} messages</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-void-600" />
                        <span className="font-mono text-xs text-void-400">{data.stats.totalReactions} reactions received</span>
                      </div>
                    </div>

                    {/* Device details */}
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3 text-void-600 flex-shrink-0" />
                        <code className="font-mono text-xs text-void-300">{data.user.ipAddress}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{OS_EMOJI[data.user.os ?? ''] ?? '💻'}</span>
                        <span className="font-mono text-xs text-void-400">{data.user.os ?? '—'} · {BROWSER_EMOJI[data.user.browser ?? ''] ?? '🌐'} {data.user.browser ?? '—'}</span>
                      </div>
                      {data.user.screenRes && (
                        <div className="flex items-center gap-2">
                          <Monitor className="w-3 h-3 text-void-600 flex-shrink-0" />
                          <span className="font-mono text-xs text-void-400">{data.user.screenRes}</span>
                        </div>
                      )}
                      {data.user.timezone && (
                        <div className="font-mono text-xs text-void-500 truncate">
                          🕒 {data.user.timezone.replace(/_/g, ' ')}
                        </div>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="mt-3 flex items-center gap-4 flex-wrap">
                      <span className="font-mono text-[10px] text-void-600">
                        First seen: {format(data.user.firstSeen, 'MMM d, yyyy')}
                      </span>
                      <span className="font-mono text-[10px] text-void-600">
                        Last seen: {formatDistanceToNow(data.user.lastSeen, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Messages by this user */}
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-void-600" strokeWidth={1.5} />
                <span className="font-mono text-xs text-void-600 tracking-widest uppercase">
                  {data.stats.messageCount} message{data.stats.messageCount !== 1 ? 's' : ''} by {data.user.authorName}
                </span>
              </div>

              {data.messages.length === 0 ? (
                <div className="text-center py-12 font-mono text-xs text-void-700">No messages yet.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.messages.map((msg, i) => (
                    <MessageCard key={msg.id} message={msg} index={i} myName={myName} onReact={handleReact} />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
