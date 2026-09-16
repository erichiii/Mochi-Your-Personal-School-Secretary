import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Plus, Sparkles, X } from 'lucide-react'
import useStore from '../../app/store/useStore'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'
import TaskProgress from './components/TaskProgress'
import mochiTodo from '../../assets/mascots/mochi-todo.png'

const fmtReminderOffset = (minutes) => {
  if (minutes < 60)   return `${minutes} min`
  if (minutes < 1440) return `${minutes / 60} hour${minutes / 60 === 1 ? '' : 's'}`
  const d = minutes / 1440
  return `${d} day${d === 1 ? '' : 's'}`
}

const sectionLabelStyle = {
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0',
  color: 'var(--mochi-text)',
  marginBottom: '6px',
  display: 'block',
}

const dueLabel = (deadline) => deadline
  ? new Date(deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  : 'No due date'

export default function TodoPage() {
  const { tasks, loadTasks, createTask, updateTask, deleteTask } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [mochiArrange, setMochiArrange] = useState(false)

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

  const dueThisWeek = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()))
    weekEnd.setHours(23, 59, 59, 999)
    return tasks
      .filter((task) => !task.isDone && task.deadline && task.deadline >= today.getTime() && task.deadline <= weekEnd.getTime())
      .sort((a, b) => a.deadline - b.deadline)
  }, [tasks])

  const otherTasks = useMemo(() => tasks
    .filter((task) => !task.isDone && !dueThisWeek.some((dueTask) => dueTask.id === task.id))
    .sort((a, b) => (a.deadline || Number.MAX_SAFE_INTEGER) - (b.deadline || Number.MAX_SAFE_INTEGER)), [tasks, dueThisWeek])

  const tasksForPanel = dueThisWeek.length > 0 ? dueThisWeek.slice(0, 3) : otherTasks.slice(0, 3)
  const taskHeading = dueThisWeek.length > 0
    ? `You have ${dueThisWeek.length} task${dueThisWeek.length === 1 ? '' : 's'} due this week.`
    : otherTasks.length > 0
      ? 'You have no tasks due this week. Want to stay ahead?'
      : 'Wohoo! A free day today!'
  const taskSupportingText = dueThisWeek.length === 0 && otherTasks.length === 0
    ? 'Use your time productively or rest as needed. Good job!'
    : null

  const handleCreate = async (payload) => {
    await createTask({
      title: payload.title,
      category: payload.category || '',
      deadline: payload.deadline ?? null,
      additionalNotes: payload.additionalNotes || '',
      effort: payload.effort,
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
    <div className="todo-page h-full overflow-y-auto">
      <div className="todo-page__inner">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="todo-page__header stagger-item" style={{ '--delay': '0ms' }}>
          {/* Left: title + stat */}
          <div className="flex items-center gap-3">
            <img src={mochiTodo} alt="Mochi ready to help with tasks" style={{ width: '54px', height: '54px', objectFit: 'contain', imageRendering: 'pixelated' }} />
            <div className="todo-page__heading-copy">
            <h1>To-do</h1>
            <p>
              {stats.done} of {stats.total} tasks completed
            </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="todo-page__add-task"
            >
              {formOpen ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add task</>}
            </button>
          </div>
        </div>

        {/* ── Task form (conditional) ──────────────────────────── */}
        {formOpen && (
          <div className="todo-page__form stagger-item" style={{ '--delay': '0ms' }}>
            <TaskForm
              onCreate={handleCreate}
              categories={categories}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        )}

        {/* ── Today + Progress panels ──────────────────────────── */}
        <div className="todo-page__summary-grid stagger-item" style={{ '--delay': '80ms' }}>
          {/* Tasks Today */}
          <div className="todo-page__summary-card">
            <p className="todo-page__weekly-heading">{taskHeading}</p>
            {taskSupportingText ? <p className="todo-page__weekly-empty">{taskSupportingText}</p> : <div className="todo-page__weekly-list">
              {tasksForPanel.map((task) => <div key={task.id} className="todo-page__weekly-row">
                <button type="button" onClick={() => handleToggleDone(task)} title="Mark task complete" aria-label={`Mark ${task.title || 'task'} complete`}><Circle size={18} strokeWidth={2.4} /></button>
                <span className="todo-page__weekly-task">{task.title || 'Untitled task'}</span>
                {task.category && <span className="todo-page__weekly-subject">{task.category}</span>}
                <span className="todo-page__weekly-date">{dueLabel(task.deadline)}</span>
              </div>)}
            </div>}
          </div>

          {/* Task Progress */}
          <div className="todo-page__progress-card">
            <span style={sectionLabelStyle}>Task Progress</span>
            <TaskProgress tasks={tasks} />
          </div>
        </div>

        {/* ── Task list ────────────────────────────────────────── */}
        <section className="todo-page__tasks stagger-item" style={{ '--delay': '160ms' }}>
          <div className="todo-page__tasks-heading">
            <nav className="todo-page__filters" aria-label="Task filters">
              {['all', 'today', 'upcoming', 'completed'].map((item) => <button key={item} type="button" className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}
            </nav>
            <div className="todo-page__arrange-control">
              <button type="button" aria-pressed={mochiArrange} className={mochiArrange ? 'is-active' : ''} onClick={() => setMochiArrange((value) => !value)} title="Mochi sorts by due date, assessment weight, estimated effort, and urgency.">
                <Sparkles size={14} /> {mochiArrange ? 'Mochi arranged' : 'Let Mochi arrange?'}
              </button>
            </div>
          </div>
          <TaskList
            tasks={tasks}
            categories={categories}
            filter={filter}
            mochiArrange={mochiArrange}
            onToggleDone={handleToggleDone}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </section>

      </div>
    </div>
  )
}
