import { useState, useRef, useEffect } from 'react'
import { Bot, User, Send, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useGeminiAgent } from '../hooks/useGeminiAgent'
import VoiceInput from './VoiceInput'
import ToolBadge from './ToolBadge'

const QUICK_PROMPTS = [
  "What's my most urgent task?",
  "Block focus time for today",
  "Add a deadline to my calendar",
  "Show my productivity score",
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold
        ${isUser ? 'bg-primary text-white' : 'bg-accent-light border border-accent-border text-accent-text'}`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div className={`max-w-[80%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Tool chips (AI only) */}
        {!isUser && msg.tool_calls?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-0.5">
            {msg.tool_calls.map((tc, i) => <ToolBadge key={i} toolCall={tc} />)}
          </div>
        )}
        {/* Bubble */}
        {(msg.content || msg.streaming) && (
          <div className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap
            ${isUser
              ? 'bg-primary text-white rounded-tr-sm'
              : 'bg-white border border-border text-primary rounded-tl-sm'
            }
            ${msg.streaming ? 'typing-cursor' : ''}
          `}>
            {msg.content || ' '}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-accent-light border border-accent-border flex items-center justify-center">
        <Bot className="w-3.5 h-3.5 text-accent-text" />
      </div>
      <div className="bg-white border border-border rounded-xl rounded-tl-sm px-3.5 py-3">
        <div className="dot-loader"><span /><span /><span /></div>
      </div>
    </div>
  )
}

export default function ChatAgent({ onTasksUpdated }) {
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const endRef  = useRef(null)
  const inputRef = useRef(null)

  const { messages, streaming, sendMessage } = useGeminiAgent(
    user?.sessionId,
    () => onTasksUpdated?.()
  )

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const submit = () => {
    if (!input.trim() || streaming) return
    sendMessage(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 bg-white border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-accent-light flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
        </div>
        <div>
          <p className="text-xs font-semibold text-primary">AI Agent</p>
          <p className="text-[11px] text-muted">Google Gemini · Function Calling</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Live
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-semibold text-sm text-primary mb-1">What do you need to get done?</h3>
            <p className="text-xs text-muted max-w-xs mb-6 leading-relaxed">
              Describe your deadlines and tasks. I'll plan, schedule, and track everything.
            </p>
            <div className="space-y-2 w-full max-w-sm">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => { setInput(p); inputRef.current?.focus() }}
                  className="w-full text-left text-xs text-muted bg-white border border-border rounded-lg px-3 py-2.5 hover:border-gray-300 hover:text-primary transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        {streaming && <TypingBubble />}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 bg-white border-t border-border">
        <div className="flex items-end gap-2 border border-border rounded-xl px-3 py-2 focus-within:border-gray-400 transition-colors bg-white">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            placeholder="What do you need to get done today?"
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-primary placeholder-muted outline-none py-0.5 max-h-28"
            style={{ scrollbarWidth: 'none' }}
          />
          <VoiceInput onTranscript={t => setInput(p => (p ? p + ' ' : '') + t)} />
          <button
            onClick={submit}
            disabled={!input.trim() || streaming}
            className="w-8 h-8 flex-shrink-0 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-muted mt-1.5 px-1">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}
