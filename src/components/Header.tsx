import { motion } from 'framer-motion'
import { Bug, Sun, Moon } from 'lucide-react'
import { useTheme } from '../utils/theme'

export default function Header() {
  const { theme, toggle } = useTheme()

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 pt-12 pb-6 text-center px-4"
    >
      {/* Theme toggle */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        className="absolute top-4 right-4 p-2 rounded-xl glass border border-void-800/50 text-void-500 hover:text-roach-500 transition-colors"
      >
        {theme === 'dark'
          ? <Sun className="w-4 h-4" />
          : <Moon className="w-4 h-4" />
        }
      </motion.button>

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-96 h-48 rounded-full"
        style={{
          background: 'radial-gradient(ellipse, rgba(163,230,53,0.12) 0%, transparent 70%)',
          filter: 'blur(1px)',
        }}
      />

      <div className="relative inline-flex flex-col items-center gap-3">
        {/* Icon cluster */}
        <motion.div
          animate={{ rotate: [0, -5, 5, -3, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <div className="w-14 h-14 rounded-2xl glass-strong flex items-center justify-center neon-border">
            <Bug className="w-7 h-7 text-roach-500" strokeWidth={1.5} />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-roach-500 animate-pulse-slow" />
        </motion.div>

        {/* Title */}
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-void-50 leading-none">
            Cockroach{' '}
            <span className="italic text-roach-500 text-glow">Ki Awwaz</span>
          </h1>
          <p className="mt-2 font-mono text-xs tracking-[0.25em] uppercase text-void-500">
            Anonymous · Unfiltered · Unkillable
          </p>
        </div>

        {/* Decorative line */}
        <div className="flex items-center gap-3 w-full">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-void-700 to-transparent" />
          <span className="font-mono text-[10px] text-void-600 tracking-widest">EST. TODAY</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-void-700 to-transparent" />
        </div>
      </div>
    </motion.header>
  )
}
