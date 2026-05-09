import { useMemo, useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'

const fieldStyle = {
  background: 'var(--mochi-cream)',
  border: '1.5px solid var(--mochi-border)',
  color: 'var(--mochi-text)',
  borderRadius: '10px',
  padding: '6px 10px',
  fontSize: '12px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const formatDate = (ts) => {
  if (!ts) return 'No deadline'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return 'No deadline'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function TaskCard({ task, onToggleDone, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(task.title || '')
  const [category, setCategory] = useState(task.category || '')
  const [deadline, setDeadline] = useState(task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '')

  const deadlineLabel = useMemo(() => formatDate(task.deadline), [task.deadline])

  const handleSave = () => {
    if (!title.trim()) return
    onUpdate(task.id, {
      title: title.trim(),
      category: category.trim(),
      deadline: deadline ? new Date(deadline + 'T00:00:00').getTime() : null,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTitle(task.title || '')
    setCategory(task.category || '')
    setDeadline(task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '')
    setIsEditing(false)
  }

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-2xl"
      style={{
        background: 'var(--mochi-surface)',
        border: '1.5px solid var(--mochi-border)',
        opacity: task.isDone ? 0.6 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleDone(task)}
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            border: '1.5px solid var(--mochi-mint-mid)',
            background: task.isDone ? 'var(--mochi-mint)' : 'transparent',
            color: 'var(--mochi-mint-dark)',
          }}
          title={task.isDone ? 'Mark as not done' : 'Mark as done'}
        >
          {task.isDone && <Check size={12} />}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          {isEditing ? (
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={fieldStyle} />
          ) : (
            <div
              className="text-sm font-semibold"
              style={{ color: task.isDone ? 'var(--mochi-text-muted)' : 'var(--mochi-text)' }}
            >
              {task.title}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {isEditing ? (
              <input value={category} onChange={(e) => setCategory(e.target.value)} style={fieldStyle} />
            ) : (
              <span
                className="text-[10px] px-2 py-1 rounded-full"
                style={{ background: 'var(--mochi-cream)', color: 'var(--mochi-text-soft)' }}
              >
                {task.category || 'Uncategorized'}
              </span>
            )}

            {isEditing ? (
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={fieldStyle} />
            ) : (
              <span className="text-[10px] font-semibold" style={{ color: 'var(--mochi-text-muted)' }}>
                {deadlineLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--mochi-mint-dark)', background: 'var(--mochi-mint)' }}
                title="Save"
              >
                <Check size={12} />
              </button>
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--mochi-text-muted)' }}
                title="Cancel"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--mochi-text-muted)' }}
                title="Edit"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => onDelete(task)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--mochi-pink-dark)' }}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
