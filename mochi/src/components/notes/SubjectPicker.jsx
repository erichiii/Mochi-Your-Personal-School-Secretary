import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X, Plus } from 'lucide-react'
import useStore from '../../store'

const PRESET_COLORS = [
  '#FFB3C6', '#C9B8F5', '#A8E6CF', '#FFCBA4', '#A8D4F5', '#FFE899',
  '#F4A9A8', '#B5EAD7', '#FFDAC1', '#E2F0CB', '#C7CEEA', '#F8C8D4',
]

export default function SubjectPicker({ noteId }) {
  const { subjects, notes, loadSubjects, updateNote, createSubject } = useStore()
  const note = notes.find((n) => n.id === noteId)
  const current = subjects.find((s) => s.id === note?.subjectId) ?? null

  const [open, setOpen] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [colorIdx, setColorIdx] = useState(0)
  const ref = useRef()
  const inputRef = useRef()

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

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) { setAddingSection(false); setNewSectionName(''); return }
    const color = PRESET_COLORS[colorIdx]
    const id = await createSubject({ name: newSectionName.trim(), color, parentId: null })
    setColorIdx((i) => (i + 1) % PRESET_COLORS.length)
    setNewSectionName('')
    setAddingSection(false)
    if (id) assign(id)
  }

  if (!noteId) return null

  const subjectsByParent = subjects.reduce((map, subject) => {
    const key = subject.parentId ?? 'root'
    if (!map[key]) map[key] = []
    map[key].push(subject)
    return map
  }, {})
  const topLevel = subjectsByParent.root || []

  const renderOption = (subject, depth = 0) => {
    const children = subjectsByParent[subject.id] || []
    const paddingLeft = 12 + depth * 12
    const isTopLevel = depth === 0
    return (
      <div key={subject.id}>
        <button
          onClick={() => assign(subject.id)}
          className={isTopLevel
            ? 'w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors'
            : 'w-full text-left pr-3 py-1.5 text-xs font-medium flex items-center gap-2 transition-colors'
          }
          style={{ color: isTopLevel ? 'var(--mochi-text)' : 'var(--mochi-text-soft)', paddingLeft: `${paddingLeft}px` }}
          onMouseEnter={(e) => (e.currentTarget.style.background = subject.color + (isTopLevel ? '33' : '22'))}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            className={isTopLevel ? 'w-2.5 h-2.5 rounded-full flex-shrink-0' : 'w-1.5 h-1.5 rounded-full flex-shrink-0'}
            style={{ background: subject.color }}
          />
          {subject.name}
        </button>
        {children.map((child) => renderOption(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
        style={
          current
            ? { background: current.color + '55', border: `1.5px solid ${current.color}`, color: 'var(--mochi-text)' }
            : { background: 'var(--mochi-border)', color: 'var(--mochi-text-muted)', border: '1.5px solid transparent' }
        }
      >
        {current && (
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: current.color }} />
        )}
        <span>{current ? current.name : 'No section'}</span>
        <ChevronDown size={11} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden shadow-lg fade-in"
          style={{
            background: 'var(--mochi-surface)',
            border: '1.5px solid var(--mochi-border)',
            minWidth: '180px',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {/* None */}
          <button
            onClick={() => assign(null)}
            className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors"
            style={{ color: 'var(--mochi-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={12} />
            No section
          </button>

          {topLevel.map((section) => renderOption(section, 0))}

          {/* Divider */}
          <div className="mx-3 my-1" style={{ height: '1px', background: 'var(--mochi-border)' }} />

          {/* New section form / button */}
          {addingSection ? (
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setColorIdx((i) => (i + 1) % PRESET_COLORS.length)}
                className="w-3 h-3 rounded-full flex-shrink-0 transition-transform hover:scale-125"
                style={{ background: PRESET_COLORS[colorIdx] }}
                title="Cycle color"
              />
              <input
                ref={inputRef}
                autoFocus
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateSection()
                  if (e.key === 'Escape') { setAddingSection(false); setNewSectionName('') }
                }}
                onBlur={() => { if (!newSectionName.trim()) { setAddingSection(false); setNewSectionName('') } else handleCreateSection() }}
                placeholder="Section name…"
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: 'var(--mochi-text)' }}
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingSection(true)}
              className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors"
              style={{ color: 'var(--mochi-text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus size={12} />
              New section
            </button>
          )}
        </div>
      )}
    </div>
  )
}
