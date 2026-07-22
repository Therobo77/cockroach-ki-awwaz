import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { Users, Monitor, Globe, RefreshCw, MessageSquare } from 'lucide-react'
import { getUsers, type UserDevice } from '../utils/api'

const OS_EMOJI: Record<string, string> = {
  Windows: '🪟', macOS: '🍎', Linux: '🐧', Android: '🤖', iOS: '📱', Unknown: '💻',
}

const BROWSER_EMOJI: Record<string, string> = {
  Chrome: '🟡', Firefox: '🦊', Safari: '🧭', Edge: '🔵', Opera: '🔴', Unknown: '🌐',
}

export default function UsersTable() {
  const [users, setUsers]     = useState<UserDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      setUsers(await getUsers())
    } catch {
      setError('Could not load users.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <section className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-20 mt-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-void-600" strokeWidth={1.5} />
          <span className="font-mono text-xs text-void-600 tracking-widest uppercase">
            {users.length} device{users.length !== 1 ? 's' : ''} seen
          </span>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass border border-void-800 font-mono text-[10px] text-void-600 hover:text-roach-500 hover:border-roach-500/40 transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 font-mono text-xs text-void-600 animate-pulse">
          Loading devices…
        </div>
      ) : error ? (
        <div className="text-center py-16 font-mono text-xs text-red-400">{error}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 font-mono text-xs text-void-600">
          No devices registered yet. Send a message to appear here.
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden border border-void-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-void-800">
                  {['User', 'IP Address', 'Device / OS', 'Browser', 'Screen', 'Timezone', 'Messages', 'Last seen'].map(col => (
                    <th key={col} className="px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-void-600 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className="border-b border-void-800/50 last:border-0 hover:bg-void-900/30 transition-colors"
                  >
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                          style={{
                            backgroundColor: `${user.authorColor}18`,
                            color: user.authorColor,
                            border: `1px solid ${user.authorColor}30`,
                          }}
                        >
                          {user.authorName.charAt(0)}
                        </div>
                        <Link
                          to={`/u/${encodeURIComponent(user.authorName)}`}
                          className="font-mono text-xs font-medium hover:underline underline-offset-2 whitespace-nowrap"
                          style={{ color: user.authorColor }}
                        >
                          {user.authorName}
                        </Link>
                      </div>
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-void-600 flex-shrink-0" />
                        <code className="font-mono text-xs text-void-300">{user.ipAddress}</code>
                      </div>
                    </td>

                    {/* OS */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{OS_EMOJI[user.os ?? 'Unknown'] ?? '💻'}</span>
                        <span className="font-mono text-xs text-void-300">{user.os ?? '—'}</span>
                      </div>
                    </td>

                    {/* Browser */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{BROWSER_EMOJI[user.browser ?? 'Unknown'] ?? '🌐'}</span>
                        <span className="font-mono text-xs text-void-300">{user.browser ?? '—'}</span>
                      </div>
                    </td>

                    {/* Screen */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Monitor className="w-3 h-3 text-void-600 flex-shrink-0" />
                        <span className="font-mono text-xs text-void-400">{user.screenRes ?? '—'}</span>
                      </div>
                    </td>

                    {/* Timezone */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-void-400 whitespace-nowrap">
                        {user.timezone ? user.timezone.replace(/_/g, ' ') : '—'}
                      </span>
                    </td>

                    {/* Message count */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 text-void-600" />
                        <span className="font-mono text-xs text-void-300 tabular-nums">{user.messageCount}</span>
                      </div>
                    </td>

                    {/* Last seen */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-void-500 whitespace-nowrap">
                        {formatDistanceToNow(user.lastSeen, { addSuffix: true })}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
