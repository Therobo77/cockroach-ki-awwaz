import { motion } from 'framer-motion'
import { Bug } from 'lucide-react'

export default function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="flex flex-col items-center justify-center py-24 px-4 text-center"
    >
      <div className="relative mb-6">
        <motion.div
          animate={{
            rotate: [0, -10, 10, -6, 0],
            y: [0, -4, 0],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-3xl glass-strong flex items-center justify-center neon-border"
        >
          <Bug className="w-10 h-10 text-void-700" strokeWidth={1} />
        </motion.div>
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-roach-500/40"
            style={{
              top: `${20 + i * 25}%`,
              right: `-${8 + i * 4}px`,
            }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
          />
        ))}
      </div>

      <p className="font-display italic text-2xl text-void-600 mb-2">
        "Silence is extinction."
      </p>
      <p className="font-mono text-xs text-void-700 tracking-widest uppercase">
        Be the first to speak. No one will know.
      </p>
    </motion.div>
  )
}
