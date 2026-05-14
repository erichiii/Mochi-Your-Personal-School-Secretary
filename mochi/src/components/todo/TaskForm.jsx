import { useRef, useState } from 'react'
import { Calendar, Plus } from 'lucide-react'

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

const EFFORT_LABELS = ['', 'Very easy', 'Easy', 'Medium', 'Hard', 'Very hard']

export default function TaskForm({ onCreate, categories = [] }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [deadline, setDeadline] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [categoryMode, setCategoryMode] = useState('select')
  const [effort, setEffort] = useState(3)
  const deadlineRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onCreate({
      title: title.trim(),
      category: category.trim(),
      deadline: deadline ? new Date(deadline + 'T00:00:00').getTime() : null,
      additionalNotes: additionalNotes.trim(),
      effort,
    })
    setTitle('')
    setCategory('')
    setDeadline('')
    setAdditionalNotes('')
    setEffort(3)
    setCategoryMode('select')
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
              placeholder="New category"
              style={fieldStyle}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mochi-text-muted)' }}>
            Deadline
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={deadlineRef}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{ ...fieldStyle, appearance: 'auto', WebkitAppearance: 'auto' }}
            />
            <button
              type="button"
              onClick={() => {
                if (deadlineRef.current?.showPicker) deadlineRef.current.showPicker()
                else deadlineRef.current?.focus()
              }}
              className="p-2 rounded-lg"
              style={{ border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text-muted)' }}
              title="Pick a date"
            >
              <Calendar size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mochi-text-muted)' }}>
          Effort{' '}
          <span style={{ textTransform: 'none', fontWeight: 400, fontSize: '10px' }}>
            — {EFFORT_LABELS[effort]}
          </span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setEffort(n)}
              className="flex-1 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                border: '1.5px solid',
                borderColor: effort === n ? 'var(--mochi-mint-mid)' : 'var(--mochi-border)',
                background: effort === n ? 'var(--mochi-mint)' : 'transparent',
                color: effort === n ? 'var(--mochi-mint-dark)' : 'var(--mochi-text-muted)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between" style={{ fontSize: '9px', color: 'var(--mochi-text-muted)', padding: '0 2px' }}>
          <span>Easy</span>
          <span>Hard</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mochi-text-muted)' }}>
          Additional notes
        </label>
        <input
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Optional context or links"
          style={fieldStyle}
        />
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
