import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, Check, Trash2 } from 'lucide-react'

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

const sortTasks = (tasks) => {
  return [...tasks].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1
    const aDeadline = a.deadline ?? Number.MAX_SAFE_INTEGER
    const bDeadline = b.deadline ?? Number.MAX_SAFE_INTEGER
    if (aDeadline !== bDeadline) return aDeadline - bDeadline
    return (b.updatedAt || 0) - (a.updatedAt || 0)
  })
}

function TaskRow({ task, categories = [], onToggleDone, onDelete, onUpdate }) {
  const [title, setTitle] = useState(task.title || '')
  const [category, setCategory] = useState(task.category || '')
  const [deadline, setDeadline] = useState(task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '')
  const [additionalNotes, setAdditionalNotes] = useState(task.additionalNotes || '')
  const [categoryMode, setCategoryMode] = useState('select')
  const deadlineRef = useRef(null)

  useEffect(() => {
    setTitle(task.title || '')
    setCategory(task.category || '')
    setDeadline(task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '')
    setAdditionalNotes(task.additionalNotes || '')
    const inList = task.category && categories.includes(task.category)
    setCategoryMode(inList || !task.category ? 'select' : 'custom')
  }, [task, categories])

  const saveField = (key, value) => {
    onUpdate(task.id, { [key]: value })
  }

  return (
    <tr style={{ borderTop: '1px solid var(--mochi-border)' }}>
      <td style={{ padding: '10px 12px', width: '28%' }}>
        <div className="flex items-center gap-3">
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
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title.trim()) saveField('title', title.trim()) }}
            style={fieldStyle}
          />
        </div>
      </td>
      <td style={{ padding: '10px 12px', width: '18%' }}>
        <div className="flex flex-col gap-2">
          <select
            value={categoryMode === 'custom' ? '__custom__' : (category || '')}
            onChange={(e) => {
              const value = e.target.value
              if (value === '__custom__') {
                setCategoryMode('custom')
                if (!category) setCategory('')
                return
              }
              setCategoryMode('select')
              setCategory(value)
              saveField('category', value)
            }}
            style={fieldStyle}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__custom__">Add new category…</option>
          </select>
          {categoryMode === 'custom' && (
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onBlur={() => saveField('category', category.trim())}
              placeholder="New category"
              style={fieldStyle}
            />
          )}
        </div>
      </td>
      <td style={{ padding: '10px 12px', width: '18%' }}>
        <div className="flex items-center gap-2">
          <input
            ref={deadlineRef}
            type="date"
            value={deadline}
            onChange={(e) => {
              const next = e.target.value
              setDeadline(next)
              saveField('deadline', next ? new Date(next + 'T00:00:00').getTime() : null)
            }}
            style={{ ...fieldStyle, appearance: 'auto', WebkitAppearance: 'auto' }}
          />
          <button
            type="button"
            onClick={() => {
              if (deadlineRef.current?.showPicker) {
                deadlineRef.current.showPicker()
              } else {
                deadlineRef.current?.focus()
              }
            }}
            className="p-2 rounded-lg"
            style={{ border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text-muted)' }}
            title="Pick a date"
          >
            <Calendar size={14} />
          </button>
        </div>
      </td>
      <td style={{ padding: '10px 12px', width: '14%' }}>
        <select
          value={task.isDone ? 'done' : 'not-started'}
          onChange={(e) => saveField('isDone', e.target.value === 'done')}
          style={fieldStyle}
        >
          <option value="not-started">Not started</option>
          <option value="done">Done</option>
        </select>
      </td>
      <td style={{ padding: '10px 12px', width: '22%' }}>
        <div className="flex items-center gap-2">
          <input
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            onBlur={() => saveField('additionalNotes', additionalNotes.trim())}
            placeholder="Notes"
            style={fieldStyle}
          />
          <button
            onClick={() => onDelete(task)}
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--mochi-pink-dark)' }}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function TaskList({ tasks, categories = [], onToggleDone, onDelete, onUpdate }) {
  const sorted = sortTasks(tasks)

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-6" style={{ borderColor: 'var(--mochi-border)' }}>
        <p className="text-sm" style={{ color: 'var(--mochi-text-muted)' }}>
          No tasks yet. Add your first one above.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl overflow-hidden" style={{ border: '1.5px solid var(--mochi-border)', background: 'var(--mochi-surface)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: 'var(--mochi-cream)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '10px', color: 'var(--mochi-text-muted)' }}>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Tasks</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Category</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Due date</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Additional notes</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              categories={categories}
              onToggleDone={onToggleDone}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
