import { useState } from 'react'
import { Plus } from 'lucide-react'

const fieldStyle = {
  background: 'var(--mochi-cream)',
  border: '1.5px solid var(--mochi-border)',
  color: 'var(--mochi-text)',
  borderRadius: '12px',
  padding: '8px 12px',
  fontSize: '12px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

export default function TaskForm({ onCreate }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [deadline, setDeadline] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const trimmed = title.trim()
    const payload = {
      title: trimmed,
      category: category.trim(),
      deadline: deadline ? new Date(deadline + 'T00:00:00').getTime() : null,
    }
    onCreate(payload)
    setTitle('')
    setCategory('')
    setDeadline('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mochi-text-muted)' }}>
          Task
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Read Chapter 5"
          style={fieldStyle}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mochi-text-muted)' }}>
            Category
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Math"
            style={fieldStyle}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mochi-text-muted)' }}>
            Deadline
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={fieldStyle}
          />
        </div>
      </div>

      <button
        type="submit"
        className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full text-xs font-semibold transition-all"
        style={{ background: 'var(--mochi-mint)', color: 'var(--mochi-mint-dark)', border: '1.5px solid var(--mochi-mint-mid)' }}
      >
        <Plus size={12} /> Add task
      </button>
    </form>
  )
}
