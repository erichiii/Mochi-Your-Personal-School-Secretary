import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import useStore from '../../store'

const PRESET_COLORS = [
  '#FFB3C6', '#C9B8F5', '#A8E6CF', '#FFCBA4', '#A8D4F5', '#FFE899',
]

export default function SubjectSection() {
  const {
    subjects, notes, loadSubjects, createSubject, deleteSubject,
    activeSubjectFilter, setSubjectFilter,
  } = useStore()

  const [collapsed, setCollapsed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [colorIdx, setColorIdx] = useState(0)
  const inputRef = useRef()

  useEffect(() => { loadSubjects() }, [])

  const countFor = (id) => notes.filter((n) => n.subjectId === id).length

  const handleAdd = async () => {
    if (!newName.trim()) return
    await createSubject({ name: newName.trim(), color: PRESET_COLORS[colorIdx] })
    setNewName('')
    setColorIdx((i) => (i + 1) % PRESET_COLORS.length)
    setAdding(false)
  }

  const handleDelete = async (id) => {
    if (activeSubjectFilter === id) setSubjectFilter(null)
    await deleteSubject(id)
  }

  return (
    <div className="mt-3 px-1">
      {/* Section header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-border)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span
          className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--mochi-text-muted)' }}
        >
          Subjects
        </span>
        <ChevronDown
          size={11}
          style={{
            color: 'var(--mochi-text-muted)',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-0.5 fade-in">
          {/* All Notes */}
          <button
            onClick={() => setSubjectFilter(null)}
            className="flex items-center gap-2 px-2 py-2 rounded-xl text-xs font-semibold w-full text-left transition-all"
            style={
              activeSubjectFilter === null
                ? {
                    background: 'var(--mochi-pink)',
                    border: '1.5px solid var(--mochi-pink-mid)',
                    color: 'var(--mochi-pink-dark)',
                  }
                : { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }
            }
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: 'var(--mochi-text-muted)' }}
            />
            <span className="flex-1">All Notes</span>
            <span style={{ color: 'var(--mochi-text-muted)' }}>{notes.length}</span>
          </button>

          {/* Subject rows */}
          {subjects.map((subject) => (
            <div key={subject.id} className="group relative flex items-center">
              <button
                onClick={() =>
                  setSubjectFilter(subject.id === activeSubjectFilter ? null : subject.id)
                }
                className="flex items-center gap-2 px-2 py-2 rounded-xl text-xs font-semibold w-full text-left transition-all pr-7"
                style={
                  activeSubjectFilter === subject.id
                    ? {
                        background: subject.color + '44',
                        border: `1.5px solid ${subject.color}`,
                        color: 'var(--mochi-text)',
                      }
                    : { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }
                }
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: subject.color }}
                />
                <span className="flex-1 truncate">{subject.name}</span>
                <span style={{ color: 'var(--mochi-text-muted)' }}>{countFor(subject.id)}</span>
              </button>

              {/* Delete on hover */}
              <button
                onClick={() => handleDelete(subject.id)}
                className="absolute right-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: 'var(--mochi-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--mochi-border)'
                  e.currentTarget.style.color = 'var(--mochi-text)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--mochi-text-muted)'
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}

          {/* Add subject */}
          {adding ? (
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-xl fade-in"
              style={{ border: '1.5px solid var(--mochi-border)', background: 'var(--mochi-cream)' }}
            >
              {/* Click dot to cycle color */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setColorIdx((i) => (i + 1) % PRESET_COLORS.length)}
                className="w-3 h-3 rounded-full flex-shrink-0 transition-transform hover:scale-125"
                style={{ background: PRESET_COLORS[colorIdx] }}
              />
              <input
                ref={inputRef}
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') {
                    setAdding(false)
                    setNewName('')
                  }
                }}
                placeholder="Subject name"
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: 'var(--mochi-text)' }}
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleAdd}
                style={{ color: 'var(--mochi-lavender-dark)' }}
              >
                <Plus size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-xs w-full text-left transition-all"
              style={{ color: 'var(--mochi-text-muted)', border: '1.5px dashed var(--mochi-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus size={12} />
              New subject
            </button>
          )}
        </div>
      )}
    </div>
  )
}
