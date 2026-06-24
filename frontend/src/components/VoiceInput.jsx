import { Mic, MicOff } from 'lucide-react'
import { useVoice } from '../hooks/useVoice'

export default function VoiceInput({ onTranscript }) {
  const { listening, supported, start, stop } = useVoice(onTranscript)
  if (!supported) return null
  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      title={listening ? 'Stop listening' : 'Speak your task'}
      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-all
        ${listening
          ? 'bg-red-50 border-red-300 text-red-500 animate-pulse'
          : 'bg-white border-border text-muted hover:text-primary hover:border-gray-300'
        }`}
    >
      {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
    </button>
  )
}
