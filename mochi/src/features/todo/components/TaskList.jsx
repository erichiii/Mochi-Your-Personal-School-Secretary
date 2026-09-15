import { createPortal } from 'react-dom'
import { Fragment, useEffect, useRef, useState } from 'react'
import { ArrowDownUp, Bell, Calendar, Check, Tag, Timer, Trash2 } from 'lucide-react'
import { computePriority, priorityMeta } from '../../../shared/utils/priority'
import PomodoroTimer from './PomodoroTimer'

export const REMINDER_OPTIONS = [
  { label: 'No reminder',    value: null },
  { label: 'On due date',    value: 0    },
  { label: '30 min before',  value: 30   },
  { label: '1 hour before',  value: 60   },
  { label: '3 hours before', value: 180  },
  { label: '1 day before',   value: 1440 },
  { label: '2 days before',  value: 2880 },
]

// ── Helpers ────────────────────────────────────────────────────────────────

const toLocalDate = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fmtDeadline = (ts) => {
  const d     = new Date(ts)
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dDay  = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff  = Math.round((dDay - today) / 86_400_000)

  if (diff < 0)   return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), tone: 'overdue' }
  if (diff === 0) return { text: 'Today',    tone: 'today'  }
  if (diff === 1) return { text: 'Tomorrow', tone: 'soon'   }
  if (diff <= 3)  return { text: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), tone: 'soon'   }
  if (diff <= 7)  return { text: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), tone: 'normal' }
  return               { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),                    tone: 'normal' }
}

const DATE_TONE = {
  overdue: { bg: 'var(--mochi-pink)',  color: 'var(--mochi-pink-dark)'  },
  today:   { bg: 'var(--mochi-peach)', color: 'var(--mochi-peach-dark)' },
  soon:    { bg: 'var(--mochi-peach)', color: 'var(--mochi-peach-dark)' },
  normal:  { bg: 'var(--mochi-cream)', color: 'var(--mochi-text-muted)' },
}

const sortByPriority = (arr) =>
  [...arr]
    .map((t) => ({ ...t, _score: computePriority(t) }))
    .sort((a, b) => b._score - a._score)

// ── Reminder dropdown (portal) ─────────────────────────────────────────────

function ReminderDropdown({ position, value, onChange, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const left = Math.min(position.left, window.innerWidth - 184)

  return createPortal(
    <div
      ref={ref}
      className="fade-in"
      style={{
        position: 'fixed', top: position.top, left, zIndex: 9999,
        minWidth: '168px',
        background: 'var(--mochi-surface)',
        border: '1.5px solid var(--mochi-border)',
        borderRadius: '14px',
        padding: '4px 0',
        boxShadow: '0 8px 28px -4px rgba(0,0,0,0.16)',
      }}
    >
      {REMINDER_OPTIONS.map((opt) => {
        const active = (value ?? null) === opt.value
        return (
          <button
            key={String(opt.value)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onChange(opt.value); onClose() }}
            className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors"
            style={{ fontWeight: active ? 700 : 500, color: active ? 'var(--mochi-mint-dark)' : 'var(--mochi-text)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-cream)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ width: 10, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              {active && <Check size={9} />}
            </span>
            {opt.label}
          </button>
        )
      })}
    </div>,
    document.body
  )
}

// ── Task row ───────────────────────────────────────────────────────────────

function TaskRow({ task, categories = [], onToggleDone, onDelete, onUpdate }) {
  const [title,    setTitle]    = useState(task.title || '')
  const [category, setCategory] = useState(task.category || '')
  const [deadline, setDeadline] = useState(task.deadline ? toLocalDate(task.deadline) : '')
  const [notes,    setNotes]    = useState(task.additionalNotes || '')
  const [effort,   setEffort]   = useState(task.effort ?? 3)
  const [catEdit,      setCatEdit]      = useState(null) // null | 'select' | 'custom'
  const [dateEdit,     setDateEdit]     = useState(false)
  const [timerOpen,    setTimerOpen]    = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderPos,  setReminderPos]  = useState({ top: 0, left: 0 })
  const dateRef = useRef()

  useEffect(() => {
    setTitle(task.title || '')
    setCategory(task.category || '')
    setDeadline(task.deadline ? toLocalDate(task.deadline) : '')
    setNotes(task.additionalNotes || '')
    setEffort(task.effort ?? 3)
  }, [task])

  const save = (key, val) => onUpdate(task.id, { [key]: val })

  const score    = computePriority({ ...task, effort })
  const meta     = priorityMeta(score)
  const dateInfo = task.deadline ? fmtDeadline(task.deadline) : null
  const hasReminder   = task.reminder != null
  const reminderLabel = REMINDER_OPTIONS.find((o) => o.value === (task.reminder ?? null))?.label

  const openReminder = (e) => {
    if (reminderOpen) { setReminderOpen(false); return }
    const rect = e.currentTarget.getBoundingClientRect()
    setReminderPos({ top: rect.bottom + 6, left: rect.right - 168 })
    setReminderOpen(true)
  }

  return (
    <Fragment>
      <tr
        className={`task-row group ${task.isDone ? 'is-completed' : ''}`}
        style={{ borderTop: '1px solid var(--mochi-border)', transition: 'opacity 0.2s' }}
      >
        {/* Priority accent */}
        <td style={{ padding: 0, width: 3, verticalAlign: 'middle' }}>
          <div style={{ width: 3, minHeight: 48, height: '100%', background: meta.text, opacity: task.isDone ? 0.4 : 1 }} />
        </td>

        {/* Task */}
        <td style={{ padding: '10px 12px', width: '26%', verticalAlign: 'middle', overflow: 'hidden' }}>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onToggleDone(task)}
              className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
              style={{ border: `1.5px solid ${meta.text}`, background: task.isDone ? meta.bg : 'transparent', color: meta.text }}
              title={task.isDone ? 'Mark incomplete' : 'Mark complete'}
            >
              {task.isDone && <Check size={10} />}
            </button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { if (title.trim()) save('title', title.trim()) }}
              style={{
                flex: 1, minWidth: 0,
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: '13px', fontWeight: 600,
                color: 'var(--mochi-text)',
                fontFamily: 'var(--font-body)',
                textDecoration: task.isDone ? 'line-through' : 'none',
              }}
            />
          </div>
        </td>

        {/* Category */}
        <td style={{ padding: '10px 12px', width: '14%', verticalAlign: 'middle', overflow: 'hidden' }}>
          {catEdit === 'custom' ? (
            <input
              autoFocus
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  { save('category', category.trim()); setCatEdit(null) }
                if (e.key === 'Escape') { setCategory(task.category || ''); setCatEdit(null) }
              }}
              onBlur={() => { save('category', category.trim()); setCatEdit(null) }}
              placeholder="New category"
              style={{ fontSize: '11px', background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-lavender-mid)', borderRadius: '99px', padding: '2px 8px', outline: 'none', color: 'var(--mochi-text)', width: '100%' }}
            />
          ) : catEdit === 'select' ? (
            <select
              autoFocus
              value={category || ''}
              onChange={(e) => {
                const v = e.target.value
                if (v === '__new__') { setCatEdit('custom'); setCategory(''); return }
                setCategory(v); save('category', v); setCatEdit(null)
              }}
              onBlur={() => setCatEdit(null)}
              style={{ fontSize: '11px', background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', borderRadius: '8px', padding: '3px 6px', outline: 'none', color: 'var(--mochi-text)', width: '100%' }}
            >
              <option value="">No category</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__new__">Add new…</option>
            </select>
          ) : (
            <button
              onClick={() => setCatEdit('select')}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all"
              style={{
                maxWidth: '100%', overflow: 'hidden',
                background: category ? 'var(--mochi-lavender)'      : 'transparent',
                color:      category ? 'var(--mochi-lavender-dark)'  : 'var(--mochi-text-muted)',
                border:     category ? '1.5px solid var(--mochi-lavender-mid)' : '1.5px solid var(--mochi-border)',
              }}
            >
              <Tag size={9} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                {category || 'None'}
              </span>
            </button>
          )}
        </td>

        {/* Due date */}
        <td style={{ padding: '10px 12px', width: '13%', verticalAlign: 'middle', overflow: 'hidden' }}>
          {dateEdit ? (
            <input
              ref={dateRef}
              type="date"
              autoFocus
              value={deadline}
              onChange={(e) => {
                const v = e.target.value
                setDeadline(v)
                save('deadline', v ? new Date(v + 'T00:00:00').getTime() : null)
              }}
              onBlur={() => setDateEdit(false)}
              style={{ fontSize: '11px', background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', borderRadius: '8px', padding: '3px 6px', outline: 'none', color: 'var(--mochi-text)', width: '100%' }}
            />
          ) : (
            <button
              onClick={() => { setDateEdit(true); setTimeout(() => dateRef.current?.showPicker?.(), 60) }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all"
              style={dateInfo
                ? { background: DATE_TONE[dateInfo.tone].bg, color: DATE_TONE[dateInfo.tone].color, border: '1.5px solid transparent' }
                : { background: 'transparent', color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }
              }
            >
              <Calendar size={9} />
              {dateInfo ? dateInfo.text : 'Set date'}
            </button>
          )}
        </td>

        {/* Effort */}
        <td style={{ padding: '10px 12px', width: '9%', verticalAlign: 'middle' }}>
          <div className="flex items-center gap-[3px]" title={`Effort: ${effort}/5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => { setEffort(n); save('effort', n) }}
                title={['', 'Very easy', 'Easy', 'Medium', 'Hard', 'Very hard'][n]}
                style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: n <= effort ? meta.text : 'var(--mochi-border)',
                  border: 'none', padding: 0, cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
              />
            ))}
          </div>
        </td>

        {/* Priority */}
        <td style={{ padding: '10px 12px', width: '11%', verticalAlign: 'middle' }}>
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full self-start"
              style={{ background: meta.bg, color: meta.text }}
              title={`Score: ${score}/100`}
            >
              {meta.label}
            </span>
            <span style={{ fontSize: '9px', color: 'var(--mochi-text-muted)', paddingLeft: '2px' }}>{score}/100</span>
          </div>
        </td>

        {/* Notes + Actions */}
        <td style={{ padding: '10px 12px', width: '24%', verticalAlign: 'middle', overflow: 'hidden' }}>
          <div className="flex items-center gap-1.5">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={(e) => save('additionalNotes', e.target.value.trim())}
              placeholder="Notes"
              style={{
                flex: 1, minWidth: 0,
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: '11px', color: 'var(--mochi-text-muted)',
                fontFamily: 'var(--font-body)',
              }}
            />

            {/* Always-visible badges */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {(task.pomodoroCount || 0) > 0 && (
                <span
                  className="flex items-center gap-0.5"
                  style={{ fontSize: '9px', color: 'var(--mochi-text-muted)', lineHeight: 1 }}
                  title={`${task.pomodoroCount} pomodoro${task.pomodoroCount === 1 ? '' : 's'}`}
                >
                  <Timer size={9} strokeWidth={2} />
                  {task.pomodoroCount}
                </span>
              )}
              {hasReminder && (
                <span
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                  style={{ fontSize: '9px', color: 'var(--mochi-peach-dark)', background: 'var(--mochi-peach)' }}
                  title={reminderLabel}
                >
                  <Bell size={8} strokeWidth={2} />
                </span>
              )}
            </div>

            {/* Hover-only action buttons */}
            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
              <div className="relative">
                <button
                  onClick={openReminder}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: hasReminder ? 'var(--mochi-peach-dark)' : 'var(--mochi-text-muted)', background: hasReminder ? 'var(--mochi-peach)' : 'transparent' }}
                  title={hasReminder ? reminderLabel : 'Set reminder'}
                >
                  <Bell size={11} />
                </button>
              </div>
              <button
                onClick={() => setTimerOpen((v) => !v)}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: timerOpen ? 'var(--mochi-mint-dark)' : 'var(--mochi-text-muted)', background: timerOpen ? 'var(--mochi-mint)' : 'transparent' }}
                title={timerOpen ? 'Close timer' : 'Start Pomodoro'}
              >
                <Timer size={12} />
              </button>
              <button
                onClick={() => onDelete(task)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--mochi-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mochi-pink-dark)'; e.currentTarget.style.background = 'var(--mochi-pink)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mochi-text-muted)'; e.currentTarget.style.background = 'transparent' }}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </td>
      </tr>

      {/* Pomodoro timer sub-row */}
      {timerOpen && (
        <tr>
          <td colSpan={7} style={{ padding: 0 }}>
            <PomodoroTimer
              task={task}
              onPomodoroComplete={() => onUpdate(task.id, { pomodoroCount: (task.pomodoroCount || 0) + 1 })}
              onClose={() => setTimerOpen(false)}
            />
          </td>
        </tr>
      )}

      {/* Reminder portal */}
      {reminderOpen && (
        <ReminderDropdown
          position={reminderPos}
          value={task.reminder ?? null}
          onChange={(v) => save('reminder', v)}
          onClose={() => setReminderOpen(false)}
        />
      )}
    </Fragment>
  )
}

// ── TaskList ───────────────────────────────────────────────────────────────

export default function TaskList({ tasks, categories = [], filter = 'all', onToggleDone, onDelete, onUpdate }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = today.getTime() + 86_400_000
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'completed') return task.isDone
    if (filter === 'today') return !task.isDone && task.deadline >= today.getTime() && task.deadline < tomorrow
    if (filter === 'upcoming') return !task.isDone && task.deadline >= tomorrow
    return true
  })
  const active = sortByPriority(filteredTasks.filter((t) => !t.isDone))
  const done   = filteredTasks.filter((t) => t.isDone).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  if (filteredTasks.length === 0) {
    return (
      <div className="todo-task-empty">
        <p>{tasks.length === 0 ? 'No tasks yet. Add your first one above.' : `No ${filter} tasks right now.`}</p>
      </div>
    )
  }

  const rowProps = { categories, onToggleDone, onDelete, onUpdate }

  return (
    <div className="todo-task-list">
      <table className="todo-task-table" style={{ width: '100%', fontSize: '12px', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: 'var(--mochi-cream)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '10px', color: 'var(--mochi-text-muted)' }}>
            <th style={{ width: 3, padding: 0 }} />
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Task</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Subject</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Due date</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Effort</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>
              <span className="flex items-center gap-1">Priority <ArrowDownUp size={9} /></span>
            </th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {active.map((task) => <TaskRow key={task.id} task={task} {...rowProps} />)}

          {/* Completed section divider */}
          {done.length > 0 && active.length > 0 && (
            <tr className="task-list-completed-divider">
              <td colSpan={7} style={{ padding: '6px 16px', background: 'var(--mochi-cream)' }}>
                <div className="flex items-center gap-3">
                  <div style={{ flex: 1, height: 1, background: 'var(--mochi-border)' }} />
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--mochi-text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Completed · {done.length}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--mochi-border)' }} />
                </div>
              </td>
            </tr>
          )}

          {done.map((task) => <TaskRow key={task.id} task={task} {...rowProps} />)}
        </tbody>
      </table>
    </div>
  )
}
