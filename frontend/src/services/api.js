// All backend API calls

const BASE = ''   // Vite proxy handles /api → http://localhost:8000

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }
  const resp = await fetch(BASE + path, opts)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }))
    const e = new Error(err.detail || 'Request failed')
    e.status = resp.status
    throw e
  }
  return resp.json()
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const getAuthUrl  = ()           => req('GET', '/api/auth/login')
export const getAuthStatus = (sid)      => req('GET', `/api/auth/status/${sid}`)
export const getMe         = (sid)      => req('GET', `/api/me?session_id=${sid}`)

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function streamChat(message, sessionId, onChunk, onToolCalls, onDone) {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  })
  if (!resp.ok) throw new Error(`Chat error: ${resp.status}`)

  const reader  = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') { onDone?.(fullText); return }
      try {
        const { chunk } = JSON.parse(payload)
        if (chunk.startsWith('\n\n__TOOL_CALLS__:')) {
          onToolCalls?.(JSON.parse(chunk.replace('\n\n__TOOL_CALLS__:', '')))
        } else {
          fullText += chunk
          onChunk?.(chunk, fullText)
        }
      } catch {}
    }
  }
  onDone?.(fullText)
}

// ─── Mission Brief ────────────────────────────────────────────────────────────

export const getBriefing = (sid) => req('GET', `/api/briefing/${sid}`)

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const getCalendarEvents = (sid, days = 7) =>
  req('GET', `/api/calendar/events/${sid}?days=${days}`)

export const createCalendarEvent = (sid, event) =>
  req('POST', `/api/calendar/events/${sid}`, event)

export const getCalendarGaps = (sid, date, mins = 60) =>
  req('GET', `/api/calendar/gaps/${sid}?date=${date}&duration_minutes=${mins}`)

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const getTasks       = (sid)           => req('GET',   `/api/tasks/${sid}`)
export const prioritizeTasks = (sid, tasks)   => req('POST',  `/api/tasks/${sid}/prioritize`, { tasks })
export const completeTask   = (sid, taskId)   => req('PATCH', `/api/tasks/${sid}/${taskId}/complete`)
export const moveTask       = (sid, taskId, priority) => req('PATCH', `/api/tasks/${sid}/${taskId}/move`, { priority })

// ─── Productivity ─────────────────────────────────────────────────────────────

export const getProductivity = (sid) => req('GET', `/api/productivity/${sid}`)

// ─── Notifications / Reminders ────────────────────────────────────────────────

export const getVapidKey  = ()               => req('GET', '/api/notifications/vapid-key')
export const subscribeNotification = (sid, sub, title, deadline) =>
  req('POST', `/api/notifications/subscribe/${sid}`, {
    subscription: sub, task_title: title, deadline,
  })
export const getReminders = (sid) => req('GET', `/api/reminders/${sid}`)
