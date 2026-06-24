import { useState, useCallback } from 'react'
import { streamChat } from '../services/api'

export function useGeminiAgent(sessionId, onToolCalls) {
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)

  const sendMessage = useCallback(async (text) => {
    if (!sessionId || !text.trim() || streaming) return

    const userMsg = { role: 'user', content: text, id: Date.now() }
    const assistantMsg = { role: 'assistant', content: '', id: Date.now() + 1, streaming: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)
    setError(null)

    try {
      await streamChat(
        text,
        sessionId,
        (chunk, fullText) => {
          setMessages(prev =>
            prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullText } : m)
          )
        },
        (toolCalls) => {
          onToolCalls?.(toolCalls)
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
            ? { ...m, content: 'Sorry, something went wrong. Please try again.', streaming: false }
            : m
        )
      )
      setStreaming(false)
    }
  }, [sessionId, streaming, onToolCalls])

  const loadHistory = useCallback((history) => {
    if (history?.length) {
      setMessages(history.map((m, i) => ({ ...m, id: i })))
    }
  }, [])

  return { messages, streaming, error, sendMessage, loadHistory }
}
