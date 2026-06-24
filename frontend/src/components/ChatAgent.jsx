import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader2, CheckCircle2, Calendar, ListTodo } from 'lucide-react'
import { useGeminiAgent } from '../hooks/useGeminiAgent'
import VoiceInput from './VoiceInput'

const QUICK_PROMPTS = [
  "What are my upcoming deadlines?",
  "I need to finish my project report by tomorrow — help me plan",
  "Block 2 hours for deep work today",
  "Prioritize these tasks for me",
]

function ToolCallBadge({ toolCall }) {
  const icons = {
    create_calendar_event: <Calendar className="w-3 h-3" />,
    get_upcoming_deadlines: <Calendar className="w-3 h-3" />,
    prioritize_tasks: <ListTodo className="w-3 h-3" />,
    suggest_time_blocks: <Calendar className="w-3 h-3" />,
    set_escalating_reminder: <CheckCircle2 className="w-3 h-3" />,
  }
  const labels = {
    create_calendar_event: 'Created calendar event',
    get_upcoming_deadlines: 'Fetched calendar',
    prioritize_tasks: 'Prioritized tasks',
    suggest_time_blocks: 'Found time blocks',
    set_escalating_reminder: 'Set reminders',
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-blue/10 text-blue-glow
                     border border-blue/20 rounded-full px-2 py-0.5 mr-1 mb-1">
      {icons[toolCall.tool] || <CheckCircle2 className="w-3 h-3" />}
      {labels[toolCall.tool] || toolCall.tool}
    </span>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser ? 'bg-blue/20 border border-blue/30' : 'bg-panel-light border border-border'}`}>
        {isUser
          ? <User className="w-4 h-4 text-blue-glow" />
          : <Bot className="w-4 h-4 text-text-muted" />
        }
      </div>

      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {msg.tool_calls?.length > 0 && (
          <div className="flex flex-wrap">
            {msg.tool_calls.map((tc, i) => <ToolCallBadge key={i} toolCall={tc} />)}
          </div>
        )}
        <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-blue/20 border border-blue/30 text-white rounded-tr-sm'
            : 'bg-panel border border-border text-gray-100 rounded-tl-sm'
          }
          ${msg.streaming ? 'typing-cursor' : ''}
        `}>
          {msg.content || (msg.streaming ? '' : '…')}
        </div>
      </div>
    </motion.div>
  )
}

export default function ChatAgent({ sessionId, onTasksUpdated }) {
  const [input, setInput] = useState('')
  const [toolCallsMap, setToolCallsMap] = useState({})
  const endRef = useRef(null)
  const inputRef = useRef(null)

  const handleToolCalls = (toolCalls) => {
    onTasksUpdated?.()
    setToolCallsMap(prev => {
      const next = { ...prev }
      toolCalls.forEach(tc => { next[Date.now()] = tc })
      return next
    })
  }

  const { messages, streaming, sendMessage, loadHistory } = useGeminiAgent(sessionId, handleToolCalls)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    if (!input.trim() || streaming) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-ok animate-pulse" />
        <span className="text-sm font-semibold text-white">AI Command Center</span>
        <span className="text-xs text-text-muted ml-auto">Gemini 2.0 Flash</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <Bot className="w-10 h-10 text-blue/40 mx-auto mb-3" />
            <p className="text-text-muted text-sm mb-5">
              Tell me what you need to get done. I'll plan, prioritize, and schedule for you.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => { setInput(p); inputRef.current?.focus() }}
                  className="text-left text-xs bg-panel-light hover:bg-panel border border-border
                             hover:border-blue/40 rounded-lg px-3 py-2 text-text-muted
                             hover:text-white transition-all duration-150"
                >
                  {p}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        </AnimatePresence>

        {streaming && (
          <div className="flex gap-2 items-center text-text-muted text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            Agent is thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border">
        <div className="flex gap-2 items-end bg-panel-light border border-border rounded-xl p-2
                        focus-within:border-blue/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe what you need to accomplish…"
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-white placeholder-text-muted
                       outline-none px-2 py-1 max-h-32"
            style={{ scrollbarWidth: 'thin' }}
          />
          <VoiceInput onTranscript={t => setInput(prev => prev + (prev ? ' ' : '') + t)} />
          <button
            onClick={submit}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue hover:bg-blue-dim
                       disabled:opacity-30 disabled:cursor-not-allowed
                       flex items-center justify-center transition-all active:scale-90"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-text-muted text-xs mt-1.5 px-1">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
