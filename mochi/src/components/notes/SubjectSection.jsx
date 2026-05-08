import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, X, Pencil, Check } from 'lucide-react'
import useStore from '../../store'

const PRESET_COLORS = [
  '#FFB3C6', '#C9B8F5', '#A8E6CF', '#FFCBA4', '#A8D4F5', '#FFE899',
  '#F4A9A8', '#B5EAD7', '#FFDAC1', '#E2F0CB', '#C7CEEA', '#F8C8D4',
]

// ── Small reusable inline name input ─────────────────────────
function NameInput({ value, onChange, onSave, onCancel, placeholder, style }) {
  return (
    <input
      autoFocus
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave()
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => { if (value.trim()) onSave(); else onCancel() }}
      onClick={(e) => e.stopPropagation()}
      className="bg-transparent outline-none min-w-0 flex-1 text-xs font-semibold"
      style={style}
    />
  )
}

// ── Color picker popover ──────────────────────────────────────
function ColorPicker({ onSelect, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-50 p-2 rounded-xl shadow-lg fade-in"
      style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}
    >
      <div className="grid grid-cols-6 gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onMouseDown={(e) => { e.preventDefault(); onSelect(c) }}
            className="w-5 h-5 rounded-full transition-transform hover:scale-110 hover:ring-2 ring-offset-1"
            style={{ background: c, ringColor: c }}
          />
        ))}
      </div>
    </div>
  )
}

export default function SubjectSection() {
  const {
    subjects, notes, loadSubjects,
    createSubject, updateSubject, deleteSubject,
    activeSubjectFilter, setSubjectFilter,
  } = useStore()

  const [headerOpen, setHeaderOpen] = useState(true)
  const [expanded, setExpanded] = useState(new Set())

  // editing: null | subjectId
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  // adding: null | 'section' | <parentSectionId>
  const [adding, setAdding] = useState(null)
  const [newName, setNewName] = useState('')
  const [colorIdx, setColorIdx] = useState(0)

  // color picker: null | subjectId
  const [colorPickerId, setColorPickerId] = useState(null)

  useEffect(() => { loadSubjects() }, [])

  const sections = subjects.filter((s) => !s.parentId)
  const subsOf = (id) => subjects.filter((s) => s.parentId === id)

  const countForSection = (id) => {
    const subIds = subsOf(id).map((s) => s.id)
    return notes.filter((n) => n.subjectId === id || subIds.includes(n.subjectId)).length
  }
  const countForSub = (id) => notes.filter((n) => n.subjectId === id).length

  const toggleExpand = (id) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const startEdit = (id, name) => { setEditingId(id); setEditingName(name) }

  const saveEdit = async () => {
    if (!editingName.trim()) { cancelEdit(); return }
    await updateSubject(editingId, { name: editingName.trim() })
    setEditingId(null); setEditingName('')
  }

  const cancelEdit = () => { setEditingId(null); setEditingName('') }

  const handleAdd = async () => {
    if (!newName.trim()) { setAdding(null); setNewName(''); return }
    if (adding === 'section') {
      await createSubject({ name: newName.trim(), color: PRESET_COLORS[colorIdx], parentId: null })
      setColorIdx((i) => (i + 1) % PRESET_COLORS.length)
    } else {
      const parent = subjects.find((s) => s.id === adding)
      await createSubject({ name: newName.trim(), color: parent?.color ?? PRESET_COLORS[0], parentId: adding })
    }
    setNewName(''); setAdding(null)
  }

  const handleDelete = async (s) => {
    if (activeSubjectFilter === s.id) setSubjectFilter(null)
    await deleteSubject(s.id)
  }

  const startAddSub = (sectionId) => {
    setExpanded((prev) => new Set([...prev, sectionId]))
    setAdding(sectionId); setNewName('')
  }

  // Shared styles
  const activeStyle = (color) => ({
    background: color + '44',
    border: `1.5px solid ${color}`,
    color: 'var(--mochi-text)',
  })
  const ghost = { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }

  // ── Render a section or subsection row ────────────────────
  const renderRow = ({ subject, isSection }) => {
    const isActive = activeSubjectFilter === subject.id
    const isEditing = editingId === subject.id
    const subs = isSection ? subsOf(subject.id) : []
    const isExpanded = isSection && expanded.has(subject.id)
    const count = isSection ? countForSection(subject.id) : countForSub(subject.id)

    return (
      <div key={subject.id}>
        <div className="group flex items-center gap-0.5">
          {/* Expand chevron — sections only */}
          {isSection && (
            <button
              onClick={() => toggleExpand(subject.id)}
              className="p-1 rounded flex-shrink-0 transition-colors"
              style={{ color: 'var(--mochi-text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
            >
              <ChevronRight
                size={11}
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
              />
            </button>
          )}
          {/* Subsection indent */}
          {!isSection && <div className="w-4 flex-shrink-0" />}

          {/* Color dot — clickable to open color picker */}
          <div className="relative flex-shrink-0">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setColorPickerId(colorPickerId === subject.id ? null : subject.id) }}
              className="transition-transform hover:scale-125"
              style={{
                width: isSection ? '10px' : '8px',
                height: isSection ? '10px' : '8px',
                borderRadius: '50%',
                background: subject.color,
                display: 'block',
              }}
            />
            {colorPickerId === subject.id && (
              <ColorPicker
                onSelect={async (color) => { await updateSubject(subject.id, { color }); setColorPickerId(null) }}
                onClose={() => setColorPickerId(null)}
              />
            )}
          </div>

          {/* Name + filter button */}
          <button
            onClick={() => !isEditing && setSubjectFilter(isActive ? null : subject.id)}
            className="flex-1 flex items-center gap-1.5 px-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all min-w-0"
            style={isActive ? activeStyle(subject.color) : ghost}
          >
            {isEditing ? (
              <NameInput
                value={editingName}
                onChange={setEditingName}
                onSave={saveEdit}
                onCancel={cancelEdit}
                style={{ color: 'var(--mochi-text)' }}
              />
            ) : (
              <span className="flex-1 truncate text-left">{subject.name}</span>
            )}
            {!isEditing && <span style={{ color: 'var(--mochi-text-muted)' }}>{count}</span>}
          </button>

          {/* Hover actions */}
          {!isEditing && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
              <HoverBtn onClick={() => startEdit(subject.id, subject.name)} title="Rename"><Pencil size={10} /></HoverBtn>
              {isSection && <HoverBtn onClick={() => startAddSub(subject.id)} title="Add subsection"><Plus size={10} /></HoverBtn>}
              <HoverBtn onClick={() => handleDelete(subject)} title="Delete" danger><X size={10} /></HoverBtn>
            </div>
          )}
          {isEditing && (
            <button onMouseDown={(e) => e.preventDefault()} onClick={saveEdit} className="p-1 rounded flex-shrink-0" style={{ color: 'var(--mochi-lavender-dark)' }}>
              <Check size={11} />
            </button>
          )}
        </div>

        {/* Subsections */}
        {isSection && isExpanded && (
          <div className="ml-5 flex flex-col gap-0.5 mt-0.5 fade-in">
            {subs.map((sub) => renderRow({ subject: sub, isSection: false }))}

            {/* Add subsection form */}
            {adding === subject.id && (
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl fade-in"
                style={{ border: '1.5px solid var(--mochi-border)', background: 'var(--mochi-cream)' }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: subject.color }} />
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') { setAdding(null); setNewName('') }
                  }}
                  onBlur={() => { if (!newName.trim()) { setAdding(null); setNewName('') } else handleAdd() }}
                  placeholder="Subsection name"
                  className="flex-1 bg-transparent outline-none text-xs"
                  style={{ color: 'var(--mochi-text)' }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-1">
      {/* "Sections" collapsible header */}
      <button
        onClick={() => setHeaderOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-border)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--mochi-text-muted)' }}>
          Sections
        </span>
        <ChevronDown size={11} style={{ color: 'var(--mochi-text-muted)', transform: headerOpen ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
      </button>

      {headerOpen && (
        <div className="flex flex-col gap-0.5 fade-in">
          {/* ── Section rows ─────────────────────────────── */}
          {sections.map((section) => renderRow({ subject: section, isSection: true }))}

          {/* ── Add section ──────────────────────────────── */}
          {adding === 'section' ? (
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-xl fade-in"
              style={{ border: '1.5px solid var(--mochi-border)', background: 'var(--mochi-cream)' }}
            >
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setColorIdx((i) => (i + 1) % PRESET_COLORS.length)}
                className="w-3 h-3 rounded-full flex-shrink-0 transition-transform hover:scale-125"
                style={{ background: PRESET_COLORS[colorIdx] }}
                title="Cycle color"
              />
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') { setAdding(null); setNewName('') }
                }}
                onBlur={() => { if (!newName.trim()) { setAdding(null); setNewName('') } else handleAdd() }}
                placeholder="Section name"
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: 'var(--mochi-text)' }}
              />
            </div>
          ) : (
            <button
              onClick={() => { setAdding('section'); setNewName('') }}
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-xs w-full text-left transition-all mt-0.5"
              style={{ color: 'var(--mochi-text-muted)', border: '1.5px dashed var(--mochi-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus size={12} /> New section
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tiny hover-action button ──────────────────────────────────
function HoverBtn({ onClick, title, danger, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1 rounded transition-colors"
      style={{ color: 'var(--mochi-text-muted)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = danger ? '#E05050' : 'var(--mochi-text)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
    >
      {children}
    </button>
  )
}
