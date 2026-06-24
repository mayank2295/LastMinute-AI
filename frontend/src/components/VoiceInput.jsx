import { motion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { useVoice } from '../hooks/useVoice'

export default function VoiceInput({ onTranscript }) {
  const { listening, supported, start, stop } = useVoice(onTranscript)

  if (!supported) return null

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={listening ? stop : start}
      title={listening ? 'Stop listening' : 'Speak your task'}
      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all
        ${listening
          ? 'bg-red-alert/20 border border-red-alert/50 text-red-alert animate-pulse-ring'
          : 'bg-panel border border-border text-text-muted hover:text-white hover:border-blue/40'
        }`}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </motion.button>
  )
}
