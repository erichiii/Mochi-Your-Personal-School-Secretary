import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import useStore from '../../store'

export default function SubjectPicker({ noteId }) {
  const { subjects, notes, loadSubjects, updateNote } = useStore()
  const note = notes.find((n) => n.id === noteId)
  const current = subjects.find((s) => s.id === note?.subjectId) ?? null

  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => { loadSubjects() }, [])

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const assign = (subjectId) => {
    updateNote(noteId, { subjectId })
    setOpen(false)
  }

  if (!noteId) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
        style={
          current
            ? {
                background: current.color + '55',
                border: `1.5px solid ${current.color}`,
                color: 'var(--mochi-text)',
              }
            : {
                background: 'var(--mochi-border)',
                color: 'var(--mochi-text-muted)',
                border: '1.5px solid transparent',
              }
        }
      >
        {current && (
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: current.color }} />
        )}
        <span>{current ? current.name : 'No subject'}</span>
        <ChevronDown size={11} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden shadow-lg fade-in"
          style={{
            background: 'var(--mochi-surface)',
            border: '1.5px solid var(--mochi-border)',
            minWidth: '160px',
          }}
        >
          <button
            onClick={() => assign(null)}
            className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors"
            style={{ color: 'var(--mochi-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={12} />
            No subject
          </button>

          {subjects.length === 0 ? (
            <p className="px-3 py-2 text-xs" style={{ color: 'var(--mochi-text-muted)' }}>
              No subjects yet — create one in the sidebar.
            </p>
          ) : (
            subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => assign(s.id)}
                className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors"
                style={{ color: 'var(--mochi-text)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = s.color + '44')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: s.color }}
                />
                {s.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
