import { useEffect, useMemo, useState } from 'react'
import { Plus, Sparkles, X } from 'lucide-react'
import useStore from '../store'
import TaskForm from '../components/todo/TaskForm'
import TaskList from '../components/todo/TaskList'
import TasksToday from '../components/todo/TasksToday'
import TaskProgress from '../components/todo/TaskProgress'

const labelStyle = {
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

  useEffect(() => {
    loadTasks()
  }, [])

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.isDone).length
    return { total: tasks.length, done }
  }, [tasks])

  const categories = useMemo(() => {
    const set = new Set()
    tasks.forEach((t) => {
      if (t.category) set.add(t.category)
    })
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
    })
    setFormOpen(false)
  }

  const handleToggleDone = async (task) => {
    await updateTask(task.id, { isDone: !task.isDone })
  }

  const handleUpdate = async (id, data) => {
    await updateTask(id, data)
  }

  const handleDelete = async (task) => {
    await deleteTask(task.id)
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', margin: 0, color: 'var(--mochi-mint-dark)' }}>
              To-Do Studio
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--mochi-text-muted)' }}>
              {stats.done} of {stats.total} tasks done
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={formOpen
                ? { background: 'var(--mochi-pink)', color: 'var(--mochi-pink-dark)', border: '1.5px solid var(--mochi-pink-mid)' }
                : { background: 'var(--mochi-mint)', color: 'var(--mochi-mint-dark)', border: '1.5px solid var(--mochi-mint-mid)' }}
            >
              {formOpen ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add task</>}
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: 'var(--mochi-mint)', color: 'var(--mochi-mint-dark)', fontSize: '11px', fontWeight: 700 }}>
              <Sparkles size={12} /> Focus on what matters
            </div>
          </div>
        </div>

        {/* Add task form */}
        {formOpen && (
          <div className="rounded-3xl p-5" style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}>
            <TaskForm
              onCreate={handleCreate}
              categories={categories}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        )}

        {/* Tasks Today + Task Progress */}
        <div className="flex gap-4 items-stretch">
          <div className="flex-1 rounded-3xl p-5 flex flex-col" style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}>
            <span style={labelStyle}>Tasks Today</span>
            <TasksToday tasks={tasks} />
          </div>
          <div className="rounded-3xl p-5 flex flex-col" style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)', width: '250px', flexShrink: 0 }}>
            <span style={labelStyle}>Task Progress</span>
            <TaskProgress tasks={tasks} />
          </div>
        </div>

        {/* Task list */}
        <TaskList
          tasks={tasks}
          categories={categories}
          onToggleDone={handleToggleDone}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />

      </div>
    </div>
  )
}
