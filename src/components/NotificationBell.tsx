import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getNotifications, markNotificationsRead, type AppNotification } from '../utils/api'
import { getIdentity } from '../utils/identity'

const POLL_INTERVAL = 30_000 // 30 seconds

export default function NotificationBell() {
  const [open, setOpen]               = useState(false)
  const [notifications, setNotes]     = useState<AppNotification[]>([])
  const [deviceId, setDeviceId]       = useState<string | null>(null)
  const [marking, setMarking]         = useState(false)
  const panelRef                      = useRef<HTMLDivElement>(null)

  // Get device ID once
  useEffect(() => {
    getIdentity().then(id => setDeviceId(id.id))
  }, [])

  const fetchNotes = useCallback(async (id: string) => {
    try {
      const data = await getNotifications(id)
      setNotes(data)
    } catch { /* silent */ }
  }, [])

  // Initial fetch + periodic poll
  useEffect(() => {
    if (!deviceId) return
    void fetchNotes(deviceId)
    const timer = setInterval(() => void fetchNotes(deviceId), POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [deviceId, fetchNotes])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Refetch when opened
  useEffect(() => {
    if (open && deviceId) void fetchNotes(deviceId)
  }, [open, deviceId, fetchNotes])

  async function handleMarkRead() {
    if (!deviceId || marking) return
    setMarking(true)
    try {
      await markNotificationsRead(deviceId)
      setNotes(prev => prev.map(n => ({ ...n, read: true })))
    } finally {
      setMarking(false)
    }
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        title="Notifications"
        className={`relative p-2 rounded-xl glass border transition-colors ${
          open ? 'border-roach-500/50 text-roach-500' : 'border-void-800/50 text-void-500 hover:text-roach-500'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-roach-500 text-void-950 text-[9px] font-mono font-bold flex items-center justify-center"
          >
            {unread > 99 ? '99+' : unread}
          </motion.span>
        )}
      </motion.button>

      {/* Notification panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-12 w-80 rounded-2xl glass-strong border border-void-800 shadow-2xl z-50 overflow-hidden"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-void-800">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-void-500" />
                <span className="font-mono text-xs text-void-500 tracking-widest uppercase">Notifications</span>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-roach-500/20 text-roach-500 font-mono text-[9px]">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={handleMarkRead}
                    disabled={marking}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-[10px] text-void-600 hover:text-roach-500 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>All read</span>
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 text-void-600 hover:text-void-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center font-mono text-xs text-void-700">
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-void-800/50 last:border-0 transition-colors ${
                      !n.read ? 'bg-roach-500/5' : ''
                    }`}
                  >
                    {/* Sender avatar */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${n.fromColor}18`, color: n.fromColor, border: `1px solid ${n.fromColor}30` }}
                    >
                      {n.fromName.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-void-300 leading-snug">
                        <span className="font-medium" style={{ color: n.fromColor }}>{n.fromName}</span>
                        {n.type === 'reaction'
                          ? <> reacted {n.emoji} to your message</>
                          : <> mentioned you in a message</>
                        }
                      </p>
                      {n.excerpt && (
                        <p className="mt-0.5 font-mono text-[10px] text-void-600 truncate">
                          "{n.excerpt}"
                        </p>
                      )}
                      <p className="mt-1 font-mono text-[9px] text-void-700">
                        {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                      </p>
                    </div>

                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-roach-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
