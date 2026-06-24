import axios from 'axios'

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const getAuthUrl = (sessionId) =>
  api.get(`/api/auth/login${sessionId ? `?session_id=${sessionId}` : ''}`)
    .then(r => r.data)

export const getAuthStatus = (sessionId) =>
  api.get(`/api/auth/status/${sessionId}`).then(r => r.data)

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const getConversations = (sessionId) =>
  api.get(`/api/conversations/${sessionId}`).then(r => r.data)

/**
 * Streaming chat via Server-Sent Events.
 * onChunk(chunk, fullText) — called for each text token
 * onToolCalls(toolCallsArray) — called when the agent executes tools
 * onDone(finalText) — called when the stream ends
 */
export const streamChat = async (message, sessionId, onChunk, onToolCalls, onDone) => {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  })

  if (!resp.ok) throw new Error(`Chat error: ${resp.status}`)

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()   // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') {
        onDone?.(fullText)
        return
      }
      try {
        const { chunk } = JSON.parse(payload)
        if (chunk.startsWith('\n\n__TOOL_CALLS__:')) {
          const jsonStr = chunk.replace('\n\n__TOOL_CALLS__:', '')
          onToolCalls?.(JSON.parse(jsonStr))
        } else {
          fullText += chunk
          onChunk?.(chunk, fullText)
        }
      } catch {
        // skip malformed SSE frames
      }
    }
  }
  onDone?.(fullText)
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const getCalendarEvents = (sessionId, days = 7) =>
  api.get(`/api/calendar/events/${sessionId}?days=${days}`).then(r => r.data)

export const createCalendarEvent = (sessionId, event) =>
  api.post(`/api/calendar/events/${sessionId}`, event).then(r => r.data)

export const getCalendarGaps = (sessionId, date, durationMinutes = 60) =>
  api.get(`/api/calendar/gaps/${sessionId}?date=${date}&duration_minutes=${durationMinutes}`)
    .then(r => r.data)

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const getTasks = (sessionId) =>
  api.get(`/api/tasks/${sessionId}`).then(r => r.data)

export const prioritizeTasks = (sessionId, tasks) =>
  api.post(`/api/tasks/${sessionId}/prioritize`, { tasks }).then(r => r.data)

export const completeTask = (sessionId, taskId) =>
  api.patch(`/api/tasks/${sessionId}/${taskId}/complete`).then(r => r.data)

// ─── Productivity ─────────────────────────────────────────────────────────────

export const getProductivity = (sessionId) =>
  api.get(`/api/productivity/${sessionId}`).then(r => r.data)

// ─── Notifications ────────────────────────────────────────────────────────────

export const getVapidKey = () =>
  api.get('/api/notifications/vapid-key').then(r => r.data)

export const subscribeNotification = (sessionId, subscription, taskTitle, deadline) =>
  api.post(`/api/notifications/subscribe/${sessionId}`, {
    subscription,
    task_title: taskTitle,
    deadline,
  }).then(r => r.data)
