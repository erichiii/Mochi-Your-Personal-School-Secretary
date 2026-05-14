import { useEffect, useRef, useState } from 'react'
import { ArrowDownUp, Calendar, Check, Trash2 } from 'lucide-react'
import { computePriority, priorityMeta } from '../../utils/priority'

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

const sortTasks = (tasks) =>
  [...tasks]
    .map((t) => ({ ...t, _score: computePriority(t) }))
    .sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1
      return b._score - a._score
    })

function EffortPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all"
          title={['', 'Very easy', 'Easy', 'Medium', 'Hard', 'Very hard'][n]}
          style={{
            border: '1.5px solid',
            borderColor: value === n ? 'var(--mochi-mint-mid)' : 'var(--mochi-border)',
            background: value === n ? 'var(--mochi-mint)' : 'transparent',
            color: value === n ? 'var(--mochi-mint-dark)' : 'var(--mochi-text-muted)',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function PriorityBadge({ task }) {
  const score = computePriority(task)
  const meta = priorityMeta(score)
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full self-start"
        style={{ background: meta.bg, color: meta.text }}
        title={`Score: ${score} / 100`}
      >
        {meta.label}
      </span>
      <span style={{ fontSize: '9px', color: 'var(--mochi-text-muted)', paddingLeft: '2px' }}>
        {score}/100
      </span>
    </div>
  )
}

function TaskRow({ task, categories = [], onToggleDone, onDelete, onUpdate }) {
  const [title, setTitle]               = useState(task.title || '')
  const [category, setCategory]         = useState(task.category || '')
  const [deadline, setDeadline]         = useState(task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '')
  const [additionalNotes, setNotes]     = useState(task.additionalNotes || '')
  const [effort, setEffort]             = useState(task.effort ?? 3)
  const [categoryMode, setCategoryMode] = useState('select')
  const deadlineRef = useRef(null)

  useEffect(() => {
    setTitle(task.title || '')
    setCategory(task.category || '')
    setDeadline(task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '')
    setNotes(task.additionalNotes || '')
    setEffort(task.effort ?? 3)
    const inList = task.category && categories.includes(task.category)
    setCategoryMode(inList || !task.category ? 'select' : 'custom')
  }, [task, categories])

  const save = (key, value) => onUpdate(task.id, { [key]: value })

  const handleEffortChange = (n) => {
    setEffort(n)
    save('effort', n)
  }

  return (
    <tr style={{ borderTop: '1px solid var(--mochi-border)', opacity: task.isDone ? 0.22 : 1 }}>
      {/* Task */}
      <td style={{ padding: '10px 12px', width: '26%' }}>
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
            onBlur={() => { if (title.trim()) save('title', title.trim()) }}
            style={{ ...fieldStyle, textDecoration: task.isDone ? 'line-through' : 'none' }}
          />
        </div>
      </td>

      {/* Category */}
      <td style={{ padding: '10px 12px', width: '16%' }}>
        <div className="flex flex-col gap-2">
          <select
            value={categoryMode === 'custom' ? '__custom__' : (category || '')}
            onChange={(e) => {
              const v = e.target.value
              if (v === '__custom__') { setCategoryMode('custom'); return }
              setCategoryMode('select')
              setCategory(v)
              save('category', v)
            }}
            style={fieldStyle}
          >
            <option value="">No category</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__custom__">Add new…</option>
          </select>
          {categoryMode === 'custom' && (
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onBlur={() => save('category', category.trim())}
              placeholder="New category"
              style={fieldStyle}
            />
          )}
        </div>
      </td>

      {/* Due date */}
      <td style={{ padding: '10px 12px', width: '14%' }}>
        <div className="flex items-center gap-2">
          <input
            ref={deadlineRef}
            type="date"
            value={deadline}
            onChange={(e) => {
              const next = e.target.value
              setDeadline(next)
              save('deadline', next ? new Date(next + 'T00:00:00').getTime() : null)
            }}
            style={{ ...fieldStyle, appearance: 'auto', WebkitAppearance: 'auto' }}
          />
          <button
            type="button"
            onClick={() => {
              if (deadlineRef.current?.showPicker) deadlineRef.current.showPicker()
              else deadlineRef.current?.focus()
            }}
            className="p-1.5 rounded-lg"
            style={{ border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text-muted)' }}
            title="Pick a date"
          >
            <Calendar size={13} />
          </button>
        </div>
      </td>

      {/* Effort */}
      <td style={{ padding: '10px 12px', width: '14%' }}>
        <EffortPicker value={effort} onChange={handleEffortChange} />
      </td>

      {/* Priority badge */}
      <td style={{ padding: '10px 12px', width: '12%' }}>
        <PriorityBadge task={{ ...task, effort }} />
      </td>

      {/* Notes + Delete */}
      <td style={{ padding: '10px 12px', width: '18%' }}>
        <div className="flex items-center gap-2">
          <input
            value={additionalNotes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => save('additionalNotes', additionalNotes.trim())}
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
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Task</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Category</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Due date</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Effort</th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>
              <span className="flex items-center gap-1">
                Priority <ArrowDownUp size={9} />
              </span>
            </th>
            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Notes</th>
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
