async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }
  const resp = await fetch(path, opts)
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }))
    // FastAPI validation errors return detail as an array of objects — stringify
    // so the message is readable instead of "[object Object]".
    const detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)
    const e = new Error(detail || 'Request failed')
    e.status = resp.status
    throw e
  }
  return resp.json()
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const getAuthUrl    = ()      => req('GET', '/api/auth/login')
export const getAuthStatus = (sid)   => req('GET', `/api/auth/status/${sid}`)
export const getMe         = (sid)   => req('GET', `/api/me?session_id=${sid}`)
export const startDemo     = ()      => req('POST', '/api/demo/start')

// ─── Agentic ──────────────────────────────────────────────────────────────────
export const planMyDay     = (sid)        => req('POST', `/api/plan/${sid}`)
export const brainDump     = (sid, text)  => req('POST', `/api/braindump/${sid}`, { text })
export const getActivities = (sid, limit = 20) => req('GET', `/api/activities/${sid}?limit=${limit}`)

export async function scanImage(sid, file) {
  const fd = new FormData()
  fd.append('file', file)
  const resp = await fetch(`/api/vision/${sid}`, { method: 'POST', body: fd })
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({ detail: resp.statusText }))
    throw new Error(e.detail || 'Scan failed')
  }
  return resp.json()
}

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
export const getCalendarEvents  = (sid, days = 7) => req('GET', `/api/calendar/events/${sid}?days=${days}`)
export const createCalendarEvent = (sid, event)   => req('POST', `/api/calendar/events/${sid}`, event)
export const getCalendarGaps    = (sid, date, mins = 60) => req('GET', `/api/calendar/gaps/${sid}?date=${date}&duration_minutes=${mins}`)

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const getTasks        = (sid)                   => req('GET',    `/api/tasks/${sid}`)
export const createTask      = (sid, task)             => req('POST',   `/api/tasks/${sid}`, task)
export const deleteTask      = (sid, taskId)           => req('DELETE', `/api/tasks/${sid}/${taskId}`)
export const completeTask    = (sid, taskId)           => req('PATCH',  `/api/tasks/${sid}/${taskId}/complete`)
export const moveTask        = (sid, taskId, priority) => req('PATCH',  `/api/tasks/${sid}/${taskId}/move`, { priority })
export const updateTask      = (sid, taskId, updates)  => req('PUT',    `/api/tasks/${sid}/${taskId}`, updates)
export const prioritizeTasks = (sid, tasks)            => req('POST',   `/api/tasks/${sid}/prioritize`, { tasks })

// ─── Focus Sessions ───────────────────────────────────────────────────────────
export const saveFocusSession = (sid, data)          => req('POST', `/api/focus-sessions/${sid}`, data)
export const getFocusSessions = (sid, date = null)   => req('GET',  `/api/focus-sessions/${sid}${date ? `?date=${date}` : ''}`)

// ─── Productivity ─────────────────────────────────────────────────────────────
export const getProductivity = (sid) => req('GET', `/api/productivity/${sid}`)

// ─── Reminders ────────────────────────────────────────────────────────────────
export const getReminders = (sid) => req('GET', `/api/reminders/${sid}`)
export const getVapidKey  = ()    => req('GET', '/api/notifications/vapid-key')
export const subscribeNotification = (sid, sub, title, deadline) =>
  req('POST', `/api/notifications/subscribe/${sid}`, { subscription: sub, task_title: title, deadline })
export const savePushSubscription = (sid, sub) =>
  req('POST', `/api/notifications/push-subscribe/${sid}`, { subscription: sub })

// ─── Goals & Habits ─────────────────────────────────────────────────────────────
export const getGoals      = (sid)           => req('GET',    `/api/goals/${sid}`)
export const createGoal    = (sid, data)     => req('POST',   `/api/goals/${sid}`, data)
export const updateGoal    = (sid, id, data) => req('PATCH',  `/api/goals/${sid}/${id}`, data)
export const deleteGoal    = (sid, id)       => req('DELETE', `/api/goals/${sid}/${id}`)
export const breakdownGoal = (sid, id)       => req('POST',   `/api/goals/${sid}/${id}/breakdown`)
export const getHabits     = (sid)           => req('GET',    `/api/habits/${sid}`)
export const createHabit   = (sid, data)     => req('POST',   `/api/habits/${sid}`, data)
export const checkinHabit  = (sid, id)       => req('POST',   `/api/habits/${sid}/${id}/checkin`)
export const deleteHabit   = (sid, id)       => req('DELETE', `/api/habits/${sid}/${id}`)
