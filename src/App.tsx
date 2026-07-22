import { useState, useCallback, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageSquare, Users } from 'lucide-react'
import { getMessages, addMessage, addReaction } from './utils/api.ts'
import { getIdentity, type Identity } from './utils/identity.ts'
import type { Message } from './types'
import Header from './components/Header'
import ComposeBox from './components/ComposeBox'
import MessageBoard from './components/MessageBoard'
import UsersTable from './components/UsersTable'
import UserProfile from './components/UserProfile'

type Tab = 'messages' | 'users'

export default function App() {
  return (
    <Routes>
      <Route path="/u/:username" element={<UserProfile />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  )
}

function MainApp() {
  const [tab, setTab]           = useState<Tab>('messages')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)

  useEffect(() => {
    async function load() {
      const [data] = await Promise.all([
        getMessages().catch(() => { setError('Could not load messages.'); return [] }),
        getIdentity().then(setIdentity).catch(() => null),
      ])
      setMessages(data)
      setLoading(false)
    }
    void load()
  }, [])

  const handleNewMessage = useCallback((msg: Message) => {
    setMessages((prev) => [msg, ...prev])
  }, [])

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    const reactor = identity ? { id: identity.id, name: identity.name, color: identity.color } : undefined
    const updatedMessage = await addReaction(messageId, emoji, reactor)
    setMessages((prev) => prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg)))
  }, [identity])

  const TABS: { key: Tab; label: string; Icon: typeof MessageSquare }[] = [
    { key: 'messages', label: 'Messages', Icon: MessageSquare },
    { key: 'users',    label: 'Users',    Icon: Users },
  ]

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #a3e63530 0%, transparent 60%)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/3 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4ade8030 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/4 -right-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #60a5fa20 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10">
        <Header />

        {/* Tab bar */}
        <div className="mx-auto w-full max-w-2xl px-4 mt-4">
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-void-900/60 border border-void-800 w-fit">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs tracking-wider uppercase transition-all duration-200 ${
                  tab === key ? 'text-void-950' : 'text-void-600 hover:text-void-400'
                }`}
              >
                {tab === key && (
                  <motion.span layoutId="app-tab" className="absolute inset-0 rounded-lg bg-roach-500"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                )}
                <Icon className="relative z-10 w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="relative z-10">{label}</span>
                {key === 'messages' && messages.length > 0 && (
                  <span className="relative z-10 ml-0.5 font-mono text-[9px] opacity-70 tabular-nums">
                    {messages.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {tab === 'messages' ? (
          <>
            <div className="mt-6">
              <ComposeBox onNewMessage={handleNewMessage} onSubmitMessage={addMessage} />
            </div>
            {loading ? (
              <div className="mx-auto mt-8 w-full max-w-2xl px-4 text-sm text-void-500">Loading messages…</div>
            ) : error ? (
              <div className="mx-auto mt-8 w-full max-w-2xl px-4 text-sm text-red-300">{error}</div>
            ) : (
              <MessageBoard messages={messages} myName={identity?.name} onReact={handleReact} />
            )}
          </>
        ) : (

          <UsersTable />
        )}
      </div>
    </div>
  )
}
