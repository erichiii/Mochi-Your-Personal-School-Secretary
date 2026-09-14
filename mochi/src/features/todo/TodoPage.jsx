import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Sparkles, X } from 'lucide-react'
import useStore from '../../app/store/useStore'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'
import TasksToday from './components/TasksToday'
import TaskProgress from './components/TaskProgress'

const fmtReminderOffset = (minutes) => {
  if (minutes < 60)   return `${minutes} min`
  if (minutes < 1440) return `${minutes / 60} hour${minutes / 60 === 1 ? '' : 's'}`
  const d = minutes / 1440
  return `${d} day${d === 1 ? '' : 's'}`
}

const sectionLabelStyle = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--mochi-text-muted)',
  marginBottom: '10px',
  display: 'block',
}

export default function TodoPage() {
  const { tasks, loadTasks, createTask, updateTask, deleteTask } = useStore()
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => { loadTasks() }, [])

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.isDone).length
    return { total: tasks.length, done }
  }, [tasks])

  const categories = useMemo(() => {
    const set = new Set()
    tasks.forEach((t) => { if (t.category) set.add(t.category) })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [tasks])

  const handleCreate = async (payload) => {
    await createTask({
      title: payload.title,
      category: payload.category || '',
      deadline: payload.deadline ?? null,
      additionalNotes: payload.additionalNotes || '',
      effort: payload.effort ?? 3,
      priority: 0,
      userPriority: null,
      pomodoroCount: 0,
      reminder: null,
    })
    setFormOpen(false)
  }

  // ── Reminder notifications ──────────────────────────────────────────────
  const timerRefs = useRef([])

  useEffect(() => {
    timerRefs.current.forEach(clearTimeout)
    timerRefs.current = []

    const withReminders = tasks.filter((t) => !t.isDone && t.deadline && t.reminder != null)
    if (!withReminders.length || !('Notification' in window)) return

    const schedule = async () => {
      let perm = Notification.permission
      if (perm === 'default') perm = await Notification.requestPermission()
      if (perm !== 'granted') return

      const now      = Date.now()
      const ONE_WEEK = 7 * 24 * 60 * 60_000

      for (const task of withReminders) {
        const fireAt = task.deadline - task.reminder * 60_000
        const delay  = fireAt - now
        if (delay < 0 || delay > ONE_WEEK) continue

        const body = task.reminder === 0
          ? 'This task is due today!'
          : `Due in ${fmtReminderOffset(task.reminder)}.`

        timerRefs.current.push(
          setTimeout(() => new Notification(`Mochi: ${task.title}`, { body, icon: '/favicon.ico' }), delay)
        )
      }
    }

    schedule()
    return () => timerRefs.current.forEach(clearTimeout)
  }, [tasks])

  const handleToggleDone  = async (task) => updateTask(task.id, { isDone: !task.isDone })
  const handleUpdate      = async (id, data) => updateTask(id, data)
  const handleDelete      = async (task) => deleteTask(task.id)

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--mochi-cream)' }}>
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── Header ──────────────────────────────────────────── */}
        <div
          className="stagger-item flex items-end justify-between gap-4"
          style={{ '--delay': '0ms' }}
        >
          {/* Left: title + stat */}
          <div className="flex flex-col gap-1">
            <p
              style={{
                fontFamily: 'Fraunces, serif',
                fontSize: '26px',
                lineHeight: 1.1,
                fontWeight: 700,
                margin: 0,
                color: 'var(--mochi-mint-dark)',
                letterSpacing: '-0.02em',
              }}
            >
              To-Do Studio
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--mochi-text-muted)' }}>
              {stats.done} of {stats.total} tasks completed
            </p>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="pressable inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
              style={formOpen
                ? { background: 'var(--mochi-pink)', color: 'var(--mochi-pink-dark)', border: '1.5px solid var(--mochi-pink-mid)' }
                : { background: 'var(--mochi-mint)', color: 'var(--mochi-mint-dark)', border: '1.5px solid var(--mochi-mint-mid)' }}
            >
              {formOpen ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add task</>}
            </button>

            <div
              className="flex items-center gap-2 px-3 py-2 rounded-full"
              style={{
                background: 'var(--mochi-mint)',
                color: 'var(--mochi-mint-dark)',
                fontSize: '11px',
                fontWeight: 700,
                border: '1.5px solid var(--mochi-mint-mid)',
              }}
            >
              <Sparkles size={12} />
              <span>Focus on what matters</span>
            </div>
          </div>
        </div>

        {/* ── Task form (conditional) ──────────────────────────── */}
        {formOpen && (
          <div
            className="stagger-item rounded-3xl p-5"
            style={{
              '--delay': '0ms',
              background: 'var(--mochi-surface)',
              border: '1px solid var(--mochi-border)',
              boxShadow: '0 4px 24px -8px rgba(0,0,0,0.06)',
            }}
          >
            <TaskForm
              onCreate={handleCreate}
              categories={categories}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        )}

        {/* ── Today + Progress panels ──────────────────────────── */}
        <div
          className="stagger-item grid gap-4"
          style={{ '--delay': '80ms', gridTemplateColumns: '1fr 248px' }}
        >
          {/* Tasks Today */}
          <div
            className="rounded-3xl p-5 flex flex-col"
            style={{
              background: 'var(--mochi-surface)',
              border: '1px solid var(--mochi-border)',
              boxShadow: '0 4px 24px -8px rgba(0,0,0,0.04)',
              minHeight: '200px',
            }}
          >
            <span style={sectionLabelStyle}>Tasks Today</span>
            <TasksToday tasks={tasks} />
          </div>

          {/* Task Progress */}
          <div
            className="rounded-3xl p-5 flex flex-col"
            style={{
              background: 'var(--mochi-surface)',
              border: '1px solid var(--mochi-border)',
              boxShadow: '0 4px 24px -8px rgba(0,0,0,0.04)',
            }}
          >
            <span style={sectionLabelStyle}>Task Progress</span>
            <TaskProgress tasks={tasks} />
          </div>
        </div>

        {/* ── Task list ────────────────────────────────────────── */}
        <div className="stagger-item" style={{ '--delay': '160ms' }}>
          <TaskList
            tasks={tasks}
            categories={categories}
            onToggleDone={handleToggleDone}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </div>

      </div>
    </div>
  )
}
