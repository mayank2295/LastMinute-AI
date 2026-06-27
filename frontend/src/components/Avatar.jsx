import { useState, useEffect } from 'react'

/**
 * User avatar — shows the Google profile picture when available, with a clean
 * initial-letter fallback (used in demo mode, on image load error, or before
 * the picture loads). `referrerPolicy="no-referrer"` is required or Google
 * may block the image from loading on a custom domain.
 */
export default function Avatar({ src, name, email, size = 32, className = '' }) {
  const [error, setError] = useState(false)
  useEffect(() => setError(false), [src])

  const initial = (name?.[0] || email?.[0] || 'U').toUpperCase()
  const dim = { width: size, height: size }

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name || 'User'}
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
        style={dim}
        className={`rounded-full object-cover border border-accent-border ${className}`}
      />
    )
  }

  return (
    <div
      style={{ ...dim, fontSize: size * 0.42 }}
      className={`rounded-full bg-accent-light border border-accent-border flex items-center justify-center font-bold text-accent-text select-none ${className}`}
    >
      {initial}
    </div>
  )
}
