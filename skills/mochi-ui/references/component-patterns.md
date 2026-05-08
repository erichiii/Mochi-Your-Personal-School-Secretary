# Mochi Component Patterns — Advanced Reference

Complex, reusable component patterns beyond the basics in `mochi-ui/SKILL.md`.
Read this when building modals, dropdowns, the pomodoro display, color pickers, or
any multi-state interactive UI.

---

## Dropdown Menu

Used for: subject picker on a note, category picker on a task, mode selector.

```jsx
import { useState, useEffect, useRef } from 'react'

function Dropdown({ trigger, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden shadow-lg fade-in"
          style={{
            background: 'var(--mochi-surface)',
            border: '1.5px solid var(--mochi-border)',
            minWidth: '160px',
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// Dropdown item
function DropdownItem({ onClick, children, color }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-sm font-semibold transition-colors"
      style={{ color: 'var(--mochi-text)' }}
      onMouseEnter={e => e.currentTarget.style.background = color ? color + '33' : 'var(--mochi-cream)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </button>
  )
}
```

---

## Modal / Dialog

Used for: confirm delete, add subject, flashcard editor.

```jsx
import { useEffect } from 'react'

function Modal({ open, onClose, title, children }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(61, 44, 53, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Panel — stop propagation so click inside doesn't close */}
      <div
        className="w-full max-w-md rounded-2xl p-6 fade-in"
        style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: 'Fraunces, serif', color: 'var(--mochi-text)' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--mochi-text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--mochi-border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Modal footer with action buttons
function ModalFooter({ onCancel, onConfirm, confirmLabel = 'Confirm', confirmColor = 'pink', danger = false }) {
  const colors = {
    pink:     { bg: 'var(--mochi-pink)',     border: 'var(--mochi-pink-mid)',     text: 'var(--mochi-pink-dark)'     },
    lavender: { bg: 'var(--mochi-lavender)', border: 'var(--mochi-lavender-mid)', text: 'var(--mochi-lavender-dark)' },
    mint:     { bg: 'var(--mochi-mint)',     border: 'var(--mochi-mint-mid)',     text: 'var(--mochi-mint-dark)'     },
    danger:   { bg: '#FCEBEB',              border: '#F5AEAE',                   text: '#A32D2D'                    },
  }
  const c = danger ? colors.danger : colors[confirmColor]

  return (
    <div className="flex gap-2 mt-4">
      <button
        onClick={onCancel}
        className="flex-1 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
        style={{ background: 'var(--mochi-border)', color: 'var(--mochi-text-soft)' }}
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="flex-1 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
        style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}` }}
      >
        {confirmLabel}
      </button>
    </div>
  )
}
```

---

## Color Picker (Subject Colors)

Used for: picking subject color when creating or editing a subject.

```jsx
const SUBJECT_COLORS = [
  { value: '#FFB3C6', text: '#9B3A5A', label: 'Pink'     },
  { value: '#C9B8F5', text: '#5B3A9B', label: 'Lavender' },
  { value: '#A8E6CF', text: '#2D7A5A', label: 'Mint'     },
  { value: '#FFCBA4', text: '#9B5A2D', label: 'Peach'    },
  { value: '#A8D4F5', text: '#2D5A9B', label: 'Sky'      },
  { value: '#FFE899', text: '#7A6200', label: 'Yellow'   },
]

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {SUBJECT_COLORS.map(c => (
        <button
          key={c.value}
          title={c.label}
          onClick={() => onChange(c.value)}
          className="w-6 h-6 rounded-full transition-all"
          style={{
            background: c.value,
            outline: value === c.value ? `2.5px solid ${c.value}` : 'none',
            outlineOffset: '2.5px',
            transform: value === c.value ? 'scale(1.2)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  )
}
```

---

## Pomodoro Timer Display

Used in: `TaskCard.jsx` — shows the circular timer with progress ring.

```jsx
function PomodoroDisplay({ secondsLeft, totalSeconds, isRunning, isBreak, onToggle }) {
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const progress = secondsLeft / totalSeconds
  const dashOffset = circumference * (1 - progress)

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')

  const color = isBreak ? 'var(--mochi-mint-dark)' : 'var(--mochi-pink-dark)'
  const trackColor = isBreak ? 'var(--mochi-mint)' : 'var(--mochi-pink)'

  return (
    <div className="flex items-center gap-2">
      {/* SVG ring */}
      <div className="relative cursor-pointer" onClick={onToggle}>
        <svg width="52" height="52" viewBox="0 0 52 52">
          {/* Track */}
          <circle cx="26" cy="26" r={radius} fill="none" stroke={trackColor} strokeWidth="4" />
          {/* Progress */}
          <circle
            cx="26" cy="26" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 26 26)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        {/* Time label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color, fontSize: '10px' }}>
            {mins}:{secs}
          </span>
        </div>
      </div>

      {/* Status label */}
      <span className="text-xs font-semibold" style={{ color: 'var(--mochi-text-muted)' }}>
        {isBreak ? 'Break' : isRunning ? 'Focus' : 'Paused'}
      </span>
    </div>
  )
}
```

---

## Toast Notification

Used for: "Note saved", "Schedule exported", "Flashcards generated" confirmations.

```jsx
import { useState, useCallback } from 'react'

// Hook
export function useToast() {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  return { toasts, show }
}

// Renderer — place once in App.jsx
function ToastContainer({ toasts }) {
  const colors = {
    success: { bg: 'var(--mochi-mint)',     text: 'var(--mochi-mint-dark)'     },
    error:   { bg: 'var(--mochi-pink)',     text: 'var(--mochi-pink-dark)'     },
    info:    { bg: 'var(--mochi-lavender)', text: 'var(--mochi-lavender-dark)' },
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const c = colors[t.type] || colors.info
        return (
          <div
            key={t.id}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm fade-in"
            style={{
              background: c.bg,
              color: c.text,
              border: `1.5px solid ${c.text}33`,
            }}
          >
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
```

---

## Collapsible Section

Used for: subject groups in sidebar, day sections in study plan.

```jsx
function CollapsibleSection({ title, count, color, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 transition-colors"
        onMouseEnter={e => e.currentTarget.style.background = 'var(--mochi-border)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="flex-1 text-left text-sm font-bold" style={{ color: 'var(--mochi-text)' }}>
          {title}
        </span>
        {count != null && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: color + '44', color: 'var(--mochi-text-soft)' }}
          >
            {count}
          </span>
        )}
        <ChevronDown
          size={13}
          style={{
            color: 'var(--mochi-text-muted)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {open && (
        <div className="fade-in">
          {children}
        </div>
      )}
    </div>
  )
}
```

---

## Inline Editable Text

Used for: renaming subjects, editing note titles inline in the list.

```jsx
function InlineEdit({ value, onSave, className, style }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const save = () => {
    if (draft.trim() && draft !== value) onSave(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        onClick={e => e.stopPropagation()}
        className={`bg-transparent outline-none border-b ${className}`}
        style={{ borderColor: 'var(--mochi-pink-mid)', ...style }}
      />
    )
  }

  return (
    <span
      className={`cursor-text ${className}`}
      style={style}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
    >
      {value}
    </span>
  )
}
```

---

## Offline Banner

Used in: `App.jsx` — shown at the top when the user is offline.

```jsx
function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (online) return null

  return (
    <div
      className="flex items-center justify-center gap-2 py-2 text-xs font-semibold"
      style={{ background: 'var(--mochi-peach)', color: 'var(--mochi-peach-dark)', borderBottom: '1.5px solid var(--mochi-peach-mid)' }}
    >
      <WifiOff size={13} />
      You're offline — AI features are unavailable. Everything else works normally.
    </div>
  )
}
```