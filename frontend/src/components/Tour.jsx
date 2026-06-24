import { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'

/**
 * Reusable guided product tour with a Framer-Motion spotlight.
 *
 * Props:
 *  - steps: [{ selector?: string, title, body, placement? }]  (no selector = centered modal)
 *  - run:   boolean — whether the tour is active
 *  - onClose: () => void  (fired on finish or skip)
 */
export default function Tour({ steps, run, onClose }) {
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState(null)

  const step = steps[idx]
  const isLast = idx === steps.length - 1

  const measure = useCallback(() => {
    if (!step) return
    if (!step.selector) { setRect(null); return }
    const el = document.querySelector(step.selector)
    if (!el) { setRect(null); return }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // measure after scroll settles
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    })
  }, [step])

  useLayoutEffect(() => {
    if (run) measure()
  }, [run, idx, measure])

  useEffect(() => {
    if (!run) return
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [run, measure])

  useEffect(() => { if (run) setIdx(0) }, [run])

  if (!run || !step) return null

  const finish = () => { onClose?.(); setIdx(0) }
  const next = () => (isLast ? finish() : setIdx(i => i + 1))
  const back = () => setIdx(i => Math.max(0, i - 1))

  // Tooltip position: below the element if room, else above; centered if no target.
  const pad = 14
  let tipStyle = {}
  if (rect) {
    const below = rect.top + rect.height + 220 < window.innerHeight
    const top = below ? rect.top + rect.height + pad : Math.max(pad, rect.top - 200 - pad)
    let left = rect.left + rect.width / 2 - 150
    left = Math.max(pad, Math.min(left, window.innerWidth - 300 - pad))
    tipStyle = { top, left }
  } else {
    tipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  return (
    <AnimatePresence>
      {/* Dimmer when there is no target (centered) */}
      {!rect && (
        <motion.div className="fixed inset-0 z-[9997] bg-black/65"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      )}

      {/* Spotlight box */}
      {rect && (
        <motion.div
          className="tour-highlight-box"
          initial={false}
          animate={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        />
      )}

      {/* Tooltip card */}
      <motion.div
        key={idx}
        className="tour-tooltip"
        style={tipStyle}
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted">
              Step {idx + 1} / {steps.length}
            </span>
          </div>
          <button onClick={finish} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <h3 className="text-base font-bold text-primary mb-1">{step.title}</h3>
        <p className="text-sm text-muted leading-relaxed">{step.body}</p>

        {/* progress dots */}
        <div className="flex items-center gap-1.5 mt-4">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-accent' : 'w-1.5 bg-gray-300'}`} />
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button onClick={finish} className="text-xs text-muted hover:text-primary transition-colors">Skip tour</button>
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <button onClick={back} className="btn-outline text-xs py-1.5 px-3">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            <button onClick={next} className="btn-primary text-xs py-1.5 px-3">
              {isLast ? 'Finish' : 'Next'} {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
