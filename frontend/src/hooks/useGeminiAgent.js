import { useState, useCallback } from 'react'
import { streamChat } from '../services/api'

export function useGeminiAgent(sessionId, onToolCalls) {
  const [messages, setMessages]   = useState([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError]         = useState(null)

  const sendMessage = useCallback(async (text) => {
    if (!sessionId || !text.trim() || streaming) return

    const userMsg      = { role: 'user',      content: text, id: Date.now(),     tool_calls: [] }
    const assistantMsg = { role: 'assistant', content: '',   id: Date.now() + 1, tool_calls: [], streaming: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)
    setError(null)

    try {
      await streamChat(
        text,
        sessionId,
        (_chunk, fullText) => {
          setMessages(prev =>
            prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullText } : m)
          )
        },
        (toolCalls) => {
          onToolCalls?.(toolCalls)
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsg.id
                ? { ...m, tool_calls: [...(m.tool_calls || []), ...toolCalls] }
                : m
            )
          )
        },
        (finalText) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsg.id ? { ...m, content: finalText, streaming: false } : m
            )
          )
          setStreaming(false)
        },
      )
    } catch (err) {
      setError(err.message)
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: 'Something went wrong. Please try again.', streaming: false }
            : m
        )
      )
      setStreaming(false)
    }
  }, [sessionId, streaming, onToolCalls])

  return { messages, setMessages, streaming, error, sendMessage }
}
