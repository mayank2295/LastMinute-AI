import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggle } = useTheme()
  return (
    <button onClick={toggle} className={`theme-toggle ${className}`} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle theme">
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
            <Moon className="w-4 h-4" />
          </motion.span>
        ) : (
          <motion.span key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
            <Sun className="w-4 h-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
